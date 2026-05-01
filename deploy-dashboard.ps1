<#
.SYNOPSIS
    Bundle Admin Dashboard + Database Schema ke 1 file ZIP siap deploy.

.DESCRIPTION
    Script ini akan:
      1. (Opsional) Build ulang dashboard: npm run build:dashboard
      2. Export schema database via mysqldump (--no-data)
      3. Kemas semua file ke dalam 1 ZIP
      4. Menyertakan .htaccess, nginx-vhost.conf, setup-vps.sh, SETUP.md

.EXAMPLE
    .\deploy-dashboard.ps1              # Build + bundle
    .\deploy-dashboard.ps1 -SkipBuild   # Bundle tanpa rebuild
    .\deploy-dashboard.ps1 -SkipDb      # Bundle tanpa export schema SQL

.NOTES
    Kebutuhan:
      - Node.js (untuk npm run build:dashboard)
      - mysqldump (MySQL/XAMPP/Laragon)
      - PowerShell 5.1+ / PowerShell 7+
#>

param (
    [switch]$SkipBuild,
    [switch]$SkipDb,
    [string]$OutputDir = ".\deploy"
)

# --- Helper functions ---------------------------------------------------------
function Write-Step   { param($m) Write-Host "`n  >> $m" -ForegroundColor Cyan }
function Write-OK     { param($m) Write-Host "     OK  $m" -ForegroundColor Green }
function Write-Warn   { param($m) Write-Host "     !!  $m" -ForegroundColor Yellow }
function Write-Fail   { param($m) Write-Host "     ERR $m" -ForegroundColor Red }
function Write-Div    { Write-Host ("-" * 60) -ForegroundColor DarkGray }

# --- Banner -------------------------------------------------------------------
Write-Host ""
Write-Host "  +----------------------------------------------+" -ForegroundColor Magenta
Write-Host "  |  KELULUSAN -- Dashboard Deploy Bundler       |" -ForegroundColor Magenta
Write-Host "  +----------------------------------------------+" -ForegroundColor Magenta
Write-Host ""

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# --- Baca .env ----------------------------------------------------------------
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
    Write-OK ".env ditemukan dan dibaca"
} else {
    Write-Warn ".env tidak ditemukan -- menggunakan nilai default"
}

$DB_HOST = if ($envData['DB_HOST']) { $envData['DB_HOST'] } else { "localhost" }
$DB_PORT = if ($envData['DB_PORT']) { $envData['DB_PORT'] } else { "3306" }
$DB_NAME = if ($envData['DB_NAME']) { $envData['DB_NAME'] } else { "db_kelulusan" }
$DB_USER = if ($envData['DB_USER']) { $envData['DB_USER'] } else { "root" }
$DB_PASS = if ($envData['DB_PASS']) { $envData['DB_PASS'] } else { "" }

Write-OK "DB: $DB_USER@$DB_HOST/$DB_NAME"

# --- Timestamp & path ---------------------------------------------------------
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$tsReadable = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$zipName    = "deploy-dashboard-$timestamp.zip"
$tempDir    = Join-Path $env:TEMP "kls-deploy-$timestamp"
$outDirFull = Join-Path $ScriptDir $OutputDir
$zipPath    = Join-Path $outDirFull $zipName

# --- LANGKAH 1: Build ---------------------------------------------------------
Write-Div
if ($SkipBuild) {
    Write-Warn "Build dilewati (-SkipBuild). Menggunakan dist/dashboard/ yang ada."
} else {
    Write-Step "Build dashboard: npm run build:dashboard"
    $buildOut = & npm run build:dashboard 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Build gagal!"
        Write-Host $buildOut -ForegroundColor DarkRed
        exit 1
    }
    Write-OK "Build selesai -> dist/dashboard/"
}

$distDir = Join-Path $ScriptDir "dist\dashboard"
if (-not (Test-Path $distDir)) {
    Write-Fail "dist\dashboard tidak ditemukan. Jalankan tanpa -SkipBuild."
    exit 1
}

# --- LANGKAH 2: Export Schema SQL ---------------------------------------------
Write-Div
$schemaFile = Join-Path $env:TEMP "schema-$timestamp.sql"

if ($SkipDb) {
    Write-Warn "Export DB dilewati (-SkipDb)."
    $schemaFile = $null
} else {
    Write-Step "Export schema database (struktur saja, tanpa data)"

    $mysqldump = Get-Command mysqldump -ErrorAction SilentlyContinue
    if (-not $mysqldump) {
        $candidates = @(
            "C:\xampp\mysql\bin\mysqldump.exe",
            "C:\wamp64\bin\mysql\mysql8.0\bin\mysqldump.exe",
            "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe",
            "C:\laragon\bin\mysql\mysql-8.0\bin\mysqldump.exe"
        )
        foreach ($c in $candidates) {
            if (Test-Path $c) { $mysqldump = $c; break }
        }
    } else {
        $mysqldump = $mysqldump.Source
    }

    if ($mysqldump) {
        Write-OK "mysqldump: $mysqldump"
        $dumpArgs = @("--host=$DB_HOST","--port=$DB_PORT","--user=$DB_USER",
                      "--no-data","--single-transaction","--routines",
                      "--skip-lock-tables","--add-drop-table",$DB_NAME)
        if ($DB_PASS -ne "") { $dumpArgs = @("--password=$DB_PASS") + $dumpArgs }

        $schemaContent = & $mysqldump @dumpArgs 2>&1
        if ($LASTEXITCODE -eq 0) {
            $header  = "-- Kelulusan Portal -- Database Schema`r`n"
            $header += "-- Generated : $tsReadable`r`n"
            $header += "-- Database  : $DB_NAME`r`n"
            $header += "-- Import    : mysql -u USER -p $DB_NAME < schema.sql`r`n`r`n"
            "$header`n$schemaContent" | Set-Content -Path $schemaFile -Encoding UTF8
            $szKb = [math]::Round((Get-Item $schemaFile).Length / 1KB, 1)
            Write-OK "schema.sql diekspor ($szKb KB)"
        } else {
            Write-Warn "mysqldump gagal. Schema tidak disertakan."
            $schemaFile = $null
        }
    } else {
        Write-Warn "mysqldump tidak ditemukan. Schema tidak disertakan."
        $schemaFile = $null
    }
}

# --- LANGKAH 3: Susun folder temp ---------------------------------------------
Write-Div
Write-Step "Menyusun struktur bundle"

New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
New-Item -ItemType Directory -Force -Path "$tempDir\dashboard" | Out-Null
New-Item -ItemType Directory -Force -Path "$tempDir\api" | Out-Null
New-Item -ItemType Directory -Force -Path "$tempDir\js" | Out-Null

# 3a. dist/dashboard
Write-OK "Menyalin dist/dashboard/ ..."
Copy-Item -Path "$distDir\*" -Destination "$tempDir\dashboard" -Recurse -Force

foreach ($exc in @("data.json","users.json","bundles")) {
    $ep = "$tempDir\dashboard\$exc"
    if (Test-Path $ep) { Remove-Item $ep -Recurse -Force; Write-Warn "Dikecualikan: $exc" }
}

# 3b. public/api
Write-OK "Menyalin public/api/ ..."
$apiSrc = Join-Path $ScriptDir "public\api"
if (Test-Path $apiSrc) {
    Copy-Item -Path "$apiSrc\*" -Destination "$tempDir\api" -Recurse -Force
} else { Write-Warn "public/api/ tidak ditemukan" }

# 3c. public/js dash-*.js
Write-OK "Menyalin public/js/dash-*.js ..."
$jsSrc = Join-Path $ScriptDir "public\js"
if (Test-Path $jsSrc) {
    Get-ChildItem "$jsSrc\dash-*.js" | ForEach-Object {
        Copy-Item $_.FullName "$tempDir\js\" -Force
    }
}

# 3d. .env.example
$envEx = Join-Path $ScriptDir ".env.example"
if (Test-Path $envEx) { Copy-Item $envEx "$tempDir\.env.example" -Force; Write-OK ".env.example disertakan" }

# 3e. schema.sql
if ($schemaFile -and (Test-Path $schemaFile)) {
    Copy-Item $schemaFile "$tempDir\schema.sql" -Force
    Write-OK "schema.sql disertakan"
}

# --- LANGKAH 4: setup-vps.sh --------------------------------------------------
Write-Div
Write-Step "Membuat setup-vps.sh"

# PENTING: @'...'@ (single-quote heredoc) agar PS tidak interpolasi
# variabel bash ($WEBROOT, dll.) dan subexpression bash $(openssl ...).
$setupSh = @'
#!/bin/bash
# ============================================================
#  Kelulusan Dashboard - VPS Deploy Script
#  Generated : %%TS%%
#
#  Asumsi: Nginx + PHP + MySQL sudah terinstall.
#  Jalankan: sudo bash setup-vps.sh
# ============================================================
set -e

# ---- Konfigurasi: SESUAIKAN sebelum dijalankan -----------
DOMAIN="admin.namadomain.com"   # GANTI domain Anda
WEBROOT="/var/www/kelulusan"
PHP_VER="8.2"
DB_NAME="db_kelulusan"
DB_USER="kelulusan_user"
DB_ROOT_USER="root"
# DB_ROOT_PASS=""               # Uncomment jika root MySQL pakai password
# ----------------------------------------------------------

DB_PASS=$(openssl rand -hex 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-f0-9' | head -c 16)

echo ""
echo "=================================================="
echo "  Kelulusan Dashboard - VPS Deploy"
echo "=================================================="

echo "[check] Verifikasi dependency..."
command -v nginx >/dev/null || { echo "ERR: nginx tidak ada. apt install nginx"; exit 1; }
command -v php   >/dev/null || { echo "ERR: php tidak ada. apt install php${PHP_VER}-fpm"; exit 1; }
command -v mysql >/dev/null || { echo "ERR: mysql tidak ada. apt install mysql-server"; exit 1; }
echo "  OK  Nginx, PHP, MySQL tersedia"

echo "[1/6] Membuat direktori..."
mkdir -p "$WEBROOT/dist/dashboard"
mkdir -p "$WEBROOT/public/api"
mkdir -p "$WEBROOT/public/exports"
mkdir -p "$WEBROOT/public/uploads"
mkdir -p "$WEBROOT/public/js"
echo "  OK  Direktori: $WEBROOT"

echo "[2/6] Menyalin file bundle..."
cp -r dashboard/. "$WEBROOT/dist/dashboard/"
cp -r api/.       "$WEBROOT/public/api/"
cp -r js/.        "$WEBROOT/public/js/"
[ -f .env.example ] && cp .env.example "$WEBROOT/.env.example"
echo "  OK  dashboard/, api/, js/ disalin"

echo "[3/6] Setup database MySQL..."
MYSQL_CMD="mysql -u $DB_ROOT_USER"
# [ -n "$DB_ROOT_PASS" ] && MYSQL_CMD="mysql -u $DB_ROOT_USER -p$DB_ROOT_PASS"

$MYSQL_CMD <<SQL
CREATE DATABASE IF NOT EXISTS $DB_NAME
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL
echo "  OK  Database '$DB_NAME' siap"

if [ -f schema.sql ]; then
  echo "  ->  Importing schema.sql..."
  mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < schema.sql
  echo "  OK  Schema diimport"
  rm -f schema.sql
  echo "  OK  schema.sql dihapus dari disk"
fi

echo "[4/6] Membuat .env..."
cat > "$WEBROOT/.env" <<ENV
# Kelulusan Dashboard - Environment
# Generated: $(date)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASS=$DB_PASS
DB_CHARSET=utf8mb4
APP_ENV=production
APP_URL=https://$DOMAIN
SESSION_NAME=kls_session
JSON_RETENTION_LIMIT=5
ENV
chmod 640 "$WEBROOT/.env"
chown www-data:www-data "$WEBROOT/.env"
echo "  OK  .env dibuat dan diproteksi"

echo "[5/6] Konfigurasi Nginx..."
PHP_SOCK=$(find /var/run/php/ -name "php*.sock" 2>/dev/null | sort -r | head -1)
[ -z "$PHP_SOCK" ] && PHP_SOCK="/var/run/php/php${PHP_VER}-fpm.sock"
echo "  ->  PHP-FPM socket: $PHP_SOCK"

cat > /etc/nginx/sites-available/kelulusan-admin <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    root $WEBROOT/dist/dashboard;
    index index.html;
    charset utf-8;
    access_log /var/log/nginx/kelulusan-access.log;
    error_log  /var/log/nginx/kelulusan-error.log;

    location ~ /\.env  { deny all; return 404; }
    location ~ /\.git  { deny all; return 404; }

    location ^~ /api/ {
        alias $WEBROOT/public/api/;
        try_files \$uri \$uri/ =404;
        location ~ \.php$ {
            fastcgi_pass unix:$PHP_SOCK;
            fastcgi_param SCRIPT_FILENAME \$request_filename;
            include fastcgi_params;
            fastcgi_read_timeout 120;
        }
    }
    location ^~ /js/ {
        alias $WEBROOT/public/js/;
        expires 1d;
    }
    location ~* \.(js|css|webp|png|svg|woff2|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
NGINX

ln -sf /etc/nginx/sites-available/kelulusan-admin /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
echo "  OK  Nginx dikonfigurasi"

echo "[6/6] Set permission..."
chown -R www-data:www-data "$WEBROOT"
find "$WEBROOT" -type d -exec chmod 755 {} \;
find "$WEBROOT" -type f -exec chmod 644 {} \;
chmod 640 "$WEBROOT/.env"
chmod 775 "$WEBROOT/public/exports" 2>/dev/null || true
chmod 775 "$WEBROOT/public/uploads" 2>/dev/null || true
echo "  OK  Permission diset"

echo ""
echo "=================================================="
echo "  SELESAI!"
echo "  Web root : $WEBROOT"
echo "  Domain   : $DOMAIN"
echo "  DB Name  : $DB_NAME"
echo "  DB User  : $DB_USER"
echo "  DB Pass  : $DB_PASS   <-- CATAT INI!"
echo ""
echo "  Langkah berikutnya:"
echo "  1. Buat akun admin (lihat SETUP.md)"
echo "  2. HTTPS: certbot --nginx -d $DOMAIN"
echo "  3. Akses: http://$DOMAIN/dashboard/overview"
echo "=================================================="
'@
$setupSh = $setupSh -replace '%%TS%%', $tsReadable
$setupSh | Set-Content -Path "$tempDir\setup-vps.sh" -Encoding UTF8 -NoNewline
Write-OK "setup-vps.sh dibuat"

# --- LANGKAH 5: .htaccess (Apache / cPanel) -----------------------------------
Write-Step "Membuat .htaccess (Apache / cPanel)"
$htaccess = @'
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

# SPA Fallback
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
<FilesMatch "\.html$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
</FilesMatch>
'@
$htaccess | Set-Content -Path "$tempDir\.htaccess" -Encoding UTF8 -NoNewline
Write-OK ".htaccess dibuat (Apache / cPanel)"

# --- LANGKAH 6: nginx-vhost.conf (Nginx / VPS) --------------------------------
Write-Step "Membuat nginx-vhost.conf (Nginx / VPS)"
$nginxConf = @"
# ============================================================
#  Kelulusan Dashboard - Nginx Virtual Host Config
#  Generated : $tsReadable
#
#  Cara pakai di VPS:
#    sudo cp nginx-vhost.conf /etc/nginx/sites-available/kelulusan-admin
#    sudo ln -s /etc/nginx/sites-available/kelulusan-admin \
#               /etc/nginx/sites-enabled/
#    sudo nginx -t && sudo systemctl reload nginx
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

    # Blokir file sensitif
    location ~ /\.env      { deny all; return 404; }
    location ~ /\.git      { deny all; return 404; }
    location ~ /\.htaccess { deny all; return 404; }

    # PHP API
    location ^~ /api/ {
        alias /var/www/kelulusan/public/api/;
        try_files `$uri `$uri/ =404;
        location ~ \.php`$ {
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_param SCRIPT_FILENAME `$request_filename;
            fastcgi_param SCRIPT_NAME     `$fastcgi_script_name;
            include fastcgi_params;
            fastcgi_read_timeout 120;
        }
    }

    # JavaScript dashboard
    location ^~ /js/ {
        alias /var/www/kelulusan/public/js/;
        expires 1d;
        add_header Cache-Control "public";
    }

    # Aset statis
    location ~* \.(js|css|webp|png|jpg|svg|woff2|ico)`$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files `$uri =404;
    }

    # SPA Fallback
    location / {
        try_files `$uri `$uri/ /index.html;
    }

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1024;
}

# HTTPS - aktifkan setelah: certbot --nginx -d admin.namadomain.com
# server {
#     listen 443 ssl http2;
#     server_name admin.namadomain.com;
#     ssl_certificate     /etc/letsencrypt/live/admin.namadomain.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/admin.namadomain.com/privkey.pem;
#     include /etc/letsencrypt/options-ssl-nginx.conf;
#     root /var/www/kelulusan/dist/dashboard;
#     # ... salin semua location block dari server di atas
# }
"@
$nginxConf | Set-Content -Path "$tempDir\nginx-vhost.conf" -Encoding UTF8 -NoNewline
Write-OK "nginx-vhost.conf dibuat"

# --- LANGKAH 7: SETUP.md ------------------------------------------------------
Write-Step "Membuat SETUP.md"
$setupMd = @"
# Setup Admin Dashboard Kelulusan

Bundle dibuat: $tsReadable

## Isi Bundle

| File/Folder | Keterangan |
|---|---|
| dashboard/ | File HTML/CSS/JS dashboard hasil build |
| api/ | PHP API backend |
| js/ | JavaScript dashboard (dash-*.js) |
| schema.sql | Struktur tabel MySQL (tanpa data) |
| .env.example | Template konfigurasi environment |
| .htaccess | Konfigurasi Apache/cPanel |
| nginx-vhost.conf | Virtual host Nginx untuk VPS |
| setup-vps.sh | Script auto-deploy Linux VPS |
| SETUP.md | Panduan ini |

---

## Opsi A -- Auto Setup (VPS Linux)

Edit setup-vps.sh dulu, ubah DOMAIN di baris ke-12, lalu:

    sudo bash setup-vps.sh

---

## Opsi B -- Manual (cPanel/Shared Hosting)

1. Upload ke folder domain (misal: admin-dashboard/)
2. Salin .htaccess ke root folder domain
3. Buat database di cPanel -> MySQL Databases
4. Import schema.sql via phpMyAdmin
5. Salin .env.example -> .env, isi kredensial DB
6. Aktifkan SSL via AutoSSL cPanel

---

## Opsi C -- Manual (VPS Nginx)

1. Salin nginx-vhost.conf ke /etc/nginx/sites-available/kelulusan-admin
2. Edit server_name di dalam file tersebut
3. Aktifkan: sudo ln -s /etc/nginx/sites-available/kelulusan-admin /etc/nginx/sites-enabled/
4. Test: sudo nginx -t && sudo systemctl reload nginx
5. Buat database dan import schema.sql
6. Buat file .env di /var/www/kelulusan/.env

---

## Buat Akun Admin Pertama

    php -r "echo hash('sha256', 'password_anda');"

Jalankan SQL di MySQL:

    INSERT INTO users (id, username, password_hash, nama, role, aktif)
    VALUES (UUID(), 'admin', '<HASH_DI_ATAS>', 'Administrator', 'admin', 1);

---

CATATAN KEAMANAN: Hapus schema.sql dari server setelah import selesai!
"@
$setupMd | Set-Content -Path "$tempDir\SETUP.md" -Encoding UTF8
Write-OK "SETUP.md dibuat"

# --- LANGKAH 8: Buat ZIP ------------------------------------------------------
Write-Div
Write-Step "Membuat file ZIP: $zipName"

if (-not (Test-Path $outDirFull)) {
    New-Item -ItemType Directory -Force -Path $outDirFull | Out-Null
}

Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force
Write-OK "ZIP dibuat: $zipPath"

$zipSizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-OK "Ukuran: $zipSizeMB MB"

# --- LANGKAH 9: Cleanup temp --------------------------------------------------
Remove-Item -Path $tempDir -Recurse -Force
if ($schemaFile -and (Test-Path $schemaFile)) { Remove-Item $schemaFile -Force }

# Resolve path absolut ZIP (hilangkan .\ dari path)
$zipAbsPath   = (Resolve-Path $zipPath).Path
$zipAbsFolder = Split-Path $zipAbsPath -Parent

# --- Ringkasan ----------------------------------------------------------------
Write-Div
Write-Host ""
Write-Host "  BUNDLE SELESAI!" -ForegroundColor Green
Write-Host ""
Write-Host "  +--------------------------------------------------+" -ForegroundColor Cyan
Write-Host "  |  LOKASI FILE ZIP                                 |" -ForegroundColor Cyan
Write-Host "  +--------------------------------------------------+" -ForegroundColor Cyan
Write-Host "  |" -ForegroundColor Cyan -NoNewline
Write-Host "  File   : $zipName" -ForegroundColor White -NoNewline
Write-Host "" 
Write-Host "  |" -ForegroundColor Cyan -NoNewline
Write-Host "  Folder : $zipAbsFolder" -ForegroundColor White
Write-Host "  |" -ForegroundColor Cyan -NoNewline
Write-Host "  Size   : $zipSizeMB MB" -ForegroundColor White
Write-Host "  +--------------------------------------------------+" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Path lengkap:" -ForegroundColor DarkGray
Write-Host "  $zipAbsPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Isi bundle:" -ForegroundColor DarkGray
Write-Host "    dashboard/         <- HTML/CSS/JS dashboard" -ForegroundColor DarkGray
Write-Host "    api/               <- PHP API backend" -ForegroundColor DarkGray
Write-Host "    js/                <- Dashboard JavaScript" -ForegroundColor DarkGray
if (-not $SkipDb) {
    Write-Host "    schema.sql         <- Struktur database MySQL" -ForegroundColor DarkGray
}
Write-Host "    .env.example       <- Template konfigurasi" -ForegroundColor DarkGray
Write-Host "    .htaccess          <- Konfigurasi Apache/cPanel" -ForegroundColor DarkGray
Write-Host "    nginx-vhost.conf   <- Virtual host Nginx VPS" -ForegroundColor DarkGray
Write-Host "    setup-vps.sh       <- Auto-deploy Linux VPS" -ForegroundColor DarkGray
Write-Host "    SETUP.md           <- Panduan deploy" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Langkah selanjutnya:" -ForegroundColor Yellow
Write-Host "    1. Upload ZIP ke VPS / cPanel" -ForegroundColor White
Write-Host "    2. Extract: unzip $zipName" -ForegroundColor White
Write-Host "    3. Edit setup-vps.sh -> ubah DOMAIN" -ForegroundColor White
Write-Host "    4. Jalankan: sudo bash setup-vps.sh" -ForegroundColor White
Write-Host ""
Write-Div

# Tawaran buka Explorer
Write-Host ""
$openExplorer = Read-Host "  Buka folder deploy di Explorer? (y/n)"
if ($openExplorer -eq 'y' -or $openExplorer -eq 'Y') {
    Start-Process explorer.exe -ArgumentList $zipAbsFolder
    Write-Host "  Explorer dibuka: $zipAbsFolder" -ForegroundColor Green
}
Write-Host ""
