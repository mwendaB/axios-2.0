import Cookies from 'js-cookie';
import localforage from 'localforage';

// Storage Types Enum
export enum StorageType {
  LOCAL_STORAGE = 'localStorage',
  SESSION_STORAGE = 'sessionStorage',
  COOKIES = 'cookies',
  VUEX = 'vuex',
  IN_MEMORY = 'inMemory',
  INDEXED_DB = 'indexedDB',
  NEXT_SERVER_SIDE = 'nextServerSide',
  NEXT_HTTP_ONLY = 'nextHttpOnly'
}

// Token Storage Interface
export interface TokenStorageOptions {
  type?: StorageType;
  key?: string;
  expires?: number; // in days
  secure?: boolean;
  httpOnly?: boolean;
}

// Vuex Store Interface (generic to work with different Vuex implementations)
interface VuexStore {
  commit: (mutation: string, payload: any) => void;
  state: any;
}

// In-Memory Storage Class
class InMemoryStorage {
  private static instance: InMemoryStorage;
  private storage: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): InMemoryStorage {
    if (!InMemoryStorage.instance) {
      InMemoryStorage.instance = new InMemoryStorage();
    }
    return InMemoryStorage.instance;
  }

  set(key: string, value: any): void {
    this.storage.set(key, value);
  }

  get(key: string): any {
    return this.storage.get(key);
  }

  remove(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

// Universal Token Storage Class
export class TokenStorage {
  private static DEFAULT_KEY = 'auth_token';
  private static VUEX_MUTATION = 'SET_AUTH_TOKEN';

  // Static method to configure IndexedDB
  private static configureIndexedDB() {
    localforage.config({
      name: 'AuthTokenStorage',
      version: 1.0,
      storeName: 'tokens',
      description: 'Storage for authentication tokens'
    });
  }

  // Token Storage Methods
  static async setToken(
    token: string, 
    options: TokenStorageOptions = {}
  ): Promise<void> {
    const {
      type = StorageType.LOCAL_STORAGE,
      key = this.DEFAULT_KEY,
      expires = 7,
      secure = true,
      httpOnly = false
    } = options;

    try {
      switch (type) {
        case StorageType.LOCAL_STORAGE:
          localStorage.setItem(key, token);
          break;
        
        case StorageType.SESSION_STORAGE:
          sessionStorage.setItem(key, token);
          break;
        
        case StorageType.COOKIES:
          Cookies.set(key, token, { 
            expires,
            secure,
            sameSite: 'strict'
          });
          break;
        
        case StorageType.VUEX:
          // Requires passing Vuex store instance
          throw new Error('Vuex storage requires store instance');
        
        case StorageType.IN_MEMORY:
          InMemoryStorage.getInstance().set(key, token);
          break;
        
        case StorageType.INDEXED_DB:
          this.configureIndexedDB();
          await localforage.setItem(key, token);
          break;
        
        case StorageType.NEXT_SERVER_SIDE:
          // Placeholder for Next.js server-side storage
          console.warn('Implement server-side storage logic');
          break;
        
        case StorageType.NEXT_HTTP_ONLY:
          // Placeholder for Next.js HTTP-Only Cookies
          console.warn('Implement HTTP-Only Cookie storage');
          break;
        
        default:
          throw new Error('Unsupported storage type');
      }
    } catch (error) {
      console.error('Token storage error:', error);
      throw error;
    }
  }

  // Retrieve Token Methods
  static async getToken(
    options: TokenStorageOptions = {}
  ): Promise<string | null> {
    const {
      type = StorageType.LOCAL_STORAGE,
      key = this.DEFAULT_KEY
    } = options;

    try {
      switch (type) {
        case StorageType.LOCAL_STORAGE:
          return localStorage.getItem(key);
        
        case StorageType.SESSION_STORAGE:
          return sessionStorage.getItem(key);
        
        case StorageType.COOKIES:
          return Cookies.get(key) || null;
        
        case StorageType.VUEX:
          // Requires passing Vuex store instance
          throw new Error('Vuex storage requires store instance');
        
        case StorageType.IN_MEMORY:
          return InMemoryStorage.getInstance().get(key);
        
        case StorageType.INDEXED_DB:
          this.configureIndexedDB();
          return await localforage.getItem(key);
        
        case StorageType.NEXT_SERVER_SIDE:
          // Placeholder for Next.js server-side storage retrieval
          console.warn('Implement server-side storage retrieval');
          return null;
        
        case StorageType.NEXT_HTTP_ONLY:
          // Placeholder for Next.js HTTP-Only Cookies retrieval
          console.warn('Implement HTTP-Only Cookie retrieval');
          return null;
        
        default:
          throw new Error('Unsupported storage type');
      }
    } catch (error) {
      console.error('Token retrieval error:', error);
      return null;
    }
  }

  // Remove Token Methods
  static async removeToken(
    options: TokenStorageOptions = {}
  ): Promise<void> {
    const {
      type = StorageType.LOCAL_STORAGE,
      key = this.DEFAULT_KEY
    } = options;

    try {
      switch (type) {
        case StorageType.LOCAL_STORAGE:
          localStorage.removeItem(key);
          break;
        
        case StorageType.SESSION_STORAGE:
          sessionStorage.removeItem(key);
          break;
        
        case StorageType.COOKIES:
          Cookies.remove(key);
          break;
        
        case StorageType.VUEX:
          // Requires passing Vuex store instance
          throw new Error('Vuex storage requires store instance');
        
        case StorageType.IN_MEMORY:
          InMemoryStorage.getInstance().remove(key);
          break;
        
        case StorageType.INDEXED_DB:
          this.configureIndexedDB();
          await localforage.removeItem(key);
          break;
        
        case StorageType.NEXT_SERVER_SIDE:
          // Placeholder for Next.js server-side storage removal
          console.warn('Implement server-side storage removal');
          break;
        
        case StorageType.NEXT_HTTP_ONLY:
          // Placeholder for Next.js HTTP-Only Cookies removal
          console.warn('Implement HTTP-Only Cookie removal');
          break;
        
        default:
          throw new Error('Unsupported storage type');
      }
    } catch (error) {
      console.error('Token removal error:', error);
      throw error;
    }
  }

  // Vuex-specific methods
  static setVuexToken(
    store: VuexStore, 
    token: string, 
    key: string = this.DEFAULT_KEY
  ): void {
    store.commit(this.VUEX_MUTATION, { [key]: token });
  }

  // Next.js Server-Side Storage Utilities
  static nextServerSideStorage = {
    async set(token: string, context: any) {
      // Implement server-side storage for Next.js
      // This is a placeholder and needs to be implemented based on specific Next.js setup
      console.warn('Implement Next.js server-side token storage');
    },
    
    async get(context: any) {
      // Retrieve token from server-side storage
      console.warn('Implement Next.js server-side token retrieval');
      return null;
    }
  };

  // Next.js HTTP-Only Cookies Utilities
  static nextHttpOnlyCookies = {
    async set(token: string, context: any) {
      // Implement HTTP-Only Cookie storage for Next.js
      // This typically involves setting cookies in API routes or getServerSideProps
      console.warn('Implement Next.js HTTP-Only Cookie storage');
    },
    
    async get(context: any) {
      // Retrieve HTTP-Only Cookie
      console.warn('Implement Next.js HTTP-Only Cookie retrieval');
      return null;
    }
  };
}

// Example Usage
export function setupTokenStorage() {
  // Local Storage
  TokenStorage.setToken('my-token', { 
    type: StorageType.LOCAL_STORAGE 
  });

  // Cookies
  TokenStorage.setToken('my-token', { 
    type: StorageType.COOKIES,
    expires: 14,
    secure: true
  });

  // In-Memory
  TokenStorage.setToken('my-token', { 
    type: StorageType.IN_MEMORY 
  });

  // Retrieve Token
  TokenStorage.getToken({ 
    type: StorageType.LOCAL_STORAGE 
  }).then(token => {
    console.log('Retrieved Token:', token);
  });
}

// Export for use in various contexts
export default TokenStorage;