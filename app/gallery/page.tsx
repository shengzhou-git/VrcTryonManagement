'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Package, 
  Search,
  Filter,
  Download,
  Trash2,
  Image as ImageIcon,
  Folder,
  Calendar,
  Tag,
  Loader2,
  AlertCircle,
  RefreshCw,
  Info
} from 'lucide-react'
import { listImages, deleteImages, type ImageItem } from '@/lib/api'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function GalleryPage() {
  const { t } = useLanguage()
  const [images, setImages] = useState<ImageItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBrand, setSelectedBrand] = useState(t.gallery.allBrands)
  const [hoveredImage, setHoveredImage] = useState<string | null>(null)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // 加载图片列表
  useEffect(() => {
    loadImages()
  }, [selectedBrand])

  const loadImages = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const brand = selectedBrand === t.gallery.allBrands ? undefined : selectedBrand
      const response = await listImages(brand)
      
      setImages(response.images)
    } catch (err) {
      console.error('Failed to load images:', err)
      setError(err instanceof Error ? err.message : t.gallery.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }

  // 删除图片
  const handleDelete = async (image: ImageItem) => {
    if (!confirm(t.gallery.deleteConfirm)) {
      return
    }

    try {
      setIsDeleting(image.id)
      await deleteImages([image.key])
      
      // 从列表中移除
      setImages(prev => prev.filter(img => img.id !== image.id))
      
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
  const brands = [t.gallery.allBrands, ...Array.from(new Set(images.map(img => img.brand)))]

  // 过滤图片
  const filteredImages = images.filter(img => {
    const matchesSearch = img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         img.brand.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBrand = selectedBrand === t.gallery.allBrands || img.brand === selectedBrand
    return matchesSearch && matchesBrand
  })

  // 处理鼠标移动以更新预览位置
  const handleMouseMove = (e: React.MouseEvent, imageId: string) => {
    setHoveredImage(imageId)
    
    // 计算预览框位置（跟随鼠标，但确保不超出屏幕）
    const offsetX = 20
    const offsetY = 20
    const previewWidth = 400
    const previewHeight = 400
    
    let x = e.clientX + offsetX
    let y = e.clientY + offsetY
    
    // 检查右边界
    if (x + previewWidth > window.innerWidth) {
      x = e.clientX - previewWidth - offsetX
    }
    
    // 检查下边界
    if (y + previewHeight > window.innerHeight) {
      y = e.clientY - previewHeight - offsetY
    }
    
    setPreviewPosition({ x, y })
  }

  const handleMouseLeave = () => {
    setHoveredImage(null)
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
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-slate-900">
                {t.common.appName}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Link
                href="/upload"
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
              >
                {t.common.upload}
              </Link>
              <Link 
                href="/"
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{t.common.back}</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

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
              {images.length > 0 && images[0]?.urlExpiresIn && (
                <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                  <Info className="w-4 h-4" />
                  <span>{t.gallery.urlExpiresIn}{Math.floor(images[0].urlExpiresIn / 60)} {t.gallery.minutes}</span>
                </div>
              )}
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
              </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-scale-in">
              {filteredImages.map((image) => (
                <div
                  key={image.id}
                  className="image-card bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer border-2 border-transparent hover:border-primary-200"
                  onMouseMove={(e) => handleMouseMove(e, image.id)}
                  onMouseLeave={handleMouseLeave}
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
          )}

          {/* 空状态 */}
          {!isLoading && !error && filteredImages.length === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {images.length === 0 ? t.gallery.noImagesYet : t.gallery.noImages}
              </h3>
              <p className="text-slate-600 mb-6">
                {images.length === 0 
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

      {/* 悬停预览 */}
      {hoveredImage && (
        <div
          ref={previewRef}
          className="fixed z-50 pointer-events-none animate-fade-in"
          style={{
            left: `${previewPosition.x}px`,
            top: `${previewPosition.y}px`,
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-white">
            <img
              src={filteredImages.find(img => img.id === hoveredImage)?.url}
              alt="Preview"
              className="w-96 h-96 object-cover"
            />
            <div className="p-4 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0">
              <p className="text-white font-semibold text-sm truncate">
                {filteredImages.find(img => img.id === hoveredImage)?.name}
              </p>
              <p className="text-white/90 text-xs">
                {filteredImages.find(img => img.id === hoveredImage)?.brand}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

