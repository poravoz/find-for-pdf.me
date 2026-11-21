
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
  } from 'react';
  
  import {
    getCurrentUser,
    logoutUser,
  } from '../api/authentication.api';
  
  import type { User } from '../types/authentication.types';
  import type { AuthContextType } from '../types/authentication.types';

  const AuthContext = createContext<AuthContextType | undefined>(
    undefined,
  );
  
  interface AuthProviderProps {
    children: ReactNode;
  }
  
  export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
  
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
  
    const logout = async () => {
      try {
        await logoutUser();
      } finally {
        setUser(null);
      }
    };
  
    useEffect(() => {
      checkAuth();
    }, []);
  
    return (
      <AuthContext.Provider
        value={{
          user,
          isLoading,
          isAuthenticated: !!user,
          logout,
          checkAuth,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }
  
  export function useAuth() {
    const context = useContext(AuthContext);
  
    if (!context) {
      throw new Error(
        'useAuth must be used inside AuthProvider',
      );
    }
  
    return context;
  }
  