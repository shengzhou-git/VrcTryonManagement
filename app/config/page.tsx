'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Braces, UploadCloud, FileJson, ExternalLink, AlertCircle, CheckCircle2, Download } from 'lucide-react'
import AppNav from '@/components/AppNav'
import { authCheck, hasGroup, type CognitoUserInfo } from '@/lib/cognito-auth'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { BrandItem } from '@/lib/api'

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'success'; key: string; url?: string }
  | { status: 'error'; message: string }

type GenderMapState =
  | { status: 'idle' }
  | { status: 'downloading' }
  | { status: 'success'; key: string; url: string }
  | { status: 'error'; message: string }

export default function ConfigPage() {
  const router = useRouter()
  const { t } = useLanguage()

  const [userinfo, setUserinfo] = useState<CognitoUserInfo | null>(null)
  const [brands, setBrands] = useState<BrandItem[]>([])
  const [selectedBrandKey, setSelectedBrandKey] = useState<string>('') // `${userId}::${brandId}`
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const [genderMapState, setGenderMapState] = useState<GenderMapState>({ status: 'idle' })
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const isSuperAdmin = hasGroup(userinfo, 'SuperAdmin')

  const selectedBrand = useMemo(() => {
    const raw = String(selectedBrandKey || '')
    const i = raw.indexOf('::')
    if (i < 0) return { userId: '', brandId: '' }
    return { userId: raw.slice(0, i), brandId: raw.slice(i + 2) }
  }, [selectedBrandKey])

  const selectedBrandId = selectedBrand.brandId
  const selectedBrandUserId = selectedBrand.userId

  const canSubmit = useMemo(() => {
    return isSuperAdmin && !!file && !!selectedBrandId && state.status !== 'uploading'
  }, [isSuperAdmin, file, selectedBrandId, state.status])

  useEffect(() => {
    ;(async () => {
      const { token, userinfo } = await authCheck()
      if (!token) {
        router.push('/login')
        return
      }
      if (!hasGroup(userinfo, 'SuperAdmin')) {
        router.push('/gallery')
        return
      }
      setUserinfo(userinfo)

      // 加载全局品牌列表（SuperAdmin）
      try {
        const { listAllBrandsForSuperAdmin } = await import('@/lib/api')
        const list = await listAllBrandsForSuperAdmin()
        setBrands(list)
      } catch (e) {
        console.error('Failed to load brands:', e)
      }
    })()
  }, [router])

  const onPick = (f: File | null) => {
    setState({ status: 'idle' })
    if (!f) {
      setFile(null)
      return
    }
    const name = (f.name || '').toLowerCase()
    if (!name.endsWith('.json')) {
      setState({ status: 'error', message: '仅支持 .json 文件' })
      setFile(null)
      return
    }
    if (f.size > 2 * 1024 * 1024) {
      setState({ status: 'error', message: '文件过大（最大 2MB）' })
      setFile(null)
      return
    }
    setFile(f)
  }

  const onUpload = async () => {
    if (!file) return
    if (!selectedBrandId) {
      setState({ status: 'error', message: '请先选择品牌' })
      return
    }
    setState({ status: 'uploading', progress: 1 })
    try {
      const { uploadBrandConfigJson } = await import('@/lib/api')
      const res = await uploadBrandConfigJson({ brandId: selectedBrandId }, file, {
        onProgress: (p) => setState({ status: 'uploading', progress: p }),
      })
      setState({ status: 'success', key: res.key, url: res.url })
    } catch (e) {
      const msg = e instanceof Error ? e.message : '上传失败'
      setState({ status: 'error', message: msg })
    }
  }

  const onDownloadGenderMap = async () => {
    if (!selectedBrandId || !selectedBrandUserId) {
      setGenderMapState({ status: 'error', message: '请先选择品牌' })
      return
    }
    setGenderMapState({ status: 'downloading' })
    try {
      const { downloadGenderMapJsonForSuperAdmin } = await import('@/lib/api')
      const res = await downloadGenderMapJsonForSuperAdmin({ userId: selectedBrandUserId, brandId: selectedBrandId })
      setGenderMapState({ status: 'success', key: res.key, url: res.url })
      // 触发下载（配合后端预签名 URL 的 Content-Disposition: attachment）
      const a = document.createElement('a')
      a.href = res.url
      a.rel = 'noreferrer'
      a.target = '_self'
      a.download = 'gender-map.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '下载失败'
      setGenderMapState({ status: 'error', message: msg })
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppNav
        userinfo={userinfo}
        rightExtra={
          <Link
            href="/gallery"
            className="hidden sm:inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors px-2 py-2 rounded-lg hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t.common.back}</span>
          </Link>
        }
      />

      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
                <Braces className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">品牌配置（JSON）</h2>
                <p className="text-slate-600 text-sm">
                  仅 SuperAdmin 可操作。选择一个品牌（BrandId），将 JSON 上传到同桶的该 BrandId 目录下。
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-xs font-semibold text-slate-500 mb-2">选择品牌（BrandName / BrandId）</div>
                  <select
                    value={selectedBrandKey}
                    onChange={(e) => {
                      setSelectedBrandKey(e.target.value)
                      setState({ status: 'idle' })
                      setGenderMapState({ status: 'idle' })
                    }}
                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white text-slate-900"
                  >
                    <option value="">请选择…</option>
                    {brands.map((b) => (
                      <option key={`${b.userId}::${b.brandId}`} value={`${b.userId}::${b.brandId}`}>
                        {b.brandName} ({b.brandId})
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-slate-500 mt-2">
                    共 {brands.length} 个品牌
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-xs font-semibold text-slate-500 mb-1">上传目标</div>
                  <div className="text-sm text-slate-900">
                    <span className="font-mono">
                      {selectedBrandId
                        ? `${selectedBrandId}/config/${file ? file.name : '...'}`
                        : '请先选择品牌'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div
                className={[
                  'rounded-2xl border-2 border-dashed p-8 transition-colors',
                  dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50',
                ].join(' ')}
                onDragEnter={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragging(true)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragging(false)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragging(false)
                  const f = e.dataTransfer.files?.[0] || null
                  onPick(f)
                }}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                    {file ? <FileJson className="w-7 h-7 text-indigo-600" /> : <UploadCloud className="w-7 h-7 text-slate-500" />}
                  </div>
                  <div className="text-slate-900 font-semibold">
                    {file ? file.name : '拖拽 JSON 文件到这里'}
                  </div>
                  <div className="text-sm text-slate-600">
                    支持单个 <span className="font-mono">.json</span>，最大 2MB
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(e) => onPick(e.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      选择文件
                    </button>
                    <button
                      type="button"
                      disabled={!canSubmit}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                      onClick={onUpload}
                    >
                      上传配置
                    </button>
                  </div>
                </div>
              </div>

              {/* 状态区 */}
              <div className="mt-5">
                {state.status === 'uploading' && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-slate-900">上传中…</div>
                      <div className="text-sm text-slate-600">{state.progress}%</div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-2 bg-gradient-to-r from-indigo-500 to-fuchsia-600"
                        style={{ width: `${Math.max(1, Math.min(100, state.progress))}%` }}
                      />
                    </div>
                  </div>
                )}

                {state.status === 'success' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-semibold">上传成功</div>
                        <div className="text-sm text-emerald-800 mt-1 break-all">
                          Key：<span className="font-mono">{state.key}</span>
                        </div>
                        {state.url && (
                          <a
                            href={state.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 mt-3 text-sm font-semibold text-emerald-900 hover:underline"
                          >
                            打开查看 <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {state.status === 'error' && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-semibold">上传失败</div>
                        <div className="text-sm text-red-800 mt-1">{state.message}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* gender-map.json 下载区 */}
            <div className="border-t border-slate-100 p-6 bg-slate-50/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-900">性别映射（gender-map.json）</div>
                  <div className="text-sm text-slate-600 mt-1">
                    仅 SuperAdmin 可下载。文件位于 <span className="font-mono">{'{userId}/{brandId}/gender-map.json'}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    当前目标：{' '}
                    <span className="font-mono">
                      {selectedBrandId && selectedBrandUserId ? `${selectedBrandUserId}/${selectedBrandId}/gender-map.json` : '请先选择品牌'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!isSuperAdmin || !selectedBrandId || !selectedBrandUserId || genderMapState.status === 'downloading'}
                  onClick={onDownloadGenderMap}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                >
                  <Download className="w-4 h-4" />
                  {genderMapState.status === 'downloading' ? '下载中…' : '下载 JSON'}
                </button>
              </div>

              <div className="mt-4">
                {genderMapState.status === 'success' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-semibold">已生成下载链接</div>
                        <div className="text-sm text-emerald-800 mt-1 break-all">
                          Key：<span className="font-mono">{genderMapState.key}</span>
                        </div>
                        <a
                          href={genderMapState.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 mt-3 text-sm font-semibold text-emerald-900 hover:underline"
                        >
                          打开下载 <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {genderMapState.status === 'error' && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-semibold">下载失败</div>
                        <div className="text-sm text-red-800 mt-1">{genderMapState.message}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


