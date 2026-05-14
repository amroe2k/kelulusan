$ErrorActionPreference = "Stop"

$distFrontend = ".\dist\frontend"
$distDashboard = ".\dist\dashboard"
$publicDir = ".\public"
$tempDir = ".\temp_vps_deploy"

# Hapus tempDir jika ada
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Menyalin file Frontend..."
Copy-Item -Path "$distFrontend\*" -Destination $tempDir -Recurse -Force

Write-Host "Menyalin file Dashboard..."
Copy-Item -Path "$distDashboard\*" -Destination $tempDir -Recurse -Force

Write-Host "Menyalin file API PHP dan asset lain dari public..."
Copy-Item -Path "$publicDir\api" -Destination $tempDir -Recurse -Force
Copy-Item -Path "$publicDir\js" -Destination $tempDir -Recurse -Force
Copy-Item -Path "$publicDir\admin-upload.php" -Destination $tempDir -Force
Copy-Item -Path "$publicDir\data.json" -Destination $tempDir -Force
if (Test-Path "$publicDir\users.json") {
    Copy-Item -Path "$publicDir\users.json" -Destination $tempDir -Force
}

# Menyertakan file .htaccess untuk routing frontend & dashboard di CyberPanel
$htaccess = @"
Options -MultiViews -Indexes
RewriteEngine On

# Jangan arahkan /api, /js, dan file fisik
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_URI} !^/js/
RewriteRule ^(.*)$ /index.html [L,QSA]
"@
Set-Content -Path "$tempDir\.htaccess" -Value $htaccess -Encoding UTF8

# Compress ke upload-vps.zip
if (Test-Path ".\upload-vps.zip") {
    Remove-Item ".\upload-vps.zip" -Force
}

Write-Host "Membuat file upload-vps.zip..."
Compress-Archive -Path "$tempDir\*" -DestinationPath ".\upload-vps.zip" -Force

Remove-Item -Path $tempDir -Recurse -Force
Write-Host "Selesai! upload-vps.zip berhasil dibuat."
