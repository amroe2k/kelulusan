# ─── Start Dev Environment ───────────────────────────────
# Menjalankan PHP built-in server (port 8090) + Astro dev server

$phpPort = 8090
$publicDir = Join-Path $PSScriptRoot "public"

# Cek apakah PHP server sudah berjalan
$existing = Get-NetTCPConnection -LocalPort $phpPort -State Listen -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[PHP] Server sudah berjalan di port $phpPort" -ForegroundColor Green
} else {
    Write-Host "[PHP] Menjalankan PHP server di port $phpPort..." -ForegroundColor Cyan
    Start-Process php `
        -ArgumentList "-S", "localhost:$phpPort", "-t", $publicDir, "-d", "variables_order=EGPCS" `
        -WindowStyle Hidden
    Start-Sleep -Milliseconds 800
    $check = Test-NetConnection -ComputerName localhost -Port $phpPort -WarningAction SilentlyContinue
    if ($check.TcpTestSucceeded) {
        Write-Host "[PHP] Server berhasil dijalankan." -ForegroundColor Green
    } else {
        Write-Host "[PHP] GAGAL menjalankan server! Pastikan PHP ada di PATH." -ForegroundColor Red
    }
}

# Jalankan Astro dev server
Write-Host "[Astro] Menjalankan Astro dev server..." -ForegroundColor Cyan
npm run dev
