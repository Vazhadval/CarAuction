@echo off
echo Starting Car Auction Backend API...
cd /d "%~dp0backend"
set ASPNETCORE_ENVIRONMENT=Production
echo Backend will be available at:
echo - HTTP: http://localhost:5000
echo - HTTPS: https://localhost:5001
echo.
echo Starting backend...
CarAuction.API.exe
