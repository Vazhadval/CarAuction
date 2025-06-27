// Helper functions for dealing with time/dates in the auction system

/**
 * Format a date string for display
 * @param dateString ISO date string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

/**
 * Calculate and format time remaining until a future date
 * @param endDateStr ISO date string for the end date/time
 * @returns Formatted time remaining string
 */
export const getTimeRemaining = (endDateStr: string): string => {
  const endDate = new Date(endDateStr);
  const now = new Date();
  
  // If the end date is in the past
  if (endDate <= now) {
    return 'Auction ended';
  }
  
  const totalSeconds = Math.floor((endDate.getTime() - now.getTime()) / 1000);
  
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Calculate and format time remaining until a future date, including total seconds for styling
 * @param endDateStr ISO date string for the end date/time
 * @returns Object with formatted time string and total seconds
 */
export const getTimeRemainingWithSeconds = (endDateStr: string): { formatted: string; totalSeconds: number } => {
  const endDate = new Date(endDateStr);
  const now = new Date();
  
  // If the end date is in the past
  if (endDate <= now) {
    return { formatted: 'Auction ended', totalSeconds: 0 };
  }
  
  const totalSeconds = Math.floor((endDate.getTime() - now.getTime()) / 1000);
  
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  let formatted: string;
  if (days > 0) {
    formatted = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    formatted = `${minutes}m ${seconds}s`;
  } else {
    formatted = `${seconds}s`;
  }
  
  return { formatted, totalSeconds };
};

/**
 * Check if a date has passed
 * @param dateStr ISO date string
 * @returns boolean - true if the date has passed
 */
export const hasDatePassed = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const now = new Date();
  return date <= now;
};

/**
 * Determines if an auction is currently active (i.e., between start and end dates)
 * @param startDateStr ISO date string for the start date/time
 * @param endDateStr ISO date string for the end date/time
 * @returns boolean - true if the auction is active
 */
export const isAuctionActive = (startDateStr: string, endDateStr: string): boolean => {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const now = new Date();
  
  return startDate <= now && now <= endDate;
};
