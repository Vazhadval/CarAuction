// API Configuration based on environment
const isDevelopment = process.env.NODE_ENV === 'development';

export const API_CONFIG = {
  BASE_URL: isDevelopment 
    ? 'https://localhost:7000' 
    : 'https://e1e6-31-146-76-12.ngrok-free.app',  // Use relative URLs for production (will be proxied by Vercel)
  
  // API endpoints
  ENDPOINTS: {
    CARS: '/api/cars',
    AUTH: '/api/auth',
    BIDS: '/api/bids',
    ADMIN: '/api/admin',
    UPLOADS: '/api/uploads'
  },
  
  // SignalR Hub
  SIGNALR_HUB: '/auctionHub',
  
  // Environment info
  ENVIRONMENT: isDevelopment ? 'development' : 'production',
  IS_DEVELOPMENT: isDevelopment
};

export default API_CONFIG;
