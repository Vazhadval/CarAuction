// Helper functions for handling image URLs
const API_BASE_URL = 'https://localhost:7000';

/**
 * Ensures an image URL is absolute by prepending the API base URL if it's relative
 * @param url The image URL to process
 * @returns The absolute URL
 */
export const getAbsoluteImageUrl = (url: string | undefined): string => {
  if (!url) {
    return 'https://via.placeholder.com/300x200?text=No+Image';
  }
  
  if (url.startsWith('/')) {
    return `${API_BASE_URL}${url}`;
  }
  
  return url;
};

/**
 * Gets a placeholder image URL with custom text
 * @param text Optional custom text for the placeholder
 * @returns Placeholder image URL
 */
export const getPlaceholderImage = (text: string = 'No+Image'): string => {
  return `https://via.placeholder.com/300x200?text=${text}`;
};
