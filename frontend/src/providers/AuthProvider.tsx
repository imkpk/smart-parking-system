import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { getCurrentUser, login, register } from '../api/authApi';
import { tokenStorage } from '../lib/tokenStorage';
import {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from '../types/auth';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthResponse>;
  register: (payload: RegisterPayload) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => tokenStorage.get());

  const currentUserQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
    enabled: Boolean(token),
  });

  const persistAuth = useCallback(
    (authResponse: AuthResponse) => {
      tokenStorage.set(authResponse.accessToken);
      setToken(authResponse.accessToken);
      queryClient.setQueryData(['auth', 'me'], authResponse.user);
      return authResponse;
    },
    [queryClient],
  );

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: persistAuth,
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: persistAuth,
  });

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
    queryClient.removeQueries({ queryKey: ['auth'] });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: currentUserQuery.data ?? null,
      token,
      isAuthenticated: Boolean(token && currentUserQuery.data),
      isLoading: Boolean(token && currentUserQuery.isLoading),
      login: loginMutation.mutateAsync,
      register: registerMutation.mutateAsync,
      logout,
    }),
    [
      currentUserQuery.data,
      currentUserQuery.isLoading,
      loginMutation.mutateAsync,
      logout,
      registerMutation.mutateAsync,
      token,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
