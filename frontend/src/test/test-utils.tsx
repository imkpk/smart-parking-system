import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { ThemeModeProvider } from '../providers/ThemeModeProvider';
import type { User } from '../types/auth';

export type RenderWithProvidersOptions = {
  route?: string;
  routerProps?: Omit<MemoryRouterProps, 'children'>;
  queryClient?: QueryClient;
} & Omit<RenderOptions, 'wrapper'>;

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    routerProps,
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: RenderWithProvidersOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeModeProvider>
          <MemoryRouter initialEntries={[route]} {...routerProps}>
            {children}
          </MemoryRouter>
        </ThemeModeProvider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Test User',
    email: 'user@example.com',
    phone: null,
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-06-18T00:00:00.000Z',
    updatedAt: '2026-06-18T00:00:00.000Z',
    ...overrides,
  };
}