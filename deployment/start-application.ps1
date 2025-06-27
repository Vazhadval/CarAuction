# Car Auction Application Deployment Script
Write-Host "================================" -ForegroundColor Green
Write-Host "   Car Auction Application" -ForegroundColor Green  
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Check if serve is installed
Write-Host "Checking dependencies..." -ForegroundColor Yellow
try {
    $serveVersion = npm list -g serve 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Installing serve package..." -ForegroundColor Yellow
        npm install -g serve
    }
} catch {
    Write-Host "Installing serve package..." -ForegroundColor Yellow
    npm install -g serve
}

# Start Backend
Write-Host "Starting Backend API..." -ForegroundColor Cyan
$backendPath = Join-Path $PSScriptRoot "backend"
$env:ASPNETCORE_ENVIRONMENT = "Production"

Start-Process -FilePath (Join-Path $backendPath "CarAuction.API.exe") -WorkingDirectory $backendPath -WindowStyle Normal

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Cyan
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process -FilePath "npx" -ArgumentList "serve", "-s", ".", "-l", "3000" -WorkingDirectory $frontendPath -WindowStyle Normal

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "Application Started Successfully!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "Backend API (HTTPS): https://localhost:5001" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "You can now open http://localhost:3000 in your browser" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
