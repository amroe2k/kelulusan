@echo off
echo [1] Menghapus file yang sudah di-track dari Git cache...
git rm -r --cached dist/ 2>nul
git rm -r --cached .astro/ 2>nul
git rm --cached deploy-hosting.zip 2>nul
git rm --cached public/data.json 2>nul
git rm --cached public/users.json 2>nul
git rm -r --cached public/exports/ 2>nul
git rm -r --cached node_modules/ 2>nul
git rm -r --cached vendor/ 2>nul
git rm -r --cached ssl/ 2>nul

echo [2] Commit perubahan...
git add .gitignore
git commit -m "chore: add .gitignore dan bersihkan file yang tidak perlu dari Git tracking"

echo [3] Push ke GitHub...
git push

echo.
echo SELESAI! File ignored sudah dihapus dari Git tracking.
pause
