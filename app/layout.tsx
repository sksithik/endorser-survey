import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EndorseGen - Authentic Video Testimonials',
  description:
    'Create authentic video endorsements or AI-generated testimonial videos for businesses.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark">
      <body className={`${inter.className}`}>
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
