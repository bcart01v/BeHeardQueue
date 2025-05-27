import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/AuthContext";
import HeaderWrapper from "./components/HeaderWrapper";
import { headers } from 'next/headers';
import Notifications from './components/Notifications';
import { ThemeProvider } from './context/ThemeContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BeHeard Queue",
  description: "The appointment scheduling system for mobile service providers",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const xInvokePath = headersList.get('x-invoke-path');
  const pathname = xInvokePath !== null ? xInvokePath : '';
  const isTVDisplay = pathname.startsWith('/tv-display');

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          async
          defer
        />
      </head>
      <body className={isTVDisplay ? "bg-white" : "bg-[#1e1b1b] text-white"}>
        <ThemeProvider>
          <AuthProvider>
            {!isTVDisplay && <HeaderWrapper />}
            <main className={isTVDisplay ? "" : "min-h-screen"}>
              <Notifications />
              {children}
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
