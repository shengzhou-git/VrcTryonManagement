/* eslint-disable react/no-unescaped-entities */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, Shield, Braces, Image as ImageIcon, Upload as UploadIcon, User as UserIcon } from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { hasGroup, type CognitoUserInfo } from '@/lib/cognito-auth'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Props = {
  userinfo?: CognitoUserInfo | null
  rightExtra?: React.ReactNode
}

function NavLink({
  href,
  active,
  icon,
  label,
}: {
  href: string
  active: boolean
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className={[
        'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-100'
          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
      ].join(' ')}
    >
      <span className="text-slate-500">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

export default function AppNav({ userinfo, rightExtra }: Props) {
  const { t } = useLanguage()
  const pathname = usePathname() || '/'

  const isSuperAdmin = hasGroup(userinfo || null, 'SuperAdmin')
  const canUpload = hasGroup(userinfo || null, 'Admin') || isSuperAdmin

  return (
    <nav className="bg-white/90 backdrop-blur shadow-sm border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Package className="w-8 h-8 text-primary-600 shrink-0" />
            <Link href="/" className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                {t.common.appName}
              </h1>
            </Link>

            {isSuperAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1.5 ml-2 rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-fuchsia-600 to-indigo-600 shadow-sm ring-1 ring-black/5">
                <Shield className="w-3.5 h-3.5" />
                SuperAdmin
              </span>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <NavLink href="/gallery" active={pathname.startsWith('/gallery')} icon={<ImageIcon className="w-4 h-4" />} label={t.common.gallery} />
            {canUpload && (
              <NavLink href="/upload" active={pathname.startsWith('/upload')} icon={<UploadIcon className="w-4 h-4" />} label={t.common.upload} />
            )}
            <NavLink href="/account" active={pathname.startsWith('/account')} icon={<UserIcon className="w-4 h-4" />} label="Account" />
            {isSuperAdmin && (
              <NavLink href="/config" active={pathname.startsWith('/config')} icon={<Braces className="w-4 h-4" />} label="品牌配置" />
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isSuperAdmin && (
              <Link
                href="/config"
                className="md:hidden inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 ring-1 ring-indigo-100"
                title="品牌配置(JSON)"
              >
                <Braces className="w-4 h-4" />
                配置
              </Link>
            )}
            {rightExtra}
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </nav>
  )
}


