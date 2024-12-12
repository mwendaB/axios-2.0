import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    AxiosError,
  } from "axios";
  import FormData from "form-data";
  import { TokenStorage, StorageType } from "../storage/TokenStorage";
  
  export interface EnhancedAxiosConfig extends AxiosRequestConfig {
    cache?: boolean;
    retryCount?: number;
    timeout?: number;
    tokenStorageType?: StorageType;
  }
  
  export class EnhancedAxios {
    private instance: AxiosInstance;
    private config: EnhancedAxiosConfig;
    private tokenStorageType: StorageType;
    private cache = new Map<string, any>();
    private requestQueue: (() => Promise<any>)[] = [];
    private isProcessingQueue = false;
  
    constructor(config?: EnhancedAxiosConfig) {
      this.config = {
        retryCount: 3,
        timeout: 30000,
        tokenStorageType: StorageType.LOCAL_STORAGE,
        ...config,
      };
  
      this.tokenStorageType = this.config.tokenStorageType;
      this.instance = axios.create(this.config);
      this.setupInterceptors();
    }
  
    private async setupInterceptors() {
      this.instance.interceptors.request.use(
        async (config) => {
          if (this.config.cache === false) {
            config.params = {
              ...config.params,
              _t: Date.now(),
            };
          }
  
          if (config.data instanceof FormData) {
            config.headers["Content-Type"] = "multipart/form-data";
          }
  
          try {
            const token = await this.getAuthToken();
            if (token) {
              config.headers["Authorization"] = `Bearer ${token}`;
            }
          } catch (error) {
            console.error("Token retrieval error:", error);
          }
  
          config.headers["X-Request-ID"] = this.generateRequestId();
          config.headers["X-Custom-Header"] = "EnhancedAxios";
  
          return config;
        },
        (error) => Promise.reject(error)
      );
  
      this.instance.interceptors.response.use(
        (response) => {
          this.logResponse(response);
          return response;
        },
        async (error: AxiosError) => {
          const originalRequest = error.config;
  
          if (error.response?.status === 401) {
            await this.handleUnauthorized();
          }
  
          if (this.shouldRetry(error)) {
            return this.retryRequestWithDelay(originalRequest);
          }
  
          this.handleError(error);
          return Promise.reject(error);
        }
      );
    }
  
    // HTTP Methods
    public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
      return this.enqueueRequest(() => this.getWithCache<T>(url, config));
    }
  
    public async post<T = any, D = any>(
      url: string,
      data?: D,
      config?: AxiosRequestConfig
    ): Promise<T> {
      return this.enqueueRequest(() => this.instance.post<T>(url, data, config).then((res) => res.data));
    }
  
    public async put<T = any, D = any>(
      url: string,
      data?: D,
      config?: AxiosRequestConfig
    ): Promise<T> {
      return this.enqueueRequest(() => this.instance.put<T>(url, data, config).then((res) => res.data));
    }
  
    public async delete<T = any>(
      url: string,
      config?: AxiosRequestConfig
    ): Promise<T> {
      return this.enqueueRequest(() => this.instance.delete<T>(url, config).then((res) => res.data));
    }
  
    public async upload<T = any>(
      url: string,
      file: File | Blob,
      additionalData?: Record<string, any>
    ): Promise<T> {
      const formData = new FormData();
      formData.append("file", file);
  
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }
  
      return this.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
  
    // Token Management
    private async getAuthToken(): Promise<string | null> {
      return TokenStorage.getToken({ type: this.tokenStorageType });
    }
  
    private async handleUnauthorized(): Promise<void> {
      await TokenStorage.removeToken({ type: this.tokenStorageType });
    }
  
    // Retry Logic
    private shouldRetry(error: AxiosError): boolean {
      const retryCount = (error.config as any).__retryCount || 0;
      return (
        retryCount < (this.config.retryCount || 3) &&
        (error.response?.status === 500 || error.response?.status === 503)
      );
    }
  
    private async retryRequestWithDelay(originalRequest: AxiosRequestConfig): Promise<AxiosResponse> {
      const retryCount = ((originalRequest as any).__retryCount || 0) + 1;
      (originalRequest as any).__retryCount = retryCount;
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
  
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.instance(originalRequest);
    }
  
    // Caching
    private async getWithCache<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
      const cacheKey = `${url}-${JSON.stringify(config?.params)}`;
      if (this.config.cache && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
  
      const response = await this.instance.get<T>(url, config);
      if (this.config.cache) {
        this.cache.set(cacheKey, response.data);
      }
  
      return response.data;
    }
  
    // Rate Limiting
    private enqueueRequest(request: () => Promise<any>): Promise<any> {
      return new Promise((resolve, reject) => {
        this.requestQueue.push(async () => {
          try {
            resolve(await request());
          } catch (error) {
            reject(error);
          }
        });
        this.processQueue();
      });
    }
  
    private async processQueue(): Promise<void> {
      if (this.isProcessingQueue || this.requestQueue.length === 0) return;
  
      this.isProcessingQueue = true;
  
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) await nextRequest();
  
      this.isProcessingQueue = false;
      this.processQueue();
    }
  
    // Utilities
    private generateRequestId(): string {
      return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
      );
    }
  
    private logResponse(response: AxiosResponse): void {
      console.log(
        `[${new Date().toISOString()}] ${response.config.method?.toUpperCase()} ${response.config.url}`,
        {
          status: response.status,
          data: response.data,
        }
      );
    }
  
    private handleError(error: AxiosError): void {
      const status = error.response?.status;
      const errorMessages: Record<number, string> = {
        400: "Bad Request - Check your input",
        401: "Unauthorized - Please log in",
        403: "Forbidden - You don't have access",
        404: "Not Found - Resource not found",
        500: "Internal Server Error - Try again later",
      };
  
      const customMessage = errorMessages[status!] || "An unexpected error occurred";
  
      console.error("EnhancedAxios Error:", {
        message: error.message,
        customMessage,
        status,
        data: error.response?.data,
      });
    }
  
    public setTokenStorageType(type: StorageType): void {
      this.tokenStorageType = type;
    }
  
    public async saveToken(token: string, storageType?: StorageType): Promise<void> {
      await TokenStorage.setToken(token, {
        type: storageType || this.tokenStorageType,
      });
    }
  
    public async removeToken(): Promise<void> {
      await TokenStorage.removeToken({ type: this.tokenStorageType });
    }
  }
  
  export const createEnhancedAxios = (config?: EnhancedAxiosConfig) => {
    return new EnhancedAxios(config);
  };
  