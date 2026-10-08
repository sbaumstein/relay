import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

// Variable font, so 550 is a real weight rather than a synthesised one.
const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Relay — Pass Your Spot',
  description: 'Can\'t make it to class? Pass your spot to someone who can.',
  // Tells iOS to launch an installed Relay without Safari's chrome.
  appleWebApp: {
    capable: true,
    title: 'Relay',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  // viewport-fit=cover so the black background reaches under the notch.
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    /* suppressHydrationWarning: browser extensions (Bitdefender, Grammarly, …)
       inject attributes onto html/body before React hydrates. */
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${outfit.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
