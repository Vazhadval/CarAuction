// Helper functions for dealing with time/dates in the auction system
// All dates are stored as UTC in the database but displayed in Georgian time (GMT+4)

// Georgian timezone offset (GMT+4)
const GEORGIAN_TIMEZONE_OFFSET = 4 * 60; // 4 hours in minutes

/**
 * Convert a UTC date to Georgian time
 * @param utcDate Date object in UTC
 * @returns Date object adjusted to Georgian time
 */
export const utcToGeorgianTime = (utcDate: Date): Date => {
  const georgianTime = new Date(utcDate.getTime() + (GEORGIAN_TIMEZONE_OFFSET * 60 * 1000));
  return georgianTime;
};

/**
 * Convert Georgian time to UTC
 * @param georgianDate Date object in Georgian time
 * @returns Date object adjusted to UTC
 */
export const georgianTimeToUtc = (georgianDate: Date): Date => {
  const utcTime = new Date(georgianDate.getTime() - (GEORGIAN_TIMEZONE_OFFSET * 60 * 1000));
  return utcTime;
};

/**
 * Format a UTC date string for display in Georgian time
 * @param dateString ISO date string (UTC from server)
 * @returns Formatted date string in Georgian time
 */
export const formatDate = (dateString: string): string => {
  const utcDate = new Date(dateString);
  const georgianDate = utcToGeorgianTime(utcDate);
  
  // Format as Georgian date/time
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tbilisi' // Georgian timezone
  };
  
  return georgianDate.toLocaleString('en-GB', options) + ' (Georgian Time)';
};

/**
 * Get current time in Georgian timezone
 * @returns Date object representing current Georgian time
 */
export const getCurrentGeorgianTime = (): Date => {
  const now = new Date();
  return utcToGeorgianTime(now);
};

/**
 * Convert Georgian time input to UTC ISO string for API
 * @param georgianDateString Date/time string in Georgian time (from input)
 * @returns ISO string in UTC for API
 */
export const georgianInputToUtcIso = (georgianDateString: string): string => {
  const georgianDate = new Date(georgianDateString);
  const utcDate = georgianTimeToUtc(georgianDate);
  return utcDate.toISOString();
};

/**
 * Convert UTC ISO string to Georgian time for input fields
 * @param utcIsoString UTC ISO string from API
 * @returns Date string formatted for HTML datetime-local input in Georgian time
 */
export const utcIsoToGeorgianInput = (utcIsoString: string): string => {
  const utcDate = new Date(utcIsoString);
  const georgianDate = utcToGeorgianTime(utcDate);
  
  // Format for datetime-local input (YYYY-MM-DDTHH:mm)
  const year = georgianDate.getFullYear();
  const month = String(georgianDate.getMonth() + 1).padStart(2, '0');
  const day = String(georgianDate.getDate()).padStart(2, '0');
  const hours = String(georgianDate.getHours()).padStart(2, '0');
  const minutes = String(georgianDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Calculate and format time remaining until a future date (using Georgian time)
 * @param endDateStr ISO date string for the end date/time (UTC from server)
 * @returns Formatted time remaining string
 */
export const getTimeRemaining = (endDateStr: string): string => {
  const utcEndDate = new Date(endDateStr);
  const georgianEndDate = utcToGeorgianTime(utcEndDate);
  const georgianNow = getCurrentGeorgianTime();
  
  // If the end date is in the past
  if (georgianEndDate <= georgianNow) {
    return 'აუქციონი დასრულდა';
  }
  
  const totalSeconds = Math.floor((georgianEndDate.getTime() - georgianNow.getTime()) / 1000);
  
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
 * Calculate and format time remaining until a future date, including total seconds for styling (using Georgian time)
 * @param endDateStr ISO date string for the end date/time (UTC from server)
 * @returns Object with formatted time string and total seconds
 */
export const getTimeRemainingWithSeconds = (endDateStr: string): { formatted: string; totalSeconds: number } => {
  const utcEndDate = new Date(endDateStr);
  const georgianEndDate = utcToGeorgianTime(utcEndDate);
  const georgianNow = getCurrentGeorgianTime();
  
  // If the end date is in the past
  if (georgianEndDate <= georgianNow) {
    return { formatted: 'აუქციონი დასრულდა', totalSeconds: 0 };
  }
  
  const totalSeconds = Math.floor((georgianEndDate.getTime() - georgianNow.getTime()) / 1000);
  
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  let formatted: string;
  if (days > 0) {
    formatted = `${days}დღე ${hours}სთ ${minutes}წთ`;
  } else if (hours > 0) {
    formatted = `${hours}სთ ${minutes}წთ ${seconds}წმ`;
  } else if (minutes > 0) {
    formatted = `${minutes}წთ ${seconds}წმ`;
  } else {
    formatted = `${seconds}წმ`;
  }
  
  return { formatted, totalSeconds };
};

/**
 * Check if a date has passed (using Georgian time)
 * @param dateStr ISO date string (UTC from server)
 * @returns boolean - true if the date has passed
 */
export const hasDatePassed = (dateStr: string): boolean => {
  const utcDate = new Date(dateStr);
  const georgianDate = utcToGeorgianTime(utcDate);
  const georgianNow = getCurrentGeorgianTime();
  return georgianDate <= georgianNow;
};

/**
 * Determines if an auction is currently active (i.e., between start and end dates) using Georgian time
 * @param startDateStr ISO date string for the start date/time (UTC from server)
 * @param endDateStr ISO date string for the end date/time (UTC from server)
 * @returns boolean - true if the auction is active
 */
export const isAuctionActive = (startDateStr: string, endDateStr: string): boolean => {
  const utcStartDate = new Date(startDateStr);
  const utcEndDate = new Date(endDateStr);
  const georgianStartDate = utcToGeorgianTime(utcStartDate);
  const georgianEndDate = utcToGeorgianTime(utcEndDate);
  const georgianNow = getCurrentGeorgianTime();
  
  return georgianStartDate <= georgianNow && georgianNow <= georgianEndDate;
};
