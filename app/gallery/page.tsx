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
  Tag
} from 'lucide-react'

interface ImageItem {
  id: string
  name: string
  brand: string
  url: string
  size: number
  uploadDate: Date
  type: string
}

// 模拟数据
const mockImages: ImageItem[] = [
  {
    id: '1',
    name: '19k37ddq (1).jpg',
    brand: 'Nike',
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
    size: 512 * 1024,
    uploadDate: new Date('2025-02-10'),
    type: 'image/jpeg'
  },
  {
    id: '2',
    name: 'pants_woman.jpg',
    brand: 'Adidas',
    url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80',
    size: 153 * 1024,
    uploadDate: new Date('2025-02-09'),
    type: 'image/jpeg'
  },
  {
    id: '3',
    name: 'DF-F-C0051-1.jpg',
    brand: 'Uniqlo',
    url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990',
    size: 60 * 1024,
    uploadDate: new Date('2025-02-08'),
    type: 'image/jpeg'
  },
  {
    id: '4',
    name: 'summer-dress-01.jpg',
    brand: 'Zara',
    url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1',
    size: 423 * 1024,
    uploadDate: new Date('2025-02-07'),
    type: 'image/jpeg'
  },
  {
    id: '5',
    name: 'jacket-leather.jpg',
    brand: 'H&M',
    url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5',
    size: 678 * 1024,
    uploadDate: new Date('2025-02-06'),
    type: 'image/jpeg'
  },
  {
    id: '6',
    name: 'sneakers-white.jpg',
    brand: 'Nike',
    url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772',
    size: 289 * 1024,
    uploadDate: new Date('2025-02-05'),
    type: 'image/jpeg'
  }
]

export default function GalleryPage() {
  const [images, setImages] = useState<ImageItem[]>(mockImages)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('全部')
  const [hoveredImage, setHoveredImage] = useState<string | null>(null)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const previewRef = useRef<HTMLDivElement>(null)

  // 获取所有品牌
  const brands = ['全部', ...Array.from(new Set(images.map(img => img.brand)))]

  // 过滤图片
  const filteredImages = images.filter(img => {
    const matchesSearch = img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         img.brand.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBrand = selectedBrand === '全部' || img.brand === selectedBrand
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
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
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
                服装图片管理系统
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/upload"
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
              >
                上传图片
              </Link>
              <Link 
                href="/"
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>返回首页</span>
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
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              图片一览
            </h2>
            <p className="text-slate-600">
              共 <span className="font-semibold text-primary-600">{filteredImages.length}</span> 张图片
            </p>
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
                  placeholder="搜索图片名称或品牌..."
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900"
                />
              </div>

              {/* 品牌筛选 */}
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-slate-500" />
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 bg-white"
                >
                  {brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 图片网格 */}
          {filteredImages.length > 0 ? (
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
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex space-x-2">
                          <button className="p-2 bg-white rounded-lg shadow-lg hover:bg-slate-50 transition-colors">
                            <Download className="w-5 h-5 text-slate-700" />
                          </button>
                          <button className="p-2 bg-white rounded-lg shadow-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="w-5 h-5 text-red-500" />
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
          ) : (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                没有找到图片
              </h3>
              <p className="text-slate-600 mb-6">
                尝试调整搜索条件或上传新的图片
              </p>
              <Link
                href="/upload"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium shadow-lg"
              >
                <ImageIcon className="w-5 h-5" />
                <span>上传图片</span>
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

