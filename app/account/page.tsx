'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KeyRound, Package, ArrowLeft, LogOut } from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { authCheck, changePassword, signOut } from '@/lib/cognito-auth'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function AccountPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { token } = await authCheck()
      if (!token) {
        router.push('/login')
        return
      }
      setIsLoading(false)
    })()
  }, [router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword !== confirmPassword) {
      setError('新密码与确认密码不一致')
      return
    }

    try {
      await changePassword(oldPassword, newPassword)
      setSuccess('密码修改成功')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err?.message || '密码修改失败')
    }
  }

  const onLogout = () => {
    signOut()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">{t.common.loading}</p>
      </div>
    )
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
            <div className="flex items-center space-x-3">
              <LanguageSwitcher />
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-6">
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">修改密码</h2>
            <Link href="/gallery" className="flex items-center space-x-2 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
              <span>{t.common.back}</span>
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">旧密码</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">新密码</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
            >
              更新密码
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}


