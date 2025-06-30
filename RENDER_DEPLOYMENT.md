# Render.com Deployment Guide

## Prerequisites
1. GitHub repository with your code
2. Render.com account

## Deployment Steps

### 1. Push to GitHub
Make sure all your changes are committed and pushed to your GitHub repository.

### 2. Connect to Render
1. Go to [Render.com](https://render.com)
2. Sign in with your GitHub account
3. Click "New +" and select "Blueprint"
4. Connect your GitHub repository
5. Render will automatically detect the `render.yaml` file

### 3. Environment Configuration
The deployment will automatically:
- Create a PostgreSQL database (carauction-db)
- Set up the web service with Docker
- Provide DATABASE_URL environment variable automatically

### 4. Database Migration
The application will automatically run migrations on startup, so your PostgreSQL database will be set up with all the necessary tables.

### 5. CORS Configuration
The API is configured to allow requests from any origin, so your Vercel frontend should be able to communicate with it without issues.

## Important Notes

### Production Configuration
- Database: PostgreSQL (automatically managed by Render)
- Environment: Production
- CORS: Allows all origins
- Static Files: Served from `/wwwroot` directory
- Uploads: Stored in `/wwwroot/uploads`

### File Uploads
Files uploaded via the API will be stored in the container's filesystem. For production, consider using cloud storage like AWS S3 or Cloudinary.

### Database Connection
- Render automatically provides a `DATABASE_URL` environment variable when you create a PostgreSQL service
- The app automatically detects if it's running with PostgreSQL (production) or SQL Server (local development) based on the connection string format
- No manual configuration needed - the database connection is handled automatically

### Frontend Integration
Update your frontend's `apiConfig.ts` to point to your new Render URL:
```typescript
BASE_URL: isDevelopment 
  ? 'https://localhost:7000' 
  : 'https://your-app-name.onrender.com'
```

## Health Check
The service includes a health check endpoint at `/api/cars` to ensure the application is running properly.

## Scaling
Render will automatically scale your application based on traffic, and the PostgreSQL database is fully managed.
