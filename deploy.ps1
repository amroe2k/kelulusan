<#
.SYNOPSIS
    Build ulang Frontend & Dashboard lalu compress masing-masing ke file ZIP terpisah.

.DESCRIPTION
    Script ini menghasilkan 2 file ZIP:
      1. deploy-frontend-<timestamp>.zip  → Portal siswa (upload ke public_html/)
      2. deploy-dashboard-<timestamp>.zip → Admin panel + PHP API (upload ke subdomain/VPS)

    Isi deploy-frontend-*.zip:
      index.html, _astro/, favicon.svg, data.json,
      admin-upload.php, .htaccess, README-DEPLOY.md

    Isi deploy-dashboard-*.zip:
      dashboard/ (HTML/CSS/JS), api/ (PHP), js/ (dash-*.js),
      schema.sql, .env.example, .htaccess, nginx-vhost.conf,
      setup-vps.sh, SETUP.md

.PARAMETER Target
    Pilih target: 'all' (default), 'frontend', 'dashboard'

.PARAMETER SkipBuild
    Lewati proses build, gunakan dist/ yang sudah ada

.PARAMETER SkipDb
    Lewati export schema SQL (hanya berlaku untuk dashboard)

.PARAMETER OutputDir
    Folder output ZIP (default: .\deploy)

.EXAMPLE
    .\deploy.ps1                          # Build + bundle keduanya
    .\deploy.ps1 -Target frontend         # Hanya frontend
    .\deploy.ps1 -Target dashboard        # Hanya dashboard
    .\deploy.ps1 -SkipBuild               # Bundle tanpa rebuild
    .\deploy.ps1 -SkipBuild -SkipDb       # Bundle tanpa rebuild & tanpa schema
#>

param (
    [ValidateSet('all','frontend','dashboard')]
    [string]$Target = 'all',
    [switch]$SkipBuild,
    [switch]$SkipDb,
    [string]$OutputDir = ".\deploy"
)

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
function Write-Step { param($m) Write-Host "`n  >> $m" -ForegroundColor Cyan }
function Write-OK   { param($m) Write-Host "     OK  $m" -ForegroundColor Green }
function Write-Warn { param($m) Write-Host "     !!  $m" -ForegroundColor Yellow }
function Write-Fail { param($m) Write-Host "     ERR $m" -ForegroundColor Red }
function Write-Div  { Write-Host ("-" * 64) -ForegroundColor DarkGray }

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "  +----------------------------------------------------+" -ForegroundColor Magenta
Write-Host "  |   KELULUSAN -- Deploy Bundler (ZIP Terpisah)       |" -ForegroundColor Magenta
Write-Host "  |   Frontend ZIP  +  Dashboard ZIP                   |" -ForegroundColor Magenta
Write-Host "  +----------------------------------------------------+" -ForegroundColor Magenta
Write-Host ""

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# ---------------------------------------------------------------------------
# Baca .env
# ---------------------------------------------------------------------------
Write-Step "Membaca konfigurasi dari .env"
$envFile = Join-Path $ScriptDir ".env"
$envData = @{}
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#') -and $line -match '=') {
            $parts = $line -split '=', 2
            $envData[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
        }
    }
    Write-OK ".env ditemukan"
} else {
    Write-Warn ".env tidak ditemukan -- menggunakan nilai default"
}

$DB_HOST = if ($envData['DB_HOST']) { $envData['DB_HOST'] } else { "localhost" }
$DB_PORT = if ($envData['DB_PORT']) { $envData['DB_PORT'] } else { "3306" }
$DB_NAME = if ($envData['DB_NAME']) { $envData['DB_NAME'] } else { "db_kelulusan" }
$DB_USER = if ($envData['DB_USER']) { $envData['DB_USER'] } else { "root" }
$DB_PASS = if ($envData['DB_PASS']) { $envData['DB_PASS'] } else { "" }
Write-OK "DB: $DB_USER@$DB_HOST/$DB_NAME"

# ---------------------------------------------------------------------------
# Timestamp & paths
# ---------------------------------------------------------------------------
$timestamp  = Get-Date -Format "yyyyMMdd-HHmmss"
$tsReadable = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$outDirFull = Join-Path $ScriptDir $OutputDir

$buildFrontend  = ($Target -eq 'all' -or $Target -eq 'frontend')
$buildDashboard = ($Target -eq 'all' -or $Target -eq 'dashboard')

$distFrontend  = Join-Path $ScriptDir "dist\frontend"
$distDashboard = Join-Path $ScriptDir "dist\dashboard"

if (-not (Test-Path $outDirFull)) {
    New-Item -ItemType Directory -Force -Path $outDirFull | Out-Null
}

# ---------------------------------------------------------------------------
# LANGKAH 1 — Build
# ---------------------------------------------------------------------------
Write-Div
if ($SkipBuild) {
    Write-Warn "Build dilewati (-SkipBuild). Menggunakan dist/ yang sudah ada."
} else {
    if ($buildFrontend) {
        Write-Step "Build Frontend: npm run build:frontend"
        $out = & npm run build:frontend 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Build frontend GAGAL!"
            Write-Host ($out | Out-String) -ForegroundColor DarkRed
            exit 1
        }
        Write-OK "Frontend selesai -> dist/frontend/"
    }
    if ($buildDashboard) {
        Write-Step "Build Dashboard: npm run build:dashboard"
        $out = & npm run build:dashboard 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Build dashboard GAGAL!"
            Write-Host ($out | Out-String) -ForegroundColor DarkRed
            exit 1
        }
        Write-OK "Dashboard selesai -> dist/dashboard/"
    }
}

# Verifikasi
if ($buildFrontend -and -not (Test-Path $distFrontend)) {
    Write-Fail "dist\frontend tidak ditemukan. Jalankan tanpa -SkipBuild."
    exit 1
}
if ($buildDashboard -and -not (Test-Path $distDashboard)) {
    Write-Fail "dist\dashboard tidak ditemukan. Jalankan tanpa -SkipBuild."
    exit 1
}

# ---------------------------------------------------------------------------
# LANGKAH 2 — Export Schema SQL (untuk dashboard)
# ---------------------------------------------------------------------------
Write-Div
$schemaFile = $null

if ($buildDashboard -and -not $SkipDb) {
    Write-Step "Export schema database (struktur saja, tanpa data)"

    $mysqldump = Get-Command mysqldump -ErrorAction SilentlyContinue
    if (-not $mysqldump) {
        $candidates = @(
            "C:\xampp\mysql\bin\mysqldump.exe",
            "C:\laragon\bin\mysql\mysql-8.0\bin\mysqldump.exe",
            "C:\laragon\bin\mysql\mysql-8.4\bin\mysqldump.exe",
            "C:\wamp64\bin\mysql\mysql8.0\bin\mysqldump.exe",
            "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
        )
        foreach ($c in $candidates) { if (Test-Path $c) { $mysqldump = $c; break } }
    } else {
        $mysqldump = $mysqldump.Source
    }

    if ($mysqldump) {
        Write-OK "mysqldump: $mysqldump"
        $dumpArgs = @(
            "--host=$DB_HOST", "--port=$DB_PORT", "--user=$DB_USER",
            "--no-data", "--single-transaction", "--routines",
            "--skip-lock-tables", "--add-drop-table", $DB_NAME
        )
        if ($DB_PASS -ne "") { $dumpArgs = @("--password=$DB_PASS") + $dumpArgs }

        $schemaOut     = Join-Path $env:TEMP "schema-$timestamp.sql"
        $schemaContent = & $mysqldump @dumpArgs 2>&1
        if ($LASTEXITCODE -eq 0) {
            $header  = "-- Kelulusan Portal -- Database Schema`r`n"
            $header += "-- Generated : $tsReadable`r`n"
            $header += "-- Database  : $DB_NAME`r`n"
            $header += "-- Import    : mysql -u USER -p $DB_NAME < schema.sql`r`n`r`n"
            "$header`n$schemaContent" | Set-Content -Path $schemaOut -Encoding UTF8
            $szKb = [math]::Round((Get-Item $schemaOut).Length / 1KB, 1)
            Write-OK "schema.sql diekspor ($szKb KB)"
            $schemaFile = $schemaOut
        } else {
            Write-Warn "mysqldump gagal. Schema tidak disertakan."
        }
    } else {
        Write-Warn "mysqldump tidak ditemukan. Schema tidak disertakan."
    }
} elseif ($SkipDb) {
    Write-Warn "Export DB dilewati (-SkipDb)."
}

# ===========================================================================
# ██████████  ZIP 1 — FRONTEND  █████████████████████████████████████████████
# ===========================================================================
$zipFrontendPath = $null
$zipFrontendName = "deploy-frontend-$timestamp.zip"

if ($buildFrontend) {
    Write-Div
    Write-Step "[ ZIP 1/2 ] Menyiapkan bundle FRONTEND"

    $tempFe = Join-Path $env:TEMP "kls-frontend-$timestamp"
    New-Item -ItemType Directory -Force -Path $tempFe | Out-Null

    # -- Salin isi dist/frontend/ langsung ke root temp (bukan subfolder)
    Write-OK "Menyalin dist/frontend/ ..."
    Copy-Item -Path "$distFrontend\*" -Destination $tempFe -Recurse -Force

    # -- admin-upload.php dari public/
    $adminUpload = Join-Path $ScriptDir "public\admin-upload.php"
    if (Test-Path $adminUpload) {
        Copy-Item $adminUpload "$tempFe\admin-upload.php" -Force
        Write-OK "admin-upload.php disertakan"
    }

    # -- data.json dari public/
    $dataJson = Join-Path $ScriptDir "public\data.json"
    if (Test-Path $dataJson) {
        Copy-Item $dataJson "$tempFe\data.json" -Force
        Write-OK "data.json disertakan"
    }

    # -- .htaccess
    $htFrontend = @'
Options -MultiViews -Indexes
RewriteEngine On

# Blokir file sensitif
RewriteRule ^\.env$    - [F,L]
RewriteRule .*\.sql$   - [F,L]

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
</IfModule>

# SPA Fallback
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L,QSA]

# Cache Control
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/html              "access plus 0 seconds"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType text/css               "access plus 1 year"
    ExpiresByType image/svg+xml          "access plus 1 year"
    ExpiresByType image/webp             "access plus 1 year"
    ExpiresByType font/woff2             "access plus 1 year"
</IfModule>

<FilesMatch "\.(js|css|webp|png|svg|woff2|ico)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
<FilesMatch "data\.json$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
</FilesMatch>
'@
    $htFrontend | Set-Content -Path "$tempFe\.htaccess" -Encoding UTF8 -NoNewline
    Write-OK ".htaccess dibuat"

    # -- README-DEPLOY.md
    $readmeFe = @"
# Deploy Portal Siswa — Kelulusan

Bundle dibuat: $tsReadable

## Cara Deploy ke Shared Hosting (cPanel)

1. Extract semua isi ZIP ini ke `public_html/`
2. Pastikan `index.html` dan `.htaccess` ada LANGSUNG di `public_html/`
3. Akses portal: https://domain.com

## Update Data Siswa

Upload `data.json` terbaru via:
    https://domain.com/admin-upload.php

## File dalam bundle ini

| File/Folder       | Keterangan                            |
|-------------------|---------------------------------------|
| index.html        | Halaman utama portal                  |
| _astro/           | Aset JS/CSS/Font                      |
| favicon.svg       | Icon situs                            |
| data.json         | Data siswa (update berkala)           |
| admin-upload.php  | Panel update data.json                |
| .htaccess         | Routing Apache/cPanel (SPA fallback)  |
| README-DEPLOY.md  | Panduan ini                           |

> CATATAN: data.json berisi data per tanggal bundle dibuat.
> Update data via admin-upload.php tanpa perlu re-deploy.
"@
    $readmeFe | Set-Content -Path "$tempFe\README-DEPLOY.md" -Encoding UTF8
    Write-OK "README-DEPLOY.md dibuat"

    # -- Compress
    $zipFrontendPath = Join-Path $outDirFull $zipFrontendName
    Write-Step "Membuat ZIP: $zipFrontendName"
    Compress-Archive -Path "$tempFe\*" -DestinationPath $zipFrontendPath -Force
    $szFe = [math]::Round((Get-Item $zipFrontendPath).Length / 1MB, 2)
    Write-OK "ZIP frontend selesai: $zipFrontendName ($szFe MB)"

    # -- Cleanup temp
    Remove-Item -Path $tempFe -Recurse -Force
}

# ===========================================================================
# ██████████  ZIP 2 — DASHBOARD  ████████████████████████████████████████████
# ===========================================================================
$zipDashboardPath = $null
$zipDashboardName = "deploy-dashboard-$timestamp.zip"

if ($buildDashboard) {
    Write-Div
    Write-Step "[ ZIP 2/2 ] Menyiapkan bundle DASHBOARD"

    $tempDb = Join-Path $env:TEMP "kls-dashboard-$timestamp"
    New-Item -ItemType Directory -Force -Path "$tempDb\dashboard" | Out-Null
    New-Item -ItemType Directory -Force -Path "$tempDb\api"       | Out-Null
    New-Item -ItemType Directory -Force -Path "$tempDb\js"        | Out-Null

    # -- dist/dashboard/ → temp/dashboard/
    $excludeItems = @("data.json","users.json","bundles","exports","pdf","previews","sync-data.php")
    Write-OK "Menyalin dist/dashboard/ ..."
    Copy-Item -Path "$distDashboard\*" -Destination "$tempDb\dashboard" -Recurse -Force
    foreach ($exc in $excludeItems) {
        $ep = "$tempDb\dashboard\$exc"
        if (Test-Path $ep) {
            Remove-Item $ep -Recurse -Force
            Write-Warn "Dikecualikan: $exc"
        }
    }

    # -- public/api/ → temp/api/
    $apiSrc = Join-Path $ScriptDir "public\api"
    if (Test-Path $apiSrc) {
        Copy-Item -Path "$apiSrc\*" -Destination "$tempDb\api" -Recurse -Force
        Write-OK "public/api/ disalin"
    } else { Write-Warn "public/api/ tidak ditemukan" }

    # -- public/js/*.js → temp/js/
    $jsSrc = Join-Path $ScriptDir "public\js"
    if (Test-Path $jsSrc) {
        $jsFiles = Get-ChildItem "$jsSrc\*.js" -ErrorAction SilentlyContinue
        foreach ($f in $jsFiles) { Copy-Item $f.FullName "$tempDb\js\" -Force }
        Write-OK "$($jsFiles.Count) file JS disalin ke js/"
    }

    # -- schema.sql
    if ($schemaFile -and (Test-Path $schemaFile)) {
        Copy-Item $schemaFile "$tempDb\schema.sql" -Force
        Write-OK "schema.sql disertakan"
    }

    # -- .env.example
    $envEx = Join-Path $ScriptDir ".env.example"
    if (Test-Path $envEx) {
        Copy-Item $envEx "$tempDb\.env.example" -Force
        Write-OK ".env.example disertakan"
    }

    # -- .htaccess (Apache/cPanel)
    $htDashboard = @'
Options -MultiViews -Indexes
RewriteEngine On

# Blokir file sensitif
RewriteRule ^\.env$       - [F,L]
RewriteRule ^\.env\..*    - [F,L]
RewriteRule .*\.sql$      - [F,L]

# Security Headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>

# SPA Fallback (kecuali /api/ dan /js/)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_URI} !^/js/
RewriteRule ^(.*)$ /index.html [L,QSA]

# Cache Control
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/html              "access plus 0 seconds"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType text/css               "access plus 1 year"
    ExpiresByType image/svg+xml          "access plus 1 year"
    ExpiresByType image/webp             "access plus 1 year"
    ExpiresByType font/woff2             "access plus 1 year"
</IfModule>

<FilesMatch "\.(js|css|webp|png|svg|woff2|ico)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
'@
    $htDashboard | Set-Content -Path "$tempDb\.htaccess" -Encoding UTF8 -NoNewline
    Write-OK ".htaccess (Apache/cPanel) dibuat"

    # -- nginx-vhost.conf
    $nginxConf = @"
# ============================================================
#  Kelulusan Dashboard - Nginx Virtual Host Config
#  Generated : $tsReadable
# ============================================================
server {
    listen 80;
    listen [::]:80;
    server_name admin.namadomain.com;   # GANTI domain Anda

    root /var/www/kelulusan/dist/dashboard;
    index index.html;
    charset utf-8;

    access_log /var/log/nginx/kelulusan-admin-access.log;
    error_log  /var/log/nginx/kelulusan-admin-error.log;

    location ~ /\.env      { deny all; return 404; }
    location ~ /\.git      { deny all; return 404; }
    location ~ /\.htaccess { deny all; return 404; }

    location ^~ /api/ {
        alias /var/www/kelulusan/public/api/;
        try_files `$uri `$uri/ =404;
        location ~ \.php`$ {
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_param SCRIPT_FILENAME `$request_filename;
            include fastcgi_params;
            fastcgi_read_timeout 120;
        }
    }

    location ^~ /js/ {
        alias /var/www/kelulusan/public/js/;
        expires 1d;
        add_header Cache-Control "public";
    }

    location ~* \.(js|css|webp|png|jpg|svg|woff2|ico)`$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files `$uri =404;
    }

    location / {
        try_files `$uri `$uri/ /index.html;
    }

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript;
}
"@
    $nginxConf | Set-Content -Path "$tempDb\nginx-vhost.conf" -Encoding UTF8 -NoNewline
    Write-OK "nginx-vhost.conf dibuat"

    # -- SETUP.md
    $setupMd = @"
# Setup Dashboard Admin — Kelulusan

Bundle dibuat: $tsReadable

---

## Isi Bundle

| File/Folder       | Keterangan                                           |
|-------------------|------------------------------------------------------|
| dashboard/        | HTML/CSS/JS dashboard hasil build                    |
| api/              | PHP API backend                                      |
| js/               | JavaScript dashboard (dash-*.js)                     |
| schema.sql        | Struktur tabel MySQL (import 1x, lalu hapus)         |
| .env.example      | Template konfigurasi environment                     |
| .htaccess         | Konfigurasi Apache/cPanel                            |
| nginx-vhost.conf  | Virtual host Nginx untuk VPS                         |
| SETUP.md          | Panduan ini                                          |

---

## Opsi A — cPanel / Shared Hosting (Apache)

1. Upload ISI folder `dashboard/` ke folder subdomain admin
2. Upload ISI folder `api/` ke subfolder `api/` di subdomain
3. Upload ISI folder `js/` ke subfolder `js/` di subdomain
4. Upload `.htaccess` ke root folder subdomain
5. Buat database di cPanel -> MySQL Databases
6. Import `schema.sql` via phpMyAdmin
7. Salin `.env.example` -> `.env`, isi kredensial DB:
       DB_HOST=localhost
       DB_PORT=3306
       DB_NAME=db_kelulusan
       DB_USER=username_db
       DB_PASS=password_db
       APP_ENV=production
       APP_URL=https://admin.domain.com
8. Akses: https://admin.domain.com/dashboard/overview

---

## Opsi B — VPS Nginx

1. Upload semua ke server
2. Salin dashboard/ -> /var/www/kelulusan/dist/dashboard/
3. Salin api/       -> /var/www/kelulusan/public/api/
4. Salin js/        -> /var/www/kelulusan/public/js/
5. Salin nginx-vhost.conf -> /etc/nginx/sites-available/kelulusan-admin
6. Edit server_name di nginx-vhost.conf
7. Aktifkan: sudo ln -s .../sites-available/kelulusan-admin .../sites-enabled/
8. Test: sudo nginx -t && sudo systemctl reload nginx
9. Buat .env di /var/www/kelulusan/.env
10. Import schema.sql ke MySQL

---

## Buat Akun Admin Pertama

    php -r "echo hash('sha256', 'password_anda');"

Jalankan SQL di MySQL:

    INSERT INTO users (id, username, password_hash, nama, role, aktif)
    VALUES (UUID(), 'admin', '<HASH_DI_ATAS>', 'Administrator', 'admin', 1);

---

> KEAMANAN: Hapus schema.sql dari server setelah import selesai!
"@
    $setupMd | Set-Content -Path "$tempDb\SETUP.md" -Encoding UTF8
    Write-OK "SETUP.md dibuat"

    # -- Compress
    $zipDashboardPath = Join-Path $outDirFull $zipDashboardName
    Write-Step "Membuat ZIP: $zipDashboardName"
    Compress-Archive -Path "$tempDb\*" -DestinationPath $zipDashboardPath -Force
    $szDb = [math]::Round((Get-Item $zipDashboardPath).Length / 1MB, 2)
    Write-OK "ZIP dashboard selesai: $zipDashboardName ($szDb MB)"

    # -- Cleanup
    Remove-Item -Path $tempDb -Recurse -Force
}

# -- Cleanup schema temp
if ($schemaFile -and (Test-Path $schemaFile)) { Remove-Item $schemaFile -Force }

# ---------------------------------------------------------------------------
# Ringkasan
# ---------------------------------------------------------------------------
Write-Div
Write-Host ""
Write-Host "  DEPLOY BUNDLE SELESAI!" -ForegroundColor Green
Write-Host ""
Write-Host "  Folder output: $((Resolve-Path $outDirFull).Path)" -ForegroundColor DarkGray
Write-Host ""

if ($zipFrontendPath -and (Test-Path $zipFrontendPath)) {
    $szFe = [math]::Round((Get-Item $zipFrontendPath).Length / 1MB, 2)
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Blue
    Write-Host "  |  [ ZIP 1 ] FRONTEND — Portal Siswa                      |" -ForegroundColor Blue
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Blue
    Write-Host "  File   : $zipFrontendName" -ForegroundColor White
    Write-Host "  Size   : $szFe MB" -ForegroundColor White
    Write-Host "  Upload : Extract ke public_html/ hosting" -ForegroundColor DarkGray
    Write-Host "  Isi    : index.html, _astro/, data.json, admin-upload.php, .htaccess" -ForegroundColor DarkGray
    Write-Host ""
}

if ($zipDashboardPath -and (Test-Path $zipDashboardPath)) {
    $szDb = [math]::Round((Get-Item $zipDashboardPath).Length / 1MB, 2)
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "  |  [ ZIP 2 ] DASHBOARD — Admin Panel                      |" -ForegroundColor Cyan
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "  File   : $zipDashboardName" -ForegroundColor White
    Write-Host "  Size   : $szDb MB" -ForegroundColor White
    Write-Host "  Upload : Extract ke subfolder admin / subdomain VPS" -ForegroundColor DarkGray
    Write-Host "  Isi    : dashboard/, api/, js/, schema.sql, .htaccess, SETUP.md" -ForegroundColor DarkGray
    Write-Host ""
}

Write-Host "  Langkah selanjutnya:" -ForegroundColor Yellow
Write-Host "    1. Upload deploy-frontend-*.zip  -> Extract ke public_html/" -ForegroundColor White
Write-Host "    2. Upload deploy-dashboard-*.zip -> Extract ke subfolder admin" -ForegroundColor White
Write-Host "    3. Ikuti panduan di SETUP.md (dashboard) dan README-DEPLOY.md (frontend)" -ForegroundColor White
Write-Host ""
Write-Div

# Tawaran buka Explorer
Write-Host ""
$openExplorer = Read-Host "  Buka folder deploy di Explorer? (y/n)"
if ($openExplorer -eq 'y' -or $openExplorer -eq 'Y') {
    Start-Process explorer.exe -ArgumentList (Resolve-Path $outDirFull).Path
}
Write-Host ""
