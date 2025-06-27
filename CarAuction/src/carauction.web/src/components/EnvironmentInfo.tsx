import React from 'react';
import { API_CONFIG } from '../config/apiConfig';

const EnvironmentInfo: React.FC = () => {
  // Only show in development or when explicitly enabled
  if (!API_CONFIG.IS_DEVELOPMENT && !window.location.search.includes('showenv=true')) {
    return null;
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        backgroundColor: API_CONFIG.IS_DEVELOPMENT ? '#28a745' : '#dc3545',
        color: 'white',
        padding: '5px 10px',
        fontSize: '12px',
        zIndex: 9999,
        borderRadius: '0 0 0 5px'
      }}
    >
      {API_CONFIG.ENVIRONMENT.toUpperCase()} - {API_CONFIG.BASE_URL}
    </div>
  );
};

export default EnvironmentInfo;
