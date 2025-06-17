import { apiService } from './api';
import { LoginRequest, RegisterRequest, AuthResponse } from '@types/auth';

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/register', userData);
    return response.data;
  },

  async logout(): Promise<void> {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  },
};