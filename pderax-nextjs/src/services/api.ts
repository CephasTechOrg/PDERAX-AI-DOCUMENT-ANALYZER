/**
 * Centralized API Client Service
 * Handles all HTTP requests with automatic configuration, error handling, and auth
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { ApiResponse, ApiError } from '@/types';

class ApiClient {
  private instance: AxiosInstance;
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    // Detect API base URL based on environment
    this.baseURL = this.detectBaseUrl();

    // Create axios instance with default config
    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to attach auth token
    this.instance.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );

    // Load token from storage if available
    this.loadTokenFromStorage();

    console.log(
      `[API Client] Initialized with baseURL: ${this.baseURL}`
    );
  }

  /**
   * Detect API base URL based on environment
   * Supports:
   * - Development: localhost:8000
   * - Live Server ports: 5500, 5501, 5502
   * - Staging/Production: configured URLs
   */
  private detectBaseUrl(): string {
    // If running in browser with explicit API URL set
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) {
      return process.env.NEXT_PUBLIC_API_BASE_URL;
    }

    // Server-side or fallback
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (apiUrl) {
      return apiUrl;
    }

    // Default fallback
    console.warn('[API Client] No API base URL configured, using localhost:8000');
    return 'http://localhost:8000';
  }

  /**
   * Load JWT token from localStorage
   */
  private loadTokenFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const session = localStorage.getItem('auth_session');
        if (session) {
          const { access_token } = JSON.parse(session);
          this.token = access_token;
        }
      } catch (error) {
        console.error('[API Client] Failed to load token from storage:', error);
      }
    }
  }

  /**
   * Set authentication token
   */
  public setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      try {
        const session = localStorage.getItem('auth_session');
        if (session) {
          const parsed = JSON.parse(session);
          parsed.access_token = token;
          localStorage.setItem('auth_session', JSON.stringify(parsed));
        }
      } catch (error) {
        console.error('[API Client] Failed to save token to storage:', error);
      }
    }
  }

  /**
   * Clear authentication token
   */
  public clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_session');
    }
  }

  /**
   * Handle and format API errors
   */
  private handleError(error: AxiosError<ApiError>): Promise<never> {
    const apiError: ApiError = {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      status: error.response?.status || 0,
    };

    if (error.response?.data) {
      const data = error.response.data;
      apiError.code = data.code || `HTTP_${error.response.status}`;
      apiError.message = data.message || error.message;
      apiError.details = data.details;
    } else if (error.request) {
      apiError.code = 'NETWORK_ERROR';
      apiError.message = 'Network request failed. Please check your connection.';
    } else {
      apiError.code = 'REQUEST_ERROR';
      apiError.message = error.message;
    }

    console.error('[API Client Error]', {
      code: apiError.code,
      message: apiError.message,
      status: apiError.status,
      url: error.config?.url,
    });

    return Promise.reject(apiError);
  }

  /**
   * Generic GET request
   */
  public async get<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<any> {
    try {
      const response = await this.instance.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generic POST request
   */
  public async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<any> {
    try {
      const response = await this.instance.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generic PUT request
   */
  public async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<any> {
    try {
      const response = await this.instance.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generic DELETE request
   */
  public async delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<any> {
    try {
      const response = await this.instance.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload file with FormData
   */
  public async upload<T>(
    url: string,
    file: File,
    additionalData?: Record<string, unknown>
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
      }

      const response = await this.instance.post<ApiResponse<T>>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the configured base URL
   */
  public getBaseUrl(): string {
    return this.baseURL;
  }

  /**
   * Get current token
   */
  public getToken(): string | null {
    return this.token;
  }

  /**
   * Check if authenticated
   */
  public isAuthenticated(): boolean {
    return this.token !== null;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

export default apiClient;
