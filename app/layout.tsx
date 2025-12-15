import type { Metadata } from 'next'
import { Inter, Noto_Sans_JP } from 'next/font/google'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const notoSansJP = Noto_Sans_JP({ subsets: ['latin'], weight: ['400', '500', '700'] })

export const metadata: Metadata = {
  title: '服装图片管理系统 - VRC Tryon',
  description: '专业的服装图片上传和管理平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} ${notoSansJP.className}`}>
        <LanguageProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  )
}

