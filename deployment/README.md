# Car Auction Application - Deployment Guide

## Quick Start

### Option 1: Run Everything (Recommended)
Simply double-click `start-application.bat` or run `start-application.ps1` in PowerShell.

### Option 2: Manual Start
1. Run `start-backend.bat` first
2. Wait a few seconds
3. Run `start-frontend.bat`

## Application URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Backend API (HTTPS)**: https://localhost:5001
- **API Documentation**: http://localhost:5000/swagger (when backend is running)

## Prerequisites
- Node.js installed (for serving the frontend)
- .NET 9.0 Runtime (already included in the backend folder)

## Folder Structure
```
deployment/
├── backend/               # Published .NET API
│   ├── CarAuction.API.exe # Main executable
│   ├── appsettings.Production.json
│   └── wwwroot/           # Upload folder
├── frontend/              # Built React app
│   ├── index.html
│   └── static/            # CSS, JS assets
├── start-application.bat  # Start both apps
├── start-backend.bat      # Start only backend
├── start-frontend.bat     # Start only frontend
└── start-application.ps1  # PowerShell version
```

## Production Notes

### Database
- Currently configured for LocalDB
- For production, update the connection string in `appsettings.Production.json`

### Security
- Change the JWT secret key in production
- Configure CORS for your domain
- Set up proper SSL certificates for HTTPS

### Performance
- The frontend is served using `serve` package (development server)
- For production, consider using IIS, Nginx, or Apache

## Troubleshooting

### Backend Issues
- Check if port 5000/5001 is available
- Ensure database connection is working
- Check logs in the console window

### Frontend Issues
- Ensure port 3000 is available
- Check if `serve` package is installed: `npm list -g serve`
- Install serve if missing: `npm install -g serve`

### Database Issues
- Ensure SQL Server LocalDB is installed
- Check connection string in `appsettings.Production.json`
- Run database migrations if needed

## Stopping the Application
- Close both console windows
- Or press Ctrl+C in each window

## For Cloud Deployment
Consider these platforms:
- **Azure**: Use Azure App Service for both frontend and backend
- **AWS**: Use Elastic Beanstalk or EC2
- **Heroku**: Deploy backend as web app, frontend to Netlify/Vercel
- **DigitalOcean**: Use App Platform or Droplets
