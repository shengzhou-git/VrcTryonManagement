'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Lock, Mail, Package } from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { signIn } from '@/lib/cognito-auth'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await signIn(email.trim(), password)
      router.push('/gallery')
    } catch (err: any) {
      setError(err?.message || t.login.signInFailed)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-slate-900">{t.common.appName}</h1>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t.login.title}</h2>
          <p className="text-slate-600 mb-6">{t.login.subtitle}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t.login.emailLabel}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  placeholder={t.login.emailPlaceholder}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t.login.passwordLabel}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  placeholder={t.login.passwordPlaceholder}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                  title={showPassword ? t.login.hidePassword : t.login.showPassword}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium disabled:opacity-50"
            >
              {isLoading ? t.login.signingIn : t.login.signIn}
            </button>
          </form>

          <div className="mt-6 text-sm text-slate-600 flex justify-between">
            <Link href="/" className="hover:text-slate-900">{t.login.backHome}</Link>
            <Link href="/account" className="hover:text-slate-900">{t.login.changePassword}</Link>
          </div>
        </div>
      </main>
    </div>
  )
}


