import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Relay — Pass Your Spot',
  description: 'Can\'t make it to class? Pass your spot to someone who can.',
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
      <body className={`${geist.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
