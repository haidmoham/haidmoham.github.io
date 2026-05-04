# export_to_portfolio.ps1
# Exports the Phase 1 notebook to standalone HTML and copies it to your portfolio repo.
# Run this from the social-impact-analysis project root.
#
# Usage: .\export_to_portfolio.ps1

$ErrorActionPreference = "Stop"

# === CONFIG ===
$NOTEBOOK_PATH = "notebooks\01_phase1_foundation.ipynb"
$PORTFOLIO_PATH = "C:\Users\haidm\Desktop\Claude Outputs\Portfolio-26"
$OUTPUT_NAME = "social-impact-phase1"

# === SETUP ===
$portfolioNotebooksDir = Join-Path $PORTFOLIO_PATH "notebooks"
$exportTarget = Join-Path $portfolioNotebooksDir "$OUTPUT_NAME.html"

Write-Host "Exporting notebook to standalone HTML..." -ForegroundColor Cyan

# Make sure portfolio/notebooks/ exists
if (-not (Test-Path $portfolioNotebooksDir)) {
    New-Item -ItemType Directory -Path $portfolioNotebooksDir | Out-Null
    Write-Host "Created $portfolioNotebooksDir" -ForegroundColor Yellow
}

# Run nbconvert via uv (uses the project's virtual env, no global install needed)
# --embed-images bundles all images inline so the file is fully self-contained
uv run jupyter nbconvert `
    --to html `
    --embed-images `
    --output-dir $portfolioNotebooksDir `
    --output "$OUTPUT_NAME.html" `
    $NOTEBOOK_PATH

if (-not (Test-Path $exportTarget)) {
    Write-Host "ERROR: export failed - file not found at $exportTarget" -ForegroundColor Red
    exit 1
}

# Fix the browser tab title (nbconvert uses filename by default)
$content = Get-Content $exportTarget -Raw
$content = $content -replace '<title>[^<]*</title>', '<title>Social Vulnerability vs. Health Outcomes — Mohammad Haider</title>'
Set-Content $exportTarget $content -NoNewline

$sizeKB = [math]::Round((Get-Item $exportTarget).Length / 1KB, 1)
Write-Host ""
Write-Host "Exported successfully:" -ForegroundColor Green
Write-Host "   $exportTarget ($sizeKB KB)"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. cd '$PORTFOLIO_PATH'"
Write-Host "   2. git add ."
Write-Host "   3. git commit -m 'Update notebook export'"
Write-Host "   4. git push"
Write-Host ""
Write-Host "After push, the rendered notebook will be live at:"
Write-Host "   https://mhaider.dev/notebooks/$OUTPUT_NAME.html" -ForegroundColor Green
