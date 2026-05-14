# sync-vps.ps1
# -----------------------------------------------------------------------------
# Script untuk mengunggah file ZIP hasil build ke VPS menggunakan pscp & plink.
# Pastikan pscp.exe dan plink.exe sudah terinstal atau ada di PATH Anda.
# -----------------------------------------------------------------------------

$ErrorActionPreference = "Stop"

# ─── KONFIGURASI VPS ────────────────────────────────────────────────────────
$VPS_HOST = "cloud.disdiktanjungbalai.id"        # Ganti dengan IP VPS Anda
$VPS_PORT = "2233"                  # Port SSH VPS
$VPS_USER = "root"                  # User SSH (root atau sudo user)
$VPS_PATH = "/home/disdiktanjungbalai-kelulusan/htdocs/kelulusan.disdiktanjungbalai.id" # Direktori root web di VPS
$VPS_FINGERPRINT = "SHA256:napCxKmu43dMO41oYGD1MMeKdA6jG57Nkhmhh/vOe9Q" # Host Key Fingerprint
$USE_PASSWORD = $true               # Set $false jika menggunakan SSH Key
$SSH_PASSWORD = "@arm123" # Isi jika menggunakan password

# ─── PILIH TARGET UPLOAD ───────────────────────────────────────────────────
Write-Host "`n[?]" -ForegroundColor Cyan -NoNewline
$target = Read-Host " Pilih file yang akan diupload (1: Frontend, 2: Dashboard, 3: Semua)"

$filesToUpload = @()
if ($target -eq "1") {
    $filesToUpload += "upload-frontend.zip"
}
elseif ($target -eq "2") {
    $filesToUpload += "upload-dashboard.zip"
}
elseif ($target -eq "3") {
    $filesToUpload += "upload-frontend.zip", "upload-dashboard.zip"
}
else {
    Write-Host "Pilihan tidak valid. Keluar..." -ForegroundColor Red
    exit
}

# ─── PROSES UPLOAD ──────────────────────────────────────────────────────────
foreach ($fileName in $filesToUpload) {
    if (-not (Test-Path ".\$fileName")) {
        Write-Host "File $fileName tidak ditemukan! Silahkan jalankan build script terlebih dahulu." -ForegroundColor Yellow
        continue
    }

    Write-Host "🧹 Membersihkan file lama di server..." -ForegroundColor Yellow
    $cleanupCmd = "rm -f ${VPS_PATH}/${fileName}"
    $cleanupArgs = @()
    if ($USE_PASSWORD) {
        $cleanupArgs += "-pw"
        $cleanupArgs += $SSH_PASSWORD
    }
    $cleanupArgs += "-P"
    $cleanupArgs += $VPS_PORT
    $cleanupArgs += "-hostkey"
    $cleanupArgs += $VPS_FINGERPRINT
    $cleanupArgs += "-batch"
    $cleanupArgs += "${VPS_USER}@${VPS_HOST}"
    $cleanupArgs += $cleanupCmd
    & plink.exe @cleanupArgs

    Write-Host "🚀 Mengunggah $fileName ke $VPS_HOST..." -ForegroundColor Green
    
    # Siapkan Argumen PSCP
    $pscpArgs = @()
    if ($USE_PASSWORD) {
        $pscpArgs += "-pw"
        $pscpArgs += $SSH_PASSWORD
    }
    $pscpArgs += "-P"
    $pscpArgs += $VPS_PORT
    $pscpArgs += "-hostkey"
    $pscpArgs += $VPS_FINGERPRINT
    $pscpArgs += "-batch"
    $pscpArgs += ".\$fileName"
    $pscpArgs += "${VPS_USER}@${VPS_HOST}:${VPS_PATH}"

    # Jalankan PSCP dengan call operator (&)
    & pscp.exe @pscpArgs

    Write-Host "✓ Upload $fileName Selesai." -ForegroundColor Green

    # ─── EKSTRAK DI VPS ──────────────────────────────────────────────────────
    Write-Host "📦 Mengekstrak $fileName di server..." -ForegroundColor Cyan
    
    # Command SSH untuk unzip dan hapus file zip setelahnya
    $sshCmd = 'cd ' + $VPS_PATH + '; unzip -o ' + $fileName + '; rm ' + $fileName
    
    # Siapkan Argumen Plink
    $plinkArgs = @()
    if ($USE_PASSWORD) {
        $plinkArgs += "-pw"
        $plinkArgs += $SSH_PASSWORD
    }
    $plinkArgs += "-P"
    $plinkArgs += $VPS_PORT
    $plinkArgs += "-hostkey"
    $plinkArgs += $VPS_FINGERPRINT
    $plinkArgs += "-batch"
    $plinkArgs += "${VPS_USER}@${VPS_HOST}"
    $plinkArgs += $sshCmd

    # Jalankan Plink
    & plink.exe @plinkArgs

    Write-Host "✓ Berhasil diekstrak di $VPS_PATH`n" -ForegroundColor Green
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host " SEMUA PROSES SELESAI!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n"
