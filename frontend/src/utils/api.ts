// src/utils/api.ts

// Get API base URL from environment variable, fallback to relative '/api' if not set
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export function apiUrl(path: string) {
  // Ensure no double slashes
  if (path.startsWith('/')) path = path.slice(1);
  return `${API_BASE_URL}/${path}`;
}
