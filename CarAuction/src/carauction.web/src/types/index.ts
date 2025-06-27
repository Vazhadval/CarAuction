// Define types based on backend DTOs

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  registeredDate?: string;
}

export interface CarImage {
  id: number;
  imageUrl: string;
  isPrimary: boolean;
}

export interface Car {
  id: number;
  name: string;
  model: string;
  year: number;
  startPrice: number;
  photoUrl?: string;  // Legacy field, now optional
  images: CarImage[];
  auctionStartDate: string;
  auctionEndDate: string;
  status: string;
  currentBid: number;
  sellerName: string;
  sellerId?: string;
}

export interface CarDetails extends Car {
  description: string;
  bidCount: number;
  recentBids: Bid[];
}

export interface UploadResult {
  fileName: string;
  storedFileName?: string;
  contentType?: string;
  url?: string;
  success: boolean;
  error?: string;
}

export interface CreateCarDto {
  name: string;
  model: string;
  year: number;
  startPrice: number;
  description: string;
  photoUrl?: string;
  imageUrls: string[];
  primaryImageIndex?: number;
  auctionStartDate: string;
  auctionEndDate: string;
}

export interface Bid {
  id: number;
  amount: number;
  placedAt: string;
  bidderName: string;
  bidderId: string;
}

export interface PlaceBidDto {
  carId: number;
  amount: number;
}

export interface WonCar {
  id: number;
  name: string;
  model: string;
  year: number;
  startPrice: number;
  winningBid: number;
  photoUrl?: string;
  images: CarImage[];
  auctionEndDate: string;
  sellerName: string;
}

export interface UserBid {
  id: number;
  amount: number;
  placedAt: string;
  carId: number;
  carName: string;
  carModel: string;
  carYear: number;
  auctionStatus: string;
  isWinning: boolean;
  hasWon: boolean;
  currentHighestBid: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UserRegistration {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Statistics {
  totalCars: number;
  totalUsers: number;
  totalBids: number;
  activeBids: number;
  soldCars: number;
  pendingCars: number;
  revenue: number;
}
