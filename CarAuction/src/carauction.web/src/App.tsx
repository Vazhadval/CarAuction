import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';
import { ToastProvider } from './components/ToastProvider';

// Components
import Navigation from './components/Navigation';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import CarDetails from './components/CarDetails';
import AddCar from './components/AddCar';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import signalRService from './services/signalRService';

// Types
import { User, AuthResponse } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser) as User;
      setUser(parsedUser);
      
      // Start SignalR connection if user is logged in
      const token = localStorage.getItem('token');
      if (token) {
        signalRService.startConnection(token);
      }
    }
  }, []);

  const handleLogin = (userData: User, token: string) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
    signalRService.startConnection(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    signalRService.stopConnection();
  };

  // Check if user is admin
  const isAdmin = user?.roles?.includes('Admin');

  // Protected route component
  const ProtectedRoute: React.FC<{
    children: React.ReactNode;
    requiredRole?: string;
  }> = ({ children, requiredRole }) => {
    if (!user) {
      return <Navigate to="/login" />;
    }

    if (requiredRole && !user.roles.includes(requiredRole)) {
      return <Navigate to="/" />;
    }

    return <>{children}</>;
  };

  return (
    <Router>
      <ToastProvider>
        <Navigation user={user} onLogout={handleLogout} />
        <Container className="mt-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/car/:id" element={<CarDetails user={user} />} />
            <Route 
              path="/add-car" 
              element={
                <ProtectedRoute>
                  <AddCar />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <UserDashboard user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="Admin">
                  <AdminDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Container>
      </ToastProvider>
    </Router>
  );
};

export default App;
