@echo off
REM Script untuk Git Push + Build Assets
REM Karena di hosting tidak bisa jalankan NPM, kita build aset di sini.

echo ====================================
echo Git Push Script + Auto Build
echo ====================================
echo.

REM 0. Build Frontend Assets
echo [0/5] Building Frontend Assets (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Gagal melakukan build assets!
    echo Script dihentikan. Cek error di atas.
    pause
    exit /b %errorlevel%
)
echo.

REM 1. Cek status perubahan
echo [1/5] Mengecek status perubahan...
git status
echo.

REM 2. Tambahkan perubahan
echo [2/5] Menambahkan perubahan...
git add .
echo.

REM 3. Commit perubahan
echo [3/5] Melakukan commit...
set /p commit_message="Masukkan pesan commit: "
if "%commit_message%"=="" (
    set commit_message=Update Files and Assets
)
git commit -m "%commit_message%"
echo.

REM 4. Push ke GitHub
echo [4/5] Push ke GitHub...
git push origin main
echo.

echo ====================================
echo Selesai!
echo ====================================
pause
