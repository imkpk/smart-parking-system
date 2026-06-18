import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getCurrentUser, login, register } from '../api/authApi';
import { tokenStorage } from '../lib/tokenStorage';
import {
  AuthResponse,
  LoginPayload,
  OrganizationSummary,
  RegisterPayload,
  User,
} from '../types/auth';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  organizationId: number | null;
  organization: OrganizationSummary | null;
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

  useEffect(() => {
    window.addEventListener('smart-parking:unauthorized', logout);

    return () => {
      window.removeEventListener('smart-parking:unauthorized', logout);
    };
  }, [logout]);

  const user = currentUserQuery.data ?? null;
  const organizationId = user?.organizationId ?? null;
  const organization = user?.organization ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      organizationId,
      organization,
      isAuthenticated: Boolean(token && user),
      isLoading: Boolean(token && currentUserQuery.isLoading),
      login: loginMutation.mutateAsync,
      register: registerMutation.mutateAsync,
      logout,
    }),
    [
      currentUserQuery.isLoading,
      loginMutation.mutateAsync,
      logout,
      organization,
      organizationId,
      registerMutation.mutateAsync,
      token,
      user,
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