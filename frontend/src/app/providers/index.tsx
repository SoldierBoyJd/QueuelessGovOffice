import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useDemoStore } from '../../stores/demoStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function WsSimBoot() {
  const startWsSim = useDemoStore((s) => s.startWsSim);
  useEffect(() => { startWsSim(); }, [startWsSim]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <WsSimBoot />
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
}
