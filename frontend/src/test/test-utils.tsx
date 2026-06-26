import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, vi } from 'vitest';
import { render, screen, type RenderOptions, within } from '@testing-library/react';
import { Component, ReactElement, ReactNode } from 'react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { createAppQueryClient } from '../lib/createAppQueryClient';
import { ThemeModeProvider } from '../providers/ThemeModeProvider';
import { TestThemeShell } from './TestThemeShell';
import type { OrganizationSummary, User } from '../types/auth';
import type { AuthContextValue } from '../providers/AuthProvider';

export type RenderWithProvidersOptions = {
  route?: string;
  routerProps?: Omit<MemoryRouterProps, 'children'>;
  queryClient?: QueryClient;
} & Omit<RenderOptions, 'wrapper'>;

export function createTestQueryClient() {
  const queryClient = createAppQueryClient();
  queryClient.setDefaultOptions({
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  });
  return queryClient;
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
          <TestThemeShell>
            <MemoryRouter initialEntries={[route]} {...routerProps}>
              {children}
            </MemoryRouter>
          </TestThemeShell>
        </ThemeModeProvider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

export function getDataGridRowContaining(text: string) {
  const cell = screen.getByText(text);
  const row = cell.closest('[role="row"]');

  if (!row) {
    throw new Error(`No data grid row found containing: ${text}`);
  }

  return row as HTMLElement;
}

export function getDataGridRowButtons(rowText: string) {
  return within(getDataGridRowContaining(rowText)).getAllByRole('button');
}

export function getDataGridRowButton(rowText: string, name: RegExp | string) {
  return within(getDataGridRowContaining(rowText)).getByRole('button', { name });
}

export async function selectMuiOption(
  user: { click: (element: Element) => Promise<void> },
  combobox: HTMLElement,
  optionName: RegExp | string,
) {
  await user.click(combobox);
  const option = await screen.findByRole('option', { name: optionName });
  await user.click(option);
}

export function expectMutationPayload(
  mockFn: { mock: { calls: unknown[][] } },
  expected: unknown,
) {
  expect(mockFn).toHaveBeenCalled();
  expect(mockFn.mock.calls[0]?.[0]).toEqual(expected);
}

export function createMockOrganization(
  overrides: Partial<OrganizationSummary> = {},
): OrganizationSummary {
  return {
    id: 1,
    name: 'Default Organization',
    slug: 'default-organization',
    ...overrides,
  };
}

export function createMockUser(overrides: Partial<User> = {}): User {
  const organizationId =
    overrides.organizationId !== undefined ? overrides.organizationId : 1;
  const organization =
    overrides.organization !== undefined
      ? overrides.organization
      : organizationId === null
        ? null
        : createMockOrganization({ id: organizationId });

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
    organizationId,
    organization,
  };
}

export function expectContextHookToThrow(
  useHook: () => unknown,
  expectedMessage: string,
) {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  class ErrorCatcher extends Component<
    { children: ReactNode },
    { message: string | null }
  > {
    state = { message: null as string | null };

    static getDerivedStateFromError(error: Error) {
      return { message: error.message };
    }

    render() {
      if (this.state.message) {
        return <span data-testid="hook-error">{this.state.message}</span>;
      }

      return this.props.children;
    }
  }

  function Probe() {
    useHook();
    return null;
  }

  render(
    <ErrorCatcher>
      <Probe />
    </ErrorCatcher>,
  );

  expect(screen.getByTestId('hook-error')).toHaveTextContent(expectedMessage);
  consoleError.mockRestore();
}

export function createMockAuthValue(
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  const user = overrides.user ?? createMockUser();

  return {
    user,
    token: user ? 'token' : null,
    organizationId: user?.organizationId ?? null,
    organization: user?.organization ?? null,
    isAuthenticated: Boolean(user),
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}