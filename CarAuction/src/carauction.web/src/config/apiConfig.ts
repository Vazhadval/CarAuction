// API Configuration based on environment
const isDevelopment = process.env.NODE_ENV === 'development';

export const API_CONFIG = {
  BASE_URL: isDevelopment 
    ? 'https://localhost:7000' 
    : 'http://vazhadval2-001-site2.qtempurl.com',
  
  // API endpoints
  ENDPOINTS: {
    CARS: '/api/cars',
    AUTH: '/api/auth',
    BIDS: '/api/bids',
    ADMIN: '/api/admin',
    UPLOADS: '/api/uploads'
  },
  
  // SignalR Hub
  SIGNALR_HUB: '/auctionHub'
};

export default API_CONFIG;
