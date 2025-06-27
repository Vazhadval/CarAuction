@echo off
echo Installing serve package globally (if not already installed)...
npm install -g serve
echo.
echo Starting Car Auction Frontend...
echo Frontend will be available at: http://localhost:3000
echo.
cd /d "%~dp0frontend"
serve -s . -l 3000
