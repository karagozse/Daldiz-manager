import { apiPost, apiGet, setAuthToken, removeAuthToken } from '@/lib/api';

/**
 * Login request payload
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Login response from backend
 */
export interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    role: string;
    email: string | null;
  };
}

/**
 * Authenticate user with backend API
 * @param username - Username
 * @param password - Password
 * @returns User data if successful, throws error if failed
 */
export const login = async (
  username: string,
  password: string
): Promise<LoginResponse> => {
  const response = await apiPost<LoginResponse>('/auth/login', {
    username: username.trim(),
    password,
  });

  // Store the JWT token
  if (response.access_token) {
    setAuthToken(response.access_token);
  }
  // Note: refresh_token is no longer used - 401 responses trigger logout

  return response;
};

/**
 * Get current user profile (requires authentication)
 */
export const getCurrentUser = async () => {
  return apiGet('/auth/me');
};
