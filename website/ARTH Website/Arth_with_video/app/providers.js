'use client'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/components/site/AuthProvider'

export function Providers({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}
