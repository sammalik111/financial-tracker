import type { Metadata } from 'next';
import './globals.css';
import { SideNav } from '@/components/ui/SideNav';

export const metadata: Metadata = {
  title: { default: 'FinTrack', template: '%s · FinTrack' },
  description: 'Personal financial tracker — built on Next.js + AWS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body style={{ display: 'flex', minHeight: '100vh' }}>
        <SideNav />
        <main style={{ flex: 1, minWidth: 0, padding: '40px 40px 40px 32px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
