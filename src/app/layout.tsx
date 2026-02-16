import type { Metadata } from 'next';
import './globals.css';
import { TopNav } from '@/components/ui/TopNav';

export const metadata: Metadata = {
  title: { default: 'JobSignal — Job Market Intelligence', template: '%s · JobSignal' },
  description: 'See which fields are underrepresented, where competition is low, and where you have the best shot.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <TopNav />
        <main style={{ maxWidth: '1320px', margin: '0 auto', padding: '36px 28px 80px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
