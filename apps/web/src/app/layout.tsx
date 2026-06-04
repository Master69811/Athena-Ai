import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'Athena AI — Your Elite AI Fitness Coach',
    template: '%s | Athena AI',
  },
  description: 'The world\'s most advanced AI fitness platform. Personalized training, nutrition, and recovery — powered by cutting-edge AI.',
  keywords: ['fitness', 'AI coach', 'workout', 'nutrition', 'hypertrophy', 'strength training'],
  themeColor: '#6366f1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
