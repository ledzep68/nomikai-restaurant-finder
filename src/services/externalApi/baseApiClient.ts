import axios, { AxiosInstance, AxiosError } from 'axios';
import { ExternalAPIConfig } from '@/types/externalApi';
import { createError } from '@/middleware/errorHandler';

export interface ApiClientOptions {
  config: ExternalAPIConfig;
  name: string;
}

export interface RateLimitInfo {
  remaining: number;
  reset: Date;
  limit: number;
}

export abstract class BaseApiClient {
  protected client: AxiosInstance;
  protected config: ExternalAPIConfig;
  protected name: string;
  private rateLimitInfo: RateLimitInfo;
  private requestQueue: Array<() => Promise<void>> = [];
  private processing = false;

  constructor(options: ApiClientOptions) {
    this.config = options.config;
    this.name = options.name;
    
    this.rateLimitInfo = {
      remaining: options.config.rateLimit,
      reset: new Date(Date.now() + 60000), // 1 minute window
      limit: options.config.rateLimit,
    };

    this.client = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      headers: this.getDefaultHeaders(),
    });

    this.setupInterceptors();
  }

  protected abstract getDefaultHeaders(): Record<string, string>;

  private setupInterceptors(): void {
    // Request interceptor for rate limiting
    this.client.interceptors.request.use(
      async (config) => {
        await this.handleRateLimit();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        this.updateRateLimitInfo(response.headers);
        return response;
      },
      async (error: AxiosError) => {
        return this.handleApiError(error);
      }
    );
  }

  private async handleRateLimit(): Promise<void> {
    return new Promise((resolve) => {
      this.requestQueue.push(resolve);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.requestQueue.length > 0) {
      if (this.rateLimitInfo.remaining <= 0) {
        const waitTime = this.rateLimitInfo.reset.getTime() - Date.now();
        if (waitTime > 0) {
          console.log(`${this.name}: Rate limit reached. Waiting ${waitTime}ms`);
          await this.sleep(waitTime);
        }
        this.resetRateLimit();
      }

      const resolve = this.requestQueue.shift();
      if (resolve) {
        this.rateLimitInfo.remaining--;
        resolve();
        await this.sleep(1000 / this.config.rateLimit); // Distribute requests evenly
      }
    }

    this.processing = false;
  }

  private updateRateLimitInfo(headers: Record<string, string>): void {
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];
    
    if (remaining) {
      this.rateLimitInfo.remaining = parseInt(remaining, 10);
    }
    
    if (reset) {
      this.rateLimitInfo.reset = new Date(parseInt(reset, 10) * 1000);
    }
  }

  private resetRateLimit(): void {
    this.rateLimitInfo = {
      remaining: this.config.rateLimit,
      reset: new Date(Date.now() + 60000),
      limit: this.config.rateLimit,
    };
  }

  private async handleApiError(error: AxiosError): Promise<never> {
    if (error.response) {
      const status = error.response.status;
      const message = this.getErrorMessage(error);

      switch (status) {
        case 429:
          console.error(`${this.name}: Rate limit exceeded`);
          throw createError('API rate limit exceeded. Please try again later.', 429);
        case 401:
          console.error(`${this.name}: Authentication failed`);
          throw createError('API authentication failed', 401);
        case 404:
          throw createError('Resource not found', 404);
        default:
          throw createError(`${this.name} API error: ${message}`, status);
      }
    } else if (error.request) {
      console.error(`${this.name}: Network error`, error.message);
      throw createError('Network error occurred', 503);
    } else {
      console.error(`${this.name}: Request setup error`, error.message);
      throw createError('Request configuration error', 500);
    }
  }

  private getErrorMessage(error: AxiosError): string {
    if (error.response?.data) {
      const data = error.response.data as Record<string, unknown>;
      return data.message || data.error || 'Unknown error';
    }
    return error.message;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}