'use client'

import { useState, useCallback, ChangeEvent, DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react'
import { authCheck, hasGroup, type CognitoUserInfo } from '@/lib/cognito-auth'
import { useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import AppNav from '@/components/AppNav'
import type { BrandItem } from '@/lib/api'

interface UploadFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  id: string
}

export default function UploadPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [brandName, setBrandName] = useState('')
  const [brandMode, setBrandMode] = useState<'select' | 'new'>('new')
  const [brands, setBrands] = useState<BrandItem[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>('')
  const [isBrandLoading, setIsBrandLoading] = useState(false)
  const [gender, setGender] = useState<'F' | 'M' | null>(null)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [userinfo, setUserinfo] = useState<CognitoUserInfo | null>(null)

  useEffect(() => {
    ; (async () => {
      const { token, userinfo } = await authCheck()
      if (!token) {
        router.push('/login')
        return
      }
      // 允许 Admin / SuperAdmin 上传
      const ok = hasGroup(userinfo, 'Admin') || hasGroup(userinfo, 'SuperAdmin')
      if (!ok) {
        router.push('/gallery')
        return
      }
      setUserinfo(userinfo)
      setIsAuthReady(true)

      // 加载“当前用户”的品牌列表：有品牌就默认选择，无需重复输入
      try {
        setIsBrandLoading(true)
        const { listBrandsForCurrentUser } = await import('@/lib/api')
        const list = await listBrandsForCurrentUser()
        setBrands(list)

        if (list.length > 0) {
          const toTs = (s?: string | null) => {
            if (!s) return 0
            const n = Date.parse(String(s))
            return Number.isFinite(n) ? n : 0
          }
          const latest = [...list].sort((a, b) => {
            const at = toTs(a.updatedAt) || toTs(a.createdAt)
            const bt = toTs(b.updatedAt) || toTs(b.createdAt)
            if (bt !== at) return bt - at
            return Number(b.uploadCount || 0) - Number(a.uploadCount || 0)
          })[0]
          if (latest?.brandId && latest?.brandName) {
            setBrandMode('select')
            setSelectedBrandId(latest.brandId)
            setBrandName(latest.brandName)
          } else {
            setBrandMode('new')
          }
        } else {
          setBrandMode('new')
        }
      } catch (e) {
        console.error('Failed to load brands for current user:', e)
        // 拉取失败不阻塞上传：允许手动输入新品牌
        setBrandMode('new')
      } finally {
        setIsBrandLoading(false)
      }
    })()
  }, [router])

  // 处理文件选择（支持单文件和文件夹）
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const allowTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
    const allowExt = new Set(['.jpg', '.jpeg', '.png', '.webp'])
    const imageFiles = Array.from(selectedFiles).filter((file) => {
      if (allowTypes.has(file.type)) return true
      const name = (file.name || '').toLowerCase()
      const dot = name.lastIndexOf('.')
      const ext = dot >= 0 ? name.slice(dot) : ''
      return allowExt.has(ext)
    })

    if (imageFiles.length === 0) {
      alert(t.upload.noImagesFound)
      return
    }

    const newFiles: UploadFile[] = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
      progress: 0,
      id: Math.random().toString(36).substr(2, 9)
    }))

    setFiles(prev => [...prev, ...newFiles])

    // 提示用户添加了多少图片
    if (imageFiles.length > 1) {
      console.log(`${t.upload.imagesAdded.replace('{count}', imageFiles.length.toString())}`)
    }
  }, [])

  // 拖放处理
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  // 移除文件
  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }, [])

  // 上传处理
  const handleUpload = async () => {
    if (!brandName.trim()) {
      alert(t.upload.brandRequired)
      return
    }

    if (!gender) {
      alert(t.upload.genderRequired)
      return
    }

    if (files.length === 0) {
      alert(t.upload.filesRequired)
      return
    }

    setIsUploading(true)

    try {
      // 将所有文件标记为准备上传（pending -> uploading）
      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'uploading' as const,
        progress: 0
      })))

      // 调用真实的上传 API
      const { uploadImages } = await import('@/lib/api')

      // 准备文件列表
      const fileList = files.map(f => f.file)

      // 开始上传：实时回调每个文件的进度和状态
      const response = await uploadImages(brandName, fileList, {
        concurrency: 3, // 同时上传 3 个文件
        gender,
        onFileProgress: (e) => {
          setFiles((prev) => {
            // 通过 fileKey 或 fileName 找到对应的文件
            const byKeyIdx = e.fileKey
              ? prev.findIndex((x) => `${x.file.name}|${x.file.size}|${x.file.lastModified}` === e.fileKey)
              : -1
            const idx = byKeyIdx >= 0 ? byKeyIdx : prev.findIndex((x) => x.file.name === e.fileName)

            if (idx < 0) return prev // 找不到文件，不更新

            const next = [...prev]
            const cur = next[idx]

            // 错误状态
            if (e.status === 'error') {
              next[idx] = { ...cur, status: 'error', progress: 0 }
              console.error(`[Upload] ${e.fileName} failed:`, e.error)
              return next
            }

            // 完成状态
            if (e.phase === 'complete' && e.status === 'success') {
              next[idx] = { ...cur, status: 'success', progress: 100 }
              console.log(`[Upload] ${e.fileName} completed successfully`)
              return next
            }

            // 上传中：更新进度（0-99）
            const p = Math.max(0, Math.min(99, e.progress))
            next[idx] = { ...cur, status: 'uploading', progress: p }
            return next
          })
        },
      })

      // 上传完成后，不再批量更新状态（因为 onFileProgress 已经实时更新了）
      // 只需要确保所有文件都有最终状态
      setFiles(prev => prev.map(f => {
        // 如果文件还在 uploading 状态（可能是回调丢失），根据 response 更新
        if (f.status === 'uploading') {
          const result = response.results?.find(r => r.fileName === f.file.name)
          if (result) {
            return {
              ...f,
              status: result.success ? 'success' as const : 'error' as const,
              progress: result.success ? 100 : 0
            }
          }
        }
        return f // 保持 onFileProgress 设置的状态
      }))

      // 显示成功消息
      const successCount = response.summary?.success || 0
      const failedCount = response.summary?.failed || 0

      if (failedCount > 0) {
        alert(t.upload.uploadSuccess.replace('{success}', String(successCount)).replace('{failed}', String(failedCount)))
      } else {
        alert(t.upload.uploadSuccess.replace('{success}', String(successCount)).replace('{failed}', '0'))
      }

      // 延迟跳转到图片一览页面（给用户时间看到最终状态）
      setTimeout(() => {
        router.push('/gallery')
      }, 2000)

    } catch (error) {
      console.error('Upload error:', error)

      // 只将还在 uploading 状态的文件标记为失败
      setFiles(prev => prev.map(f => {
        if (f.status === 'uploading') {
          return { ...f, status: 'error' as const, progress: 0 }
        }
        return f // 保持已经成功或失败的状态
      }))

      alert(`${t.upload.uploadFailed}：${error instanceof Error ? error.message : t.upload.unknownError}`)
    } finally {
      setIsUploading(false)
      // 每次上传结束后必须重新选择性别
      setGender(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppNav
        userinfo={userinfo}
        rightExtra={
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors px-2 py-2 rounded-lg hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t.common.back}</span>
          </Link>
        }
      />

      {/* 主内容 */}
      <main className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {t.upload.title}
            </h2>
            <p className="text-slate-600">
              {t.upload.description}
            </p>
            <div className="mt-3 flex items-start space-x-2 text-sm text-slate-500">
              <svg className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p><strong>{t.upload.hint}：</strong>{t.upload.folderHint}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* 品牌：优先选择已有品牌，必要时再新建 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 animate-slide-up">
              <div className="flex items-center justify-between gap-4 mb-3">
                <label className="text-sm font-semibold text-slate-700">
                  {t.upload.brandName} <span className="text-red-500">*</span>
                </label>

                {(brands.length > 0 || isBrandLoading) && (
                  <div className="inline-flex items-center gap-2">
                    {isBrandLoading && (
                      <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <span className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                        <span>加载品牌中…</span>
                      </div>
                    )}
                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      disabled={isUploading || isBrandLoading}
                      onClick={() => setBrandMode('select')}
                      className={[
                        'px-3 py-2 rounded-lg text-sm font-semibold transition-colors',
                        brandMode === 'select'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-white/70',
                        isUploading ? 'opacity-60 cursor-not-allowed' : '',
                        isBrandLoading ? 'opacity-60 cursor-not-allowed' : '',
                      ].join(' ')}
                    >
                      {t.upload.brandModeExisting}
                    </button>
                    <button
                      type="button"
                      disabled={isUploading || isBrandLoading}
                      onClick={() => {
                        setBrandMode('new')
                        setSelectedBrandId('')
                        setBrandName('')
                      }}
                      className={[
                        'px-3 py-2 rounded-lg text-sm font-semibold transition-colors',
                        brandMode === 'new'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-white/70',
                        isUploading ? 'opacity-60 cursor-not-allowed' : '',
                        isBrandLoading ? 'opacity-60 cursor-not-allowed' : '',
                      ].join(' ')}
                    >
                      {t.upload.brandModeNew}
                    </button>
                    </div>
                  </div>
                )}
              </div>

              {brandMode === 'select' && brands.length > 0 ? (
                <>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-2">
                      {t.upload.brandSelectLabel}
                    </div>
                    <select
                      value={selectedBrandId}
                      onChange={(e) => {
                        const id = e.target.value
                        setSelectedBrandId(id)
                        if (!id) {
                          setBrandName('')
                          return
                        }
                        const b = brands.find((x) => x.brandId === id)
                        if (b?.brandName) setBrandName(b.brandName)
                      }}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white text-slate-900"
                      disabled={isUploading || isBrandLoading}
                    >
                      <option value="">{t.upload.brandSelectPlaceholder}</option>
                      {brands.map((b) => (
                        <option key={b.brandId} value={b.brandId}>
                          {b.brandName}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 text-sm text-slate-500">
                      {t.upload.brandSelectHint}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder={t.upload.brandPlaceholder}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 placeholder-slate-400"
                    disabled={isUploading}
                  />
                  {/* <p className="mt-2 text-sm text-slate-500">
                    {t.upload.brandNewHint}
                  </p> */}
                </>
              )}
            </div>

            {/* 性别选择（必选，每次上传前必须手动选择） */}
            <div className="bg-white rounded-2xl shadow-lg p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-slate-700">
                  {t.upload.genderLabel} <span className="text-red-500">*</span>
                </label>
                {gender && (
                  <span className="text-xs font-semibold text-slate-500">
                    {gender === 'F' ? t.upload.genderFemale : t.upload.genderMale}
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setGender('F')}
                  disabled={isUploading}
                  className={[
                    'flex-1 px-4 py-3 rounded-xl border-2 transition-all font-semibold',
                    gender === 'F'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                    isUploading ? 'opacity-60 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  {t.upload.genderFemale}
                </button>
                <button
                  type="button"
                  onClick={() => setGender('M')}
                  disabled={isUploading}
                  className={[
                    'flex-1 px-4 py-3 rounded-xl border-2 transition-all font-semibold',
                    gender === 'M'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                    isUploading ? 'opacity-60 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  {t.upload.genderMale}
                </button>
              </div>

              {!gender && (
                <p className="mt-3 text-sm text-red-600">
                  {t.upload.genderRequired}
                </p>
              )}
            </div>

            {/* 拖放上传区域 */}
            <div
              className={`bg-white rounded-2xl shadow-lg p-8 transition-all duration-300 animate-slide-up ${isDragging ? 'drop-zone-active border-4' : 'border-4 border-dashed border-slate-200'
                }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              title={t.upload.dragDropHint}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isDragging ? 'bg-primary-500 scale-110' : 'bg-slate-100'
                  }`}>
                  <Upload className={`w-10 h-10 ${isDragging ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-slate-900 mb-2">
                    {isDragging ? t.upload.dropToUpload : t.upload.dragDrop}
                  </p>
                  <p className="text-slate-600 mb-4">
                    {t.upload.or}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {/* 选择文件 */}
                    <label className="inline-flex items-center px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors cursor-pointer shadow-lg hover:shadow-xl">
                      <ImageIcon className="w-5 h-5 mr-2" />
                      <span className="font-medium">{t.upload.selectFiles}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>

                    {/* 选择文件夹 */}
                    <label className="inline-flex items-center px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors cursor-pointer shadow-lg hover:shadow-xl">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="font-medium">{t.upload.selectFolder}</span>
                      <input
                        type="file"
                        // @ts-ignore - webkitdirectory is not in the type definition
                        webkitdirectory=""
                        directory=""
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  {t.upload.supportFormats}
                </p>
              </div>
            </div>

            {/* 文件列表 */}
            {files.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 animate-scale-in">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {t.upload.selectedFiles} ({files.length})
                  </h3>
                  {!isUploading && (
                    <button
                      onClick={() => {
                        files.forEach(f => URL.revokeObjectURL(f.preview))
                        setFiles([])
                        setGender(null)
                      }}
                      className="text-sm text-red-500 hover:text-red-700 transition-colors"
                    >
                      {t.upload.clearAll}
                    </button>
                  )}
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center space-x-4 p-3 border-2 border-slate-100 rounded-xl hover:border-slate-200 transition-colors"
                    >
                      {/* 预览图 */}
                      <img
                        src={file.preview}
                        alt={file.file.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />

                      {/* 文件信息 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {file.file.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(file.file.size / 1024).toFixed(2)} KB
                        </p>

                        {/* 进度条 */}
                        {file.status === 'uploading' && (
                          <div className="mt-2">
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                              <div
                                className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 状态图标 */}
                      <div>
                        {file.status === 'pending' && !isUploading && (
                          <button
                            onClick={() => removeFile(file.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-5 h-5 text-red-500" />
                          </button>
                        )}
                        {file.status === 'uploading' && (
                          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full spinner" />
                        )}
                        {file.status === 'success' && (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        )}
                        {file.status === 'error' && (
                          <AlertCircle className="w-6 h-6 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 上传按钮 */}
            {files.length > 0 && (
              <div className="flex justify-end space-x-4 animate-fade-in">
                <button
                  onClick={() => {
                    setGender(null)
                    router.push('/')
                  }}
                  disabled={isUploading}
                  className="px-8 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.upload.cancel}
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !brandName.trim() || !gender}
                  className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Upload className="w-5 h-5" />
                  <span>{isUploading ? t.upload.uploading : t.upload.startUpload}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

