import type { Metadata, Viewport } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';

const siteUrl = 'https://cleanmycity.vercel.app';
const siteTitle = 'Clean My City — report a waste site';
const siteDescription =
  'Mark a waste site on the map with a photo, track it until it is cleaned, and help clean up your city. Free, no account needed.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Clean My City',
    title: siteTitle,
    description: siteDescription,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Clean My City' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/og-image.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}