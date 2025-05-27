"use client";

import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // This can be extended with other client-side providers like QueryClientProvider, ThemeProvider, etc.
  return <>{children}</>;
}
