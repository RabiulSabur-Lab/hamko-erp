# Automated Sync, Build, and Push Script for Hamko ERP
Write-Host ">>> 1. Building Hamko ERP Web Application..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Aborting." -ForegroundColor Red
    exit 1
}

Write-Host ">>> 2. Syncing Capacitor Android assets..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "Capacitor sync failed! Aborting." -ForegroundColor Red
    exit 1
}

Write-Host ">>> 3. Staging and committing changes..." -ForegroundColor Cyan
$gitExe = "$env:LOCALAPPDATA\MinGit\cmd\git.exe"
if (-not (Test-Path $gitExe)) {
    $gitExe = "git"
}

$commitMsg = if ($args[0]) { $args[0] } else { "chore: automated sync, capacitor build, and database mirror update" }

& $gitExe add -A
& $gitExe commit -m $commitMsg

Write-Host ">>> 4. Pushing to GitHub main branch..." -ForegroundColor Cyan
& $gitExe push origin main

Write-Host ">>> Done! GitHub Actions and live deployment triggered successfully." -ForegroundColor Green
