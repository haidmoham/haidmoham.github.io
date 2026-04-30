# deploy.ps1 — push portfolio to GitHub from Windows PowerShell
# Usage: .\deploy.ps1

$ErrorActionPreference = "Stop"

$GITHUB_USER = "haidmoham"
$REPO_NAME = "haidmoham.github.io"

Write-Host "Deploying portfolio to GitHub..." -ForegroundColor Cyan
Write-Host ""

# Make sure we're in the portfolio directory
if (-not (Test-Path "index.html")) {
    Write-Host "ERROR: run this script from the portfolio folder (where index.html lives)" -ForegroundColor Red
    exit 1
}

# Init git if needed
if (-not (Test-Path ".git")) {
    Write-Host "Initializing git repo..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# Stage and commit
Write-Host "Staging files..." -ForegroundColor Yellow
git add .

# Check if there's anything to commit
$status = git status --porcelain
if ([string]::IsNullOrEmpty($status)) {
    Write-Host "Nothing to commit - already up to date." -ForegroundColor Gray
} else {
    git commit -m "Deploy portfolio"
}

# Add remote if not already added
$remotes = git remote
if ($remotes -notcontains "origin") {
    Write-Host "Adding GitHub remote..." -ForegroundColor Yellow
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
}

# Push
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host ""
Write-Host "Done! Your site will be live in ~1 minute at:" -ForegroundColor Green
Write-Host "   https://$GITHUB_USER.github.io" -ForegroundColor Green
Write-Host ""
Write-Host "Next: configure custom domain in repo Settings -> Pages,"
Write-Host "then add Cloudflare DNS records (see README)."
