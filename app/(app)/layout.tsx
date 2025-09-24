// app/(app)/layout.tsx
import '@/app/globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Fact',
  description: 'Sistema verificador de DTEs',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} h-screen overflow-hidden`}>
        <ErrorBoundary>
          <AppShell>{children}</AppShell>
        </ErrorBoundary>
      </body>
    </html>
  );
}
