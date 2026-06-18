import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect } from 'vitest';
import { render, screen, type RenderOptions, within } from '@testing-library/react';
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