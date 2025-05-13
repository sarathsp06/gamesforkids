import type {Metadata} from 'next';
import { Geist } from 'next/font/google'; // Correct import for Geist Sans
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Providers } from '@/components/providers';

const geistSans = Geist({ // Use Geist directly
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap', // Add display swap for better font loading
});

// Geist Mono is not explicitly requested, can be removed if not used by components.
// For now, keep it as it's part of the default scaffold.
const geistMono = Geist({ // Assuming Geist can also be used for mono, or import Geist_Mono
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '700'] // Example weights if needed
});


export const metadata: Metadata = {
  title: 'Letter Leap',
  description: 'Learn to type with fun, adaptive challenges!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
