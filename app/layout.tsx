import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title:       'BizOutreach – Găsește afaceri fără website',
  description: 'Automatizare outreach pentru afaceri locale din România care nu au website.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className="min-h-screen bg-slate-900">
        <Navbar />
        <main className="pt-14">{children}</main>
      </body>
    </html>
  )
}
