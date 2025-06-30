# Render.com Deployment Guide (Manual Setup - No Payment Required)

## Prerequisites
1. GitHub repository with your code
2. Render.com account (free tier)

## Deployment Steps

### 1. Push to GitHub
Make sure all your changes are committed and pushed to your GitHub repository.

### 2. Create PostgreSQL Database
1. Go to [Render.com](https://render.com)
2. Sign in with your GitHub account
3. Click "New +" and select "PostgreSQL"
4. Configure the database:
   - **Name**: `carauction-db`
   - **Database**: `carauction`
   - **User**: `carauction_user`
   - **Region**: Choose closest to you
   - **Plan**: Free
5. Click "Create Database"
6. **IMPORTANT**: Copy the **"Internal Database URL"** from the database info page - you'll need this for the web service
   - ⚠️ Use **Internal Database URL** (for service-to-service communication within Render)
   - ❌ Don't use External Database URL (that's for external connections)

### 3. Create Web Service
1. Click "New +" and select "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `carauction-api`
   - **Environment**: Docker
   - **Build Command**: (leave empty - Docker handles this)
   - **Start Command**: (leave empty - Docker handles this)
   - **Plan**: Free
4. Add Environment Variables:
   - `ASPNETCORE_ENVIRONMENT` = `Production`
   - `ASPNETCORE_URLS` = `http://+:10000`
   - `DATABASE_URL` = (paste the **Internal Database URL** from step 2.6)
   
   **⚠️ CRITICAL**: Use **Internal Database URL** format:
   ```
   postgresql://carauction_user:qXFuNmPqMQRshJUxgkxQhjyuY3Z8LJ9o@dpg-d1hdugvgi27c739m74t0-a:5432/carauction
   ```
   **NOT** the External URL format (which includes `.frankfurt-postgres.render.com`)
   
   **Double-check**: No extra spaces, line breaks, or quotes around the DATABASE_URL value!
5. Set **Health Check Path**: `/api/cars`
6. Click "Create Web Service"

### 4. Database Migration
The application will automatically run migrations on startup, so your PostgreSQL database will be set up with all the necessary tables.

### 5. CORS Configuration
The API is configured to allow requests from any origin, so your Vercel frontend should be able to communicate with it without issues.

## Important Notes

### 5. Deployment Complete
After both services are created, your API will be available at: `https://carauction-api.onrender.com`

## Important Notes

### Production Configuration
- Database: PostgreSQL (free tier managed by Render)
- Environment: Production  
- Port: 10000 (Render's default for free tier)
- CORS: Allows all origins
- Static Files: Served from `/wwwroot` directory
- Uploads: Stored in `/wwwroot/uploads`

### Manual Setup Benefits
- ✅ No payment information required
- ✅ Uses Render's free tier
- ✅ Full control over configuration
- ✅ Easy to modify individual services

### File Uploads
Files uploaded via the API will be stored in the container's filesystem. For production, consider using cloud storage like AWS S3 or Cloudinary.

### Database Connection
- You manually provide the `DATABASE_URL` environment variable from the PostgreSQL service
- The app automatically detects PostgreSQL vs SQL Server based on the connection string format
- EF Core migrations run automatically on startup

### Frontend Integration
Update your frontend's `apiConfig.ts` to point to your new Render URL:
```typescript
BASE_URL: isDevelopment 
  ? 'https://localhost:7000' 
  : 'https://carauction-api.onrender.com'
```

### Health Check
The service includes a health check endpoint at `/api/cars` to ensure the application is running properly.

### Troubleshooting
- If deployment fails, check the logs in Render's dashboard
- **Database Connection Issues**: 
  1. Verify you're using the **Internal Database URL** (not External)
  2. Check for extra spaces or line breaks in the DATABASE_URL environment variable
  3. Ensure the DATABASE_URL has this exact format: `postgresql://user:password@hostname:5432/database`
  4. Go to your database service → "Connect" tab → copy the **Internal Database URL**
- Verify the Dockerfile builds successfully locally with: `docker build -t test .`

### Database URL Formats
- ✅ **Internal (Correct for Render services)**: `postgresql://user:pass@dpg-xyz-a:5432/db`
- ❌ **External (Wrong for Render services)**: `postgresql://user:pass@dpg-xyz-a.region-postgres.render.com:5432/db`
