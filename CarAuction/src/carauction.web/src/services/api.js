import axios from 'axios';

const API_URL = 'https://localhost:7000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const login = (email, password) => {
  return apiClient.post('/auth/login', { email, password });
};

export const register = (userData) => {
  return apiClient.post('/auth/register', userData);
};

// Cars API
export const getAllCars = () => {
  return apiClient.get('/cars');
};

export const getCarsByStatus = (status) => {
  return apiClient.get(`/cars/status/${status}`);
};

export const getCarDetails = (id) => {
  return apiClient.get(`/cars/${id}`);
};

export const uploadCarImages = (files) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  return axios.post(`${API_URL}/uploads/car-images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
};

export const addCar = (carData) => {
  return apiClient.post('/cars', carData);
};

export const placeBid = (bidData) => {
  return apiClient.post('/cars/bid', bidData);
};

// Admin API
export const getPendingCars = () => {
  return apiClient.get('/admin/cars/pending');
};

export const approveCar = (id) => {
  return apiClient.put(`/admin/cars/${id}/approve`);
};

export const rejectCar = (id) => {
  return apiClient.put(`/admin/cars/${id}/reject`);
};

export const getUsers = () => {
  return apiClient.get('/admin/users');
};

export const getStatistics = () => {
  return apiClient.get('/admin/statistics');
};

// New API functions
export const getWonCars = () => {
  return apiClient.get('/cars/won');
};

export const getMyBids = () => {
  return apiClient.get('/cars/mybids');
};

export default apiClient;
