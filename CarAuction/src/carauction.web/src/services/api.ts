import axios from 'axios';
import { 
  Car, 
  CarDetails, 
  CreateCarDto, 
  PlaceBidDto, 
  AuthResponse, 
  UserRegistration, 
  LoginCredentials,
  Statistics,
  User,
  CreateOrderDto,
  Order,
  PurchasedCar
} from '../types';
import { API_CONFIG } from '../config/apiConfig';

const API_URL = `${API_CONFIG.BASE_URL}/api`;

const apiClient = axios.create({
  baseURL: API_URL,
  // withCredentials: true, // Temporarily disable for CORS testing
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
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
export const login = (email: string, password: string) => {
  return apiClient.post<AuthResponse>('/auth/login', { email, password });
};

export const register = (userData: UserRegistration) => {
  return apiClient.post<AuthResponse>('/auth/register', userData);
};

// Cars API
export const getAllCars = () => {
  return apiClient.get<Car[]>('/cars');
};

export const getCarsByStatus = (status: string) => {
  return apiClient.get<Car[]>(`/cars/status/${status}`);
};

export const getCarDetails = (id: number) => {
  return apiClient.get<CarDetails>(`/cars/${id}`);
};

export const uploadCarImages = (files: File[]): Promise<any> => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  return axios.post(`${API_URL}/uploads/car-images`, formData, {
    // withCredentials: true, // Temporarily disable for CORS testing
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'ngrok-skip-browser-warning': 'true'
    }
  });
};

export const addCar = (carData: CreateCarDto) => {
  return apiClient.post<Car>('/cars', carData);
};

export const placeBid = (bidData: PlaceBidDto) => {
  return apiClient.post<boolean>('/cars/bid', bidData);
};

// Direct Sale API
export const getDirectSaleCars = () => {
  return apiClient.get<Car[]>('/cars/direct-sale');
};

export const buyDirectSaleCar = (orderData: CreateOrderDto) => {
  return apiClient.post<Order>('/cars/buy', orderData);
};

export const getUserPurchases = () => {
  return apiClient.get<PurchasedCar[]>('/cars/purchased');
};

// Admin API
export const getPendingCars = () => {
  return apiClient.get<Car[]>('/admin/cars/pending');
};

export const approveCar = (id: number) => {
  return apiClient.put<boolean>(`/admin/cars/${id}/approve`);
};

export const rejectCar = (id: number) => {
  return apiClient.put<boolean>(`/admin/cars/${id}/reject`);
};

export const getUsers = () => {
  return apiClient.get<User[]>('/admin/users');
};

export const getStatistics = () => {
  return apiClient.get<Statistics>('/admin/statistics');
};

// Admin Direct Sale API
export const getAdminDirectSales = () => {
  return apiClient.get<Car[]>('/admin/cars/direct-sale');
};

export const getAdminOrders = () => {
  return apiClient.get<Order[]>('/admin/orders');
};

export default apiClient;
