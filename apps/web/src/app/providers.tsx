'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5min: dashboard data (workouts, recovery) stable enough
          gcTime: 10 * 60 * 1000,   // 10min: keep unused queries cached
          retry: (failureCount, error: any) => {
            // Don't retry 401/403/404, retry others with backoff
            if (error?.status === 401 || error?.status === 403 || error?.status === 404) return false;
            return failureCount < 2; // Max 2 retries
          },
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff: 1s, 2s, 4s...
          refetchOnWindowFocus: false, // No aggressive refetch, rely on stale time
          refetchOnReconnect: true,    // Refetch when reconnecting to network
        },
        mutations: {
          retry: 1,
        },
      },
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(240 10% 10%)',
              border: '1px solid hsl(240 8% 14%)',
              color: 'hsl(0 0% 98%)',
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
