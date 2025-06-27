@echo off
echo ================================
echo   Car Auction Application
echo ================================
echo.
echo Starting both Frontend and Backend...
echo.
echo Backend API will be available at:
echo - HTTP: http://localhost:5000
echo - HTTPS: https://localhost:5001
echo.
echo Frontend will be available at:
echo - http://localhost:3000
echo.
echo Press Ctrl+C to stop the applications
echo.
start "Car Auction Backend" cmd /k "%~dp0start-backend.bat"
timeout /t 3 /nobreak > nul
start "Car Auction Frontend" cmd /k "%~dp0start-frontend.bat"
echo.
echo Both applications started!
echo You can now open http://localhost:3000 in your browser
pause
