export interface RegisterData {
    name: string;
    email: string;
    password: string;
}
  
export interface LoginData {
    email: string;
    password: string;
}
  
export interface VerifyEmailData {
    email: string;
    code: string;
}
  
export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    isEmailVerified: boolean;
}

export interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe: boolean;
}