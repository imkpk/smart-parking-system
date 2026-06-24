import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { PlanLimitProvider } from './providers/PlanLimitProvider';
import { SlowRequestProvider } from './providers/SlowRequestProvider';
import { TenantBrandingProvider } from './providers/TenantBrandingProvider';
import { ThemeModeProvider } from './providers/ThemeModeProvider';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <AuthProvider>
          <PlanLimitProvider>
            <SlowRequestProvider>
              <TenantBrandingProvider>
                <RouterProvider router={router} />
              </TenantBrandingProvider>
            </SlowRequestProvider>
          </PlanLimitProvider>
        </AuthProvider>
      </ThemeModeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
