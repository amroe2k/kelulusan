$ErrorActionPreference = "Stop"

$distDashboard = ".\dist\dashboard"
$tempDir = ".\temp_deploy_dashboard"

Write-Host "========================================="
Write-Host " Membangun Ulang Dashboard (npm run build:dashboard)..."
Write-Host "========================================="
npm run build:dashboard

# Hapus tempDir jika ada
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Menyalin struktur folder Dashboard..."
# Kita copy isi dari dist/dashboard.
# Ini sudah mengandung folder 'dashboard/' dan folder 'login/'
Copy-Item -Path "$distDashboard\*" -Destination $tempDir -Recurse -Force

# Sertakan juga admin-upload.php & file API terkait jika belum ada
$publicDir = ".\public"
Copy-Item -Path "$publicDir\api" -Destination $tempDir -Recurse -Force
Copy-Item -Path "$publicDir\admin-upload.php" -Destination $tempDir -Force

# Compress ke upload-dashboard.zip
if (Test-Path ".\upload-dashboard.zip") {
    Remove-Item ".\upload-dashboard.zip" -Force
}

Write-Host "Membuat file upload-dashboard.zip..."
Compress-Archive -Path "$tempDir\*" -DestinationPath ".\upload-dashboard.zip" -Force

Remove-Item -Path $tempDir -Recurse -Force

Write-Host "========================================="
Write-Host "Selesai! File 'upload-dashboard.zip' berhasil dibuat."
Write-Host ""
Write-Host "PENTING SAAT DEPLOY KE VPS:"
Write-Host "1. Upload 'upload-dashboard.zip' ke ROOT direktori web Anda."
Write-Host "   (kelulusan.disdiktanjungbalai.id/)"
Write-Host "2. JANGAN di-ekstrak di dalam folder /dashboard/"
Write-Host "3. Hasil ekstrak secara otomatis akan menggantikan/membuat folder /dashboard dan /login di VPS."
Write-Host "========================================="
