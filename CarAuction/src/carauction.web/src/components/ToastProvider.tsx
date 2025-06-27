import React, { createContext, useContext, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

// Toast types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

// Toast notification interface
interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  autohide?: boolean;
  delay?: number;
}

// Context interface
interface ToastContextType {
  showToast: (title: string, message: string, type: ToastType) => void;
  hideToast: (id: string) => void;
}

// Default context
const defaultToastContext: ToastContextType = {
  showToast: () => {},
  hideToast: () => {},
};

// Create context
const ToastContext = createContext<ToastContextType>(defaultToastContext);

// Custom hook to use the toast context
export const useToast = () => useContext(ToastContext);

// Toast background colors based on type
const getToastBackground = (type: ToastType): string => {
  switch (type) {
    case 'success':
      return 'bg-success text-white';
    case 'error':
      return 'bg-danger text-white';
    case 'warning':
      return 'bg-warning text-dark';
    case 'info':
    default:
      return 'bg-info text-dark';
  }
};

// Toast provider component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Show a toast notification
  const showToast = (title: string, message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts((prevToasts) => [
      ...prevToasts,
      {
        id,
        title,
        message,
        type,
        autohide: true,
        delay: 3000,
      },
    ]);
    
    // Automatically remove toast after delay
    setTimeout(() => {
      hideToast(id);
    }, 3000);
  };

  // Hide a toast notification
  const hideToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1060 }}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            onClose={() => hideToast(toast.id)}
            show={true}
            autohide={toast.autohide}
            delay={toast.delay}
            className={`mb-2 ${getToastBackground(toast.type)}`}
          >
            <Toast.Header closeButton={true}>
              <strong className="me-auto">{toast.title}</strong>
            </Toast.Header>
            <Toast.Body>{toast.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
