import type { Metadata } from 'next';
import { Outfit, Inter } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DHAVON — Personal AI OS',
  description: 'DHAVON Personal Intelligence Operating System — AI Observatory',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable} dark`}>
      <body className="min-h-screen bg-[#040508] text-white antialiased selection:bg-purple-500/30 selection:text-white font-sans overflow-hidden">
        {children}
      </body>
    </html>
  );
}
