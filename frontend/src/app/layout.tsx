// src/app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css" // ←  this imports global styles (animations, tailwind, etc.)

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import AuthSessionGuard from "@/components/AuthSessionGuard";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadataBase = new URL('https://journal.rri/');

export const metadata: Metadata = {
  title: {
    default: 'Technical Journal',
    template: '%s | Technical Journal',
  },
  description: 'Technical Journal is a peer-reviewed open access technical journal publishing research and innovation.',

  keywords: [
    'River Research Journal',
    'Technical Journal',
    'technical journal',
    'river research',
    'water innovation',
    'hydrology',
    'environmental engineering',
    'open access journal',
  ],
  authors: [{ name: 'Technical Journal' }],
  creator: 'Technical Journal',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: [
      { url: '/favicon_io/favicon.ico' },
      { url: '/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/favicon_io/apple-touch-icon.png',
    other: [
      { rel: 'manifest', url: '/favicon_io/site.webmanifest' },
    ],
  },
  manifest: '/favicon_io/site.webmanifest',
  openGraph: {
    title: 'Technical Journal',
    description: 'Peer-reviewed open access technical journal publishing research and innovation.',
    type: 'website',
    url: 'https://journal.rri/',
    siteName: 'Technical Journal',
    images: [
      {
        url: '/favicon_io/android-chrome-512x512.png',
        width: 512,
        height: 512,
        alt: 'Technical Journal logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Technical Journal',
    description: 'Peer-reviewed open access technical journal publishing research and innovation.',
    images: ['/favicon_io/android-chrome-512x512.png'],
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });`}
            </Script>
          </>
        )}

        <Script id="structured-data" type="application/ld+json" strategy="afterInteractive">
          {`{
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Technical Journal",
            "url": "https://journal.rri/",
            "description": "Technical Journal is a peer-reviewed open access technical journal publishing research and innovation.",
            "publisher": {
              "@type": "Organization",
              "name": "Technical Journal"
            }
          }`}
        </Script>

        <AuthSessionGuard />

        {/* Navbar - appears on ALL pages */}
        <Navbar />

        {/* Main content - different for each page */}
        <main className="min-h-screen">
          {children}
        </main>

        {/* Footer - appears on ALL pages */}
        <Footer />
      </body>
    </html>
  );
}