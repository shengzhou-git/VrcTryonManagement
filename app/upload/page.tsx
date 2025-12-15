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
  Package
} from 'lucide-react'

interface UploadFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  id: string
}

export default function UploadPage() {
  const router = useRouter()
  const [brandName, setBrandName] = useState('')
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // 处理文件选择（支持单文件和文件夹）
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const imageFiles = Array.from(selectedFiles).filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      alert('未找到图片文件，请选择包含图片的文件夹')
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
      console.log(`已添加 ${imageFiles.length} 张图片`)
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
      alert('请输入品牌名称')
      return
    }

    if (files.length === 0) {
      alert('请选择要上传的图片')
      return
    }

    setIsUploading(true)

    // 模拟上传过程（实际应该调用API）
    for (let i = 0; i < files.length; i++) {
      const fileId = files[i].id
      
      // 更新为上传中状态
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'uploading' as const } : f
      ))

      // 模拟上传进度
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100))
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress } : f
        ))
      }

      // 标记为成功
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'success' as const, progress: 100 } : f
      ))
    }

    setIsUploading(false)
    
    // 延迟跳转到图片一览页面
    setTimeout(() => {
      router.push('/gallery')
    }, 1000)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-slate-900">
                服装图片管理系统
              </h1>
            </div>
            <Link 
              href="/"
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回首页</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              上传服装图片
            </h2>
            <p className="text-slate-600">
              请填写品牌名称并选择要上传的图片文件或文件夹
            </p>
            <div className="mt-3 flex items-start space-x-2 text-sm text-slate-500">
              <svg className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p><strong>提示：</strong>选择文件夹可以一次性上传整个文件夹内的所有图片，系统会自动筛选图片文件。</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* 品牌名称输入 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 animate-slide-up">
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                品牌名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="例如：Nike, Adidas, Uniqlo..."
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-slate-900 placeholder-slate-400"
                disabled={isUploading}
              />
            </div>

            {/* 拖放上传区域 */}
            <div
              className={`bg-white rounded-2xl shadow-lg p-8 transition-all duration-300 animate-slide-up ${
                isDragging ? 'drop-zone-active border-4' : 'border-4 border-dashed border-slate-200'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              title="支持拖放文件或文件夹"
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isDragging ? 'bg-primary-500 scale-110' : 'bg-slate-100'
                }`}>
                  <Upload className={`w-10 h-10 ${isDragging ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-slate-900 mb-2">
                    {isDragging ? '释放以上传文件' : '拖放图片或文件夹到此处'}
                  </p>
                  <p className="text-slate-600 mb-4">
                    或者
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {/* 选择文件 */}
                    <label className="inline-flex items-center px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors cursor-pointer shadow-lg hover:shadow-xl">
                      <ImageIcon className="w-5 h-5 mr-2" />
                      <span className="font-medium">选择文件</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
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
                      <span className="font-medium">选择文件夹</span>
                      <input
                        type="file"
                        // @ts-ignore - webkitdirectory is not in the type definition
                        webkitdirectory=""
                        directory=""
                        multiple
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  支持 JPG, PNG, GIF 等图片格式 • 支持批量上传和文件夹上传
                </p>
              </div>
            </div>

            {/* 文件列表 */}
            {files.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 animate-scale-in">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    已选择的文件 ({files.length})
                  </h3>
                  {!isUploading && (
                    <button
                      onClick={() => {
                        files.forEach(f => URL.revokeObjectURL(f.preview))
                        setFiles([])
                      }}
                      className="text-sm text-red-500 hover:text-red-700 transition-colors"
                    >
                      清空全部
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
                  onClick={() => router.push('/')}
                  disabled={isUploading}
                  className="px-8 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !brandName.trim()}
                  className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Upload className="w-5 h-5" />
                  <span>{isUploading ? '上传中...' : '开始上传'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

