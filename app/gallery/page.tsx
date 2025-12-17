'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { 
  ArrowLeft, 
  Search,
  Filter,
  Download,
  Trash2,
  Image as ImageIcon,
  Calendar,
  Tag,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { listImages, deleteImages, deleteBrandImages, listAllBrandsForSuperAdmin, listImagesForBrandIdPaged, type ImageItem, type BrandItem } from '@/lib/api'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import AppNav from '@/components/AppNav'
import { authCheck, hasGroup, type CognitoUserInfo } from '@/lib/cognito-auth'
import { useRouter } from 'next/navigation'

export default function GalleryPage() {
  const router = useRouter()
  const { t } = useLanguage()
  // 普通用户：保存全量图片列表（用于品牌下拉）并在前端过滤
  const [allImages, setAllImages] = useState<ImageItem[]>([])
  // SuperAdmin：品牌列表来自 DynamoDB（全局），并按 BrandId 精确拉取该品牌图片
  const [allBrands, setAllBrands] = useState<BrandItem[]>([])
  const [selectedBrandKey, setSelectedBrandKey] = useState<string>('') // `${userId}::${brandId}`
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBrand, setSelectedBrand] = useState(t.gallery.allBrands)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isBrandDeleting, setIsBrandDeleting] = useState(false)
  const [isBrandDownloading, setIsBrandDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadCount, setDownloadCount] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const [userinfo, setUserinfo] = useState<CognitoUserInfo | null>(null)

  const isAdmin = hasGroup(userinfo, 'Admin') || hasGroup(userinfo, 'SuperAdmin')
  const isSuperAdmin = hasGroup(userinfo, 'SuperAdmin')

  const toTs = (s?: string | null): number => {
    if (!s) return 0
    const n = Date.parse(String(s))
    return Number.isFinite(n) ? n : 0
  }

  // 登录检查 + 权限检查（Admin / ViewData / SuperAdmin）
  useEffect(() => {
    ;(async () => {
      const { token, userinfo } = await authCheck()
      if (!token) {
        router.push('/login')
        return
      }
      // 只允许 Admin / ViewData / SuperAdmin
      const ok = hasGroup(userinfo, 'Admin') || hasGroup(userinfo, 'ViewData') || hasGroup(userinfo, 'SuperAdmin')
      if (!ok) {
        router.push('/login')
        return
      }
      setUserinfo(userinfo)

      // SuperAdmin 加载全局品牌列表（用于下拉）
      if (hasGroup(userinfo, 'SuperAdmin')) {
        try {
          setIsLoading(true)
          const list = await listAllBrandsForSuperAdmin()
          setAllBrands(list)

          // 默认选择“最新品牌”（UpdatedAt 优先，其次 CreatedAt）
          if (!selectedBrandKey && list.length > 0) {
            const latest = [...list].sort((a, b) => {
              const at = toTs(a.updatedAt) || toTs(a.createdAt)
              const bt = toTs(b.updatedAt) || toTs(b.createdAt)
              if (bt !== at) return bt - at
              return Number(b.uploadCount || 0) - Number(a.uploadCount || 0)
            })[0]
            if (latest?.userId && latest?.brandId) {
              setSelectedBrandKey(`${latest.userId}::${latest.brandId}`)
            }
          }
        } catch (e) {
          console.error('Failed to load all brands:', e)
          setError(e instanceof Error ? e.message : t.gallery.loadFailed)
        } finally {
          // 注意：SuperAdmin 的图片加载由 selectedBrandKey 驱动；这里不要卡在 loading
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // 语言切换时，保证“全部”选项的值一致
  useEffect(() => {
    const allLabels = ['全部', 'All Brands', 'すべて']
    if (allLabels.includes(selectedBrand)) {
      setSelectedBrand(t.gallery.allBrands)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.gallery.allBrands])

  // 加载图片列表
  useEffect(() => {
    if (!userinfo) return
    if (isSuperAdmin) return // SuperAdmin 由选中品牌驱动
    loadImages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userinfo, isSuperAdmin])

  // SuperAdmin：选中品牌后再拉取对应图片
  useEffect(() => {
    if (!userinfo) return
    if (!isSuperAdmin) return
    if (!selectedBrandKey) {
      setAllImages([])
      setNextCursor(null)
      setHasMore(false)
      return
    }
    ;(async () => {
      try {
        setIsLoading(true)
        setError(null)
        const [userId, brandId] = selectedBrandKey.split('::')
        const resp = await listImagesForBrandIdPaged({ userId, brandId, limit: 60, cursor: null })
        setAllImages(resp.images || [])
        setNextCursor(resp.nextCursor || null)
        setHasMore(!!resp.hasMore)
      } catch (e) {
        console.error('Failed to load images for brandId:', e)
        setError(e instanceof Error ? e.message : t.gallery.loadFailed)
      } finally {
        setIsLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userinfo, isSuperAdmin, selectedBrandKey])

  const loadMore = async () => {
    if (!isSuperAdmin) return
    if (!selectedBrandKey) return
    if (!hasMore || !nextCursor) return
    if (isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const [userId, brandId] = selectedBrandKey.split('::')
      const resp = await listImagesForBrandIdPaged({ userId, brandId, limit: 60, cursor: nextCursor })
      const more = resp.images || []
      setAllImages((prev) => [...prev, ...more])
      setNextCursor(resp.nextCursor || null)
      setHasMore(!!resp.hasMore)
    } catch (e) {
      console.error('Failed to load more images:', e)
      alert(e instanceof Error ? e.message : t.common.error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const loadImages = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // 关键：始终拉取“全量”，避免品牌切换后 brands 选项只剩当前品牌
      const response = await listImages(undefined)
      setAllImages(response.images)
    } catch (err) {
      console.error('Failed to load images:', err)
      setError(err instanceof Error ? err.message : t.gallery.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }

  // 删除图片
  const handleDelete = async (image: ImageItem) => {
    if (!isAdmin) {
      alert('权限不足（需要 Admin）')
      return
    }
    if (!confirm(t.gallery.deleteConfirm)) {
      return
    }

    try {
      setIsDeleting(image.id)
      await deleteImages([image.key])
      
      // 从列表中移除
      setAllImages(prev => prev.filter(img => img.id !== image.id))
      
      alert(t.gallery.deleteSuccess)
    } catch (err) {
      console.error('Failed to delete image:', err)
      alert(`${t.gallery.deleteFailed}：${err instanceof Error ? err.message : t.common.error}`)
    } finally {
      setIsDeleting(null)
    }
  }

  // 下载图片
  const handleDownload = async (image: ImageItem) => {
    try {
      const response = await fetch(image.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = image.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to download image:', err)
      alert(t.gallery.downloadFailed)
    }
  }

  // 获取所有品牌
  const brands = isSuperAdmin
    ? [t.gallery.allBrands] // SuperAdmin 下拉用 allBrands 渲染
    : [
        t.gallery.allBrands,
        ...Array.from(new Set(allImages.map((img) => img.brand))).sort((a, b) => a.localeCompare(b)),
      ]

  // 过滤图片
  const filteredImages = allImages.filter(img => {
    const matchesSearch = img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         img.brand.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBrand = selectedBrand === t.gallery.allBrands || img.brand === selectedBrand
    return matchesSearch && matchesBrand
  })

  const selectedBrandCount =
    selectedBrand === t.gallery.allBrands ? allImages.length : allImages.filter((img) => img.brand === selectedBrand).length

  const canBulkDeleteBrand =
    isAdmin &&
    !isLoading &&
    !isBrandDeleting &&
    selectedBrand !== t.gallery.allBrands &&
    selectedBrandCount > 0

  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
  }

  const sanitizeZipName = (s: string) => {
    const x = String(s || '').trim()
    if (!x) return 'file'
    // Windows / zip 安全：移除非法字符
    return x.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim()
  }

  const fetchArrayBufferWithTimeout = async (url: string, ms: number): Promise<ArrayBuffer> => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), Math.max(1, ms))
    try {
      const res = await fetch(url, { signal: ctrl.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.arrayBuffer()
    } finally {
      clearTimeout(timer)
    }
  }

  const handleDownloadBrandAllForSuperAdmin = async () => {
    if (!isSuperAdmin) return
    if (!selectedBrandKey) {
      alert('请先选择要下载的品牌')
      return
    }
    if (isBrandDownloading) return

    const [targetUserId, brandId] = selectedBrandKey.split('::')
    const brand = allBrands.find((b) => `${b.userId}::${b.brandId}` === selectedBrandKey)
    const brandName = brand?.brandName || 'brand'

    const ok = confirm(`${t.gallery.downloadBrandAll}\n品牌：${brandName}\nBrandId：${brandId}`)
    if (!ok) return

    setIsBrandDownloading(true)
    setDownloadProgress(1)
    setDownloadCount({ done: 0, total: 0 })
    try {
      // 1) 拉取该 brandId 的所有分页（每页 60）
      const all: ImageItem[] = []
      let cursor: string | null = null
      let guard = 0
      while (true) {
        guard += 1
        if (guard > 500) break // 防御：避免异常循环
        const resp = await listImagesForBrandIdPaged({ userId: targetUserId, brandId, limit: 60, cursor })
        const imgs = Array.isArray(resp.images) ? resp.images : []
        all.push(...imgs)
        cursor = resp.nextCursor || null
        if (!resp.hasMore || !cursor) break
        // 拉分页阶段占进度 1~10
        setDownloadProgress(Math.min(10, 1 + Math.round((guard / 20) * 9)))
      }

      if (all.length === 0) {
        alert('该品牌暂无图片')
        return
      }

      // 2) 下载图片并打包 zip
      const zip = new JSZip()
      const folderName = sanitizeZipName(`${brandName}-${brandId}`)
      const folder = zip.folder(folderName) || zip

      const failed: string[] = []
      const usedNames = new Map<string, number>()
      const pickFileName = (img: ImageItem) => {
        const raw = sanitizeZipName(img.name || img.key.split('/').slice(-1)[0] || 'image')
        const dot = raw.lastIndexOf('.')
        const base = dot > 0 ? raw.slice(0, dot) : raw
        const ext = dot > 0 ? raw.slice(dot) : ''
        const n = (usedNames.get(raw) || 0) + 1
        usedNames.set(raw, n)
        return n === 1 ? `${base}${ext}` : `${base} (${n})${ext}`
      }

      const total = all.length
      let done = 0
      const concurrency = 3
      setDownloadCount({ done: 0, total })
      for (const batch of chunk(all, concurrency)) {
        await Promise.all(
          batch.map(async (img) => {
            try {
              // 防止某个 signedUrl 的 fetch 永久卡住：单张图 60s 超时，失败写入 _failed.txt
              const buf = await fetchArrayBufferWithTimeout(img.url, 60_000)
              folder.file(pickFileName(img), buf)
            } catch (e) {
              failed.push(`${img.key} - ${(e instanceof Error ? e.message : String(e))}`)
            } finally {
              done += 1
              setDownloadCount({ done, total })
              // 下载阶段占进度 10~90
              const p = 10 + Math.round((done / total) * 80)
              setDownloadProgress(Math.min(90, Math.max(10, p)))
            }
          })
        )
      }

      if (failed.length > 0) {
        folder.file('_failed.txt', failed.join('\n'))
      }

      setDownloadProgress(92)
      const blob = await zip.generateAsync(
        { type: 'blob' },
        (meta) => {
          // 压缩阶段占进度 92~99
          const p = 92 + Math.round((meta.percent / 100) * 7)
          setDownloadProgress(Math.min(99, Math.max(92, p)))
        }
      )

      const zipFileName = sanitizeZipName(`${brandName}-${brandId}.zip`)
      saveAs(blob, zipFileName)
      setDownloadProgress(100)
    } catch (e) {
      console.error('Failed to download brand images:', e)
      alert(`${t.gallery.downloadFailed}：${e instanceof Error ? e.message : t.common.error}`)
    } finally {
      setIsBrandDownloading(false)
      setTimeout(() => setDownloadProgress(0), 800)
      setTimeout(() => setDownloadCount({ done: 0, total: 0 }), 800)
    }
  }

  const handleDeleteBrand = async () => {
    if (!isAdmin) {
      alert('权限不足（需要 Admin）')
      return
    }
    if (selectedBrand === t.gallery.allBrands) {
      alert('请先选择要删除的品牌')
      return
    }
    if (selectedBrandCount === 0) {
      alert('该品牌暂无图片')
      return
    }
    const ok = confirm(`${t.gallery.deleteBrandConfirm}\n品牌：${selectedBrand}\n数量：${selectedBrandCount}`)
    if (!ok) return

    try {
      setIsBrandDeleting(true)
      // 当前 S3 key 格式：{userId}/{brandId}/{filename}
      // 这里用图片列表中携带的 brandId（来自 key 的第 2 段）来做“按前缀删除”，避免误用 brandName 导致删不到
      const anyImg = allImages.find((img) => img.brand === selectedBrand)
      const brandId = String(anyImg?.brandId || '').trim()
      await deleteBrandImages({ brandName: selectedBrand, brandId: brandId || null })
      // 先本地移除该品牌，立即反馈；再切回“全部”
      setAllImages((prev) => prev.filter((img) => img.brand !== selectedBrand))
      setSelectedBrand(t.gallery.allBrands)
      alert(t.gallery.deleteBrandSuccess)
      // 保险起见再拉一次全量（避免 S3 列表存在延迟导致 UI 与实际不一致）
      loadImages()
    } catch (err) {
      console.error('Failed to delete brand images:', err)
      alert(`${t.gallery.deleteBrandFailed}：${err instanceof Error ? err.message : t.common.error}`)
    } finally {
      setIsBrandDeleting(false)
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
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
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {/* 标题和统计 */}
          <div className="mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-3xl font-bold text-slate-900">
                {t.gallery.title}
              </h2>
              <button
                onClick={loadImages}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-white border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-primary-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title={isLoading ? t.gallery.refreshing : t.gallery.refresh}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? t.gallery.refreshing : t.gallery.refresh}</span>
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-slate-600">
                共 <span className="font-semibold text-primary-600">{filteredImages.length}</span> {t.gallery.totalCount}
              </p>
            </div>
          </div>

          {/* 搜索和筛选栏 */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 animate-slide-up">
            <div className="flex flex-col md:flex-row gap-4">
              {/* 搜索框 */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t.gallery.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                  disabled={isLoading}
                />
              </div>

              {/* 品牌筛选 */}
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-slate-500" />
                {isSuperAdmin ? (
                  <select
                    value={selectedBrandKey}
                    onChange={(e) => setSelectedBrandKey(e.target.value)}
                    className="px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 bg-white"
                    disabled={isLoading}
                  >
                    <option value="">请选择品牌…</option>
                    {allBrands.map((b) => (
                      <option key={`${b.userId}::${b.brandId}`} value={`${b.userId}::${b.brandId}`}>
                        {b.brandName} ({b.brandId})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 bg-white"
                    disabled={isLoading}
                  >
                    {brands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* 品牌一键删除（仅 Admin + 选择了具体品牌） */}
              {isAdmin && selectedBrand !== t.gallery.allBrands && (
                <button
                  onClick={handleDeleteBrand}
                  disabled={!canBulkDeleteBrand}
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t.gallery.deleteBrandAll}
                >
                  {isBrandDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>{t.gallery.deleteBrandDeleting}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      <span>{t.gallery.deleteBrandAll}</span>
                    </>
                  )}
                </button>
              )}

              {/* SuperAdmin：一键下载选中品牌全部图片（ZIP） */}
              {isSuperAdmin && !!selectedBrandKey && (
                <button
                  onClick={handleDownloadBrandAllForSuperAdmin}
                  disabled={isLoading || isBrandDownloading}
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-800 rounded-lg hover:bg-slate-50 hover:border-primary-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t.gallery.downloadBrandAll}
                >
                  {isBrandDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>
                        {t.gallery.downloadBrandDownloading}{' '}
                        {downloadProgress ? `${downloadProgress}%` : ''}
                        {downloadCount.total ? ` (${downloadCount.done}/${downloadCount.total})` : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      <span>{t.gallery.downloadBrandAll}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 加载状态 */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
              <p className="text-slate-600">{t.common.loading}</p>
            </div>
          )}

          {/* 错误状态 */}
          {error && !isLoading && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 animate-fade-in">
              <div className="flex items-center space-x-3 mb-2">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-semibold text-red-900">{t.gallery.loadFailed}</h3>
              </div>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={loadImages}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                {t.common.retry}
              </button>
            </div>
          )}

          {/* 图片网格 */}
          {!isLoading && !error && filteredImages.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-scale-in">
                {filteredImages.map((image) => (
                <div
                  key={image.key}
                  className="image-card bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer border-2 border-transparent hover:border-primary-200"
                >
                  {/* 缩略图 */}
                  <div className="relative aspect-square bg-slate-100 overflow-hidden">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="image-hover-overlay">
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
                        <div className="flex space-x-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownload(image)
                            }}
                            className="p-2 bg-white rounded-lg shadow-lg hover:bg-slate-50 transition-colors"
                            title={t.common.download}
                          >
                            <Download className="w-5 h-5 text-slate-700" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(image)
                            }}
                            disabled={isDeleting === image.id}
                            className="p-2 bg-white rounded-lg shadow-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                            title={t.common.delete}
                          >
                            {isDeleting === image.id ? (
                              <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                            ) : (
                              <Trash2 className="w-5 h-5 text-red-500" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 文件信息 */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-slate-900 truncate" title={image.name}>
                      {image.name}
                    </h3>
                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex items-center space-x-2">
                        <Tag className="w-4 h-4" />
                        <span className="font-medium text-primary-600">{image.brand}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ImageIcon className="w-4 h-4" />
                        <span>{formatFileSize(image.size)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(image.uploadDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                ))}
              </div>

              {/* SuperAdmin 分页：加载更多 */}
              {isSuperAdmin && hasMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-primary-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        <span>加载中…</span>
                      </>
                    ) : (
                      <span>加载更多</span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {/* 空状态 */}
          {!isLoading && !error && filteredImages.length === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {allImages.length === 0 ? t.gallery.noImagesYet : t.gallery.noImages}
              </h3>
              <p className="text-slate-600 mb-6">
                {allImages.length === 0 
                  ? t.gallery.noImagesYetDesc 
                  : t.gallery.noImagesDesc}
              </p>
              <Link
                href="/upload"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium shadow-lg"
              >
                <ImageIcon className="w-5 h-5" />
                <span>{t.common.upload}</span>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

