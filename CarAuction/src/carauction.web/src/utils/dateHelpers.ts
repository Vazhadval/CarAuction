// Simple Georgian time helpers for auction dates
const GEORGIAN_TIMEZONE = 'Asia/Tbilisi';

/**
 * Get current time in Georgian timezone
 */
export const getCurrentGeorgianTime = (): Date => {
  const now = new Date();
  const georgianTimeString = now.toLocaleString("sv-SE", {timeZone: GEORGIAN_TIMEZONE});
  return new Date(georgianTimeString);
};

/**
 * Convert datetime-local input to Georgian time date object for API
 * @param georgianDateString - Date string from datetime-local input (YYYY-MM-DDTHH:mm)
 */
export const georgianInputToDate = (georgianDateString: string): Date => {
  // Simply treat the input as Georgian time and create a Date object
  return new Date(georgianDateString);
};

/**
 * Convert date to string for datetime-local input (Georgian time)
 * @param date - Date object
 */
export const dateToGeorgianInput = (date: Date): string => {
  const georgianTimeString = date.toLocaleString("sv-SE", {timeZone: GEORGIAN_TIMEZONE});
  return georgianTimeString.replace(' ', 'T').substring(0, 16);
};

/**
 * Format date for display (Georgian time)
 * @param date - Date object or ISO string
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: GEORGIAN_TIMEZONE
  };
  
  return dateObj.toLocaleString('en-GB', options);
};

/**
 * Get time remaining until auction ends
 * @param endDate - End date (Date object or ISO string)
 */
export const getTimeRemaining = (endDate: Date | string): string => {
  const endDateObj = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = getCurrentGeorgianTime();
  
  const totalSeconds = Math.floor((endDateObj.getTime() - now.getTime()) / 1000);
  
  if (totalSeconds <= 0) {
    return 'აუქციონი დასრულდა';
  }
  
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  if (days > 0) {
    return `${days}დღე ${hours}სთ ${minutes}წთ`;
  } else if (hours > 0) {
    return `${hours}სთ ${minutes}წთ ${seconds}წმ`;
  } else if (minutes > 0) {
    return `${minutes}წთ ${seconds}წმ`;
  } else {
    return `${seconds}წმ`;
  }
};

/**
 * Check if auction is currently active
 * @param startDate - Start date (Date object or ISO string)
 * @param endDate - End date (Date object or ISO string)
 */
export const isAuctionActive = (startDate: Date | string, endDate: Date | string): boolean => {
  const startDateObj = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const endDateObj = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = getCurrentGeorgianTime();
  
  return startDateObj <= now && now <= endDateObj;
};
