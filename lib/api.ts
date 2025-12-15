/**
 * API 客户端 - 与 AWS Lambda 后端通信
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface UploadFileData {
  name: string
  type: string
  content: string // Base64 编码
  size: number
}

export interface UploadResponse {
  message: string
  brandName: string
  results: Array<{
    fileName: string
    success: boolean
    url?: string
    key?: string
    size?: number
    error?: string
  }>
  summary: {
    total: number
    success: number
    failed: number
  }
}

export interface ImageItem {
  id: string
  name: string
  brand: string
  url: string
  key: string
  size: number
  uploadDate: string
  type: string
}

export interface ListImagesResponse {
  images: ImageItem[]
  total: number
  brand: string
}

/**
 * 上传图片
 */
export async function uploadImages(
  brandName: string,
  files: File[]
): Promise<UploadResponse> {
  try {
    // 将文件转换为 Base64
    const fileDataPromises = files.map(async (file) => {
      const base64 = await fileToBase64(file)
      return {
        name: file.name,
        type: file.type,
        content: base64,
        size: file.size,
      }
    })

    const fileData = await Promise.all(fileDataPromises)

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        brandName,
        files: fileData,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '上传失败')
    }

    return await response.json()
  } catch (error) {
    console.error('Upload error:', error)
    throw error
  }
}

/**
 * 获取图片列表
 */
export async function listImages(brand?: string): Promise<ListImagesResponse> {
  try {
    const params = new URLSearchParams()
    if (brand && brand !== '全部') {
      params.append('brand', brand)
    }

    const url = `${API_BASE_URL}/list${params.toString() ? `?${params.toString()}` : ''}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '获取列表失败')
    }

    return await response.json()
  } catch (error) {
    console.error('List error:', error)
    throw error
  }
}

/**
 * 删除图片
 */
export async function deleteImages(keys: string[]): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keys }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '删除失败')
    }

    return await response.json()
  } catch (error) {
    console.error('Delete error:', error)
    throw error
  }
}

/**
 * 将 File 转换为 Base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      const result = reader.result as string
      // 移除 data URL 前缀
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'))
    }
    
    reader.readAsDataURL(file)
  })
}

