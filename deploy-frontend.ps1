$ErrorActionPreference = "Stop"

$distFrontend = ".\dist\frontend"
$tempDir = ".\temp_deploy_frontend"

Write-Host "========================================="
Write-Host " Membangun Ulang Frontend (npm run build:frontend)..."
Write-Host "========================================="
npm run build:frontend

# Hapus tempDir jika ada
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Menyalin struktur folder Frontend..."
# Kita copy isi dari dist/frontend.
Copy-Item -Path "$distFrontend\*" -Destination $tempDir -Recurse -Force

# Sertakan juga file API publik dan konfigurasi penting jika dibutuhkan
$publicDir = ".\public"
Copy-Item -Path "$publicDir\api" -Destination $tempDir -Recurse -Force

# Compress ke upload-frontend.zip
if (Test-Path ".\upload-frontend.zip") {
    Remove-Item ".\upload-frontend.zip" -Force
}

Write-Host "Membuat file upload-frontend.zip..."
Compress-Archive -Path "$tempDir\*" -DestinationPath ".\upload-frontend.zip" -Force

Remove-Item -Path $tempDir -Recurse -Force

Write-Host "========================================="
Write-Host "Selesai! File 'upload-frontend.zip' berhasil dibuat."
Write-Host ""
Write-Host "PENTING SAAT DEPLOY KE VPS:"
Write-Host "1. Upload 'upload-frontend.zip' ke ROOT direktori web Anda."
Write-Host "   (kelulusan.disdiktanjungbalai.id/)"
Write-Host "2. Hasil ekstrak secara otomatis akan menggantikan/membuat halaman publik dan folder form-lembaga di VPS."
Write-Host "========================================="
