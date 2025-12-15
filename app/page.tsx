'use client'

import Link from 'next/link'
import { Upload, Image as ImageIcon, Package } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function Home() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-slate-900">
                {t.common.appName}
              </h1>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              {t.home.welcome}
            </h2>
            <p className="text-xl text-slate-600">
              {t.home.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 animate-slide-up">
            {/* 上传卡片 */}
            <Link href="/upload">
              <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 cursor-pointer border-2 border-transparent hover:border-primary-500 hover:scale-105">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Upload className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {t.home.uploadCard.title}
                  </h3>
                  <p className="text-slate-600">
                    {t.home.uploadCard.description}
                  </p>
                </div>
              </div>
            </Link>

            {/* 浏览卡片 */}
            <Link href="/gallery">
              <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 cursor-pointer border-2 border-transparent hover:border-primary-500 hover:scale-105">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <ImageIcon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {t.home.galleryCard.title}
                  </h3>
                  <p className="text-slate-600">
                    {t.home.galleryCard.description}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-600">
          <p>{t.home.footer}</p>
        </div>
      </footer>
    </div>
  )
}
