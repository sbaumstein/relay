import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Workout Exchange — Trade Your Class Spot',
  description:
    'Can\'t make it to your workout class? List your spot so someone else can claim it. Avoid cancellation fees and help others get into sold-out classes.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
