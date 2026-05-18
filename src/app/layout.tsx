import type { Metadata, Viewport } from 'next'
import { DM_Mono, DM_Sans, Plus_Jakarta_Sans } from 'next/font/google'

import { AuthErrorHashHandler } from '@/components/providers/AuthErrorHashHandler'
import { ServiceWorkerRegistrar } from '@/components/providers/ServiceWorkerRegistrar'
import { SessionProvider } from '@/components/providers/SessionProvider'

import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Pantry Run',
  description: 'A real-time collaborative shopping list for households.',
  manifest: '/manifest.json',
  applicationName: 'Pantry Run',
  appleWebApp: {
    capable: true,
    title: 'Pantry Run',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F6F3' },
    { media: '(prefers-color-scheme: dark)', color: '#18181A' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

// Inline script that runs before React hydrates — reads the persisted theme
// from localStorage and sets data-theme on <html> so painted colours match
// the user's saved preference instead of flashing the default light theme.
// Kept minified inline because anything async would defeat the purpose.
const THEME_PRE_HYDRATION_SCRIPT = `(function(){try{var t=localStorage.getItem('pantry-run:theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`

// Captures Supabase auth error hash fragments synchronously, before React
// hydrates and before any cached app bundle runs (a service-worker-served
// page can be slow to wire up its handlers). The hash is moved into
// sessionStorage and stripped from the URL so a refresh doesn't re-fire
// and the error doesn't leak via copy/paste; AuthErrorHashHandler reads
// from sessionStorage when it mounts.
const AUTH_ERROR_HASH_CAPTURE_SCRIPT = `(function(){try{var h=window.location.hash;if(h&&h.indexOf('error=')!==-1){sessionStorage.setItem('pantry-run:auth-error-hash',h);window.history.replaceState(null,'',window.location.pathname+window.location.search);}}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_PRE_HYDRATION_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: AUTH_ERROR_HASH_CAPTURE_SCRIPT }} />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        <SessionProvider>{children}</SessionProvider>
        <AuthErrorHashHandler />
      </body>
    </html>
  )
}
