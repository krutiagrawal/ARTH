'use client'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/components/site/AuthProvider'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <AuthProvider>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </AuthProvider>
    </ThemeProvider>
  )
}
