import { getIdTokenOrThrow } from '@/lib/cognito-auth'

/**
 * API 客户端 - 通过 Next.js API 路由与后端通信
 * API Key 在服务器端，不会暴露到浏览器
 */

const API_BASE_URL = '/api'; // 使用本地 Next.js API 路由

export interface UploadFileData {
  name: string
  type: string
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

type UploadPrepareItem = {
  fileName: string
  success: boolean
  key?: string
  uploadUrl?: string
  method?: 'PUT'
  headers?: Record<string, string>
  error?: string
}

type UploadPrepareResponse = {
  brandName: string
  brandId: string
  items: UploadPrepareItem[]
  note?: string
  error?: string
}

export type UploadFileProgressEvent = {
  fileName: string
  // 解决同名文件：用 name|size|lastModified 做更稳定的本地匹配 key
  fileKey?: string
  phase: 'prepare' | 'upload' | 'complete'
  status: 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

export type UploadImagesOptions = {
  onFileProgress?: (e: UploadFileProgressEvent) => void
  concurrency?: number
}

function putToS3WithProgress(url: string, file: File, onProgress?: (p: number) => void): Promise<{ ok: boolean; status: number }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url, true)
    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return
      const p = Math.max(0, Math.min(99, Math.round((evt.loaded / evt.total) * 99)))
      onProgress?.(p)
    }
    xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status })
    xhr.onerror = () => resolve({ ok: false, status: xhr.status || 0 })
    xhr.send(file)
  })
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>, concurrency: number): Promise<void> {
  const c = Math.max(1, Math.floor(concurrency || 1))
  let idx = 0
  const runners = new Array(Math.min(c, items.length)).fill(0).map(async () => {
    while (idx < items.length) {
      const cur = items[idx++]
      await worker(cur)
    }
  })
  await Promise.all(runners)
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
  urlExpiresIn?: number
}

export interface ListImagesResponse {
  images: ImageItem[]
  total: number
  brand: string
  note?: string
}

/**
 * 上传图片
 */
export async function uploadImages(
  brandName: string,
  files: File[],
  options: UploadImagesOptions = {}
): Promise<UploadResponse> {
  try {
    const token = await getIdTokenOrThrow()

    // 1) prepare：申请 presigned uploadUrl
    const preparePayload: { brandName: string; files: UploadFileData[] } = {
      brandName,
      files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    }

    const prepareResp = await fetch(`${API_BASE_URL}/upload/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(preparePayload),
    })

    const prepareData = (await prepareResp.json()) as UploadPrepareResponse
    if (!prepareResp.ok) {
      throw new Error(prepareData?.error || '上传准备失败')
    }

    // 提取 brandId（由后端返回）
    const brandId = prepareData.brandId
    console.log(`[uploadImages] Received brandId from prepare: ${brandId}`)

    const fileByName = new Map(files.map((f) => [f.name, f]))
    const results: UploadResponse['results'] = []
    const onFileProgress = options.onFileProgress
    const concurrency = options.concurrency ?? 3

    // 2) 直传到 S3 + 立即调用 complete（每个文件独立处理）
    await runPool(
      prepareData.items || [],
      async (item) => {
        const fileName = item.fileName
        const localFile = fileByName.get(fileName)
        const fileKey = localFile ? `${localFile.name}|${localFile.size}|${localFile.lastModified}` : undefined

        onFileProgress?.({ fileName, fileKey, phase: 'prepare', status: item.success ? 'uploading' : 'error', progress: 0, error: item.error })

        if (!item.success || !item.uploadUrl || !item.key) {
          results.push({ fileName, success: false, error: item.error || '上传准备失败' })
          onFileProgress?.({ fileName, fileKey, phase: 'prepare', status: 'error', progress: 0, error: item.error || '上传准备失败' })
          return
        }
        if (!localFile) {
          results.push({ fileName, success: false, key: item.key, error: '找不到对应的本地文件' })
          onFileProgress?.({ fileName, fileKey, phase: 'upload', status: 'error', progress: 0, error: '找不到对应的本地文件' })
          return
        }

        // 阶段1：上传到 S3
        onFileProgress?.({ fileName, fileKey, phase: 'upload', status: 'uploading', progress: 1 })
        const putRes = await putToS3WithProgress(item.uploadUrl, localFile, (p) => {
          onFileProgress?.({ fileName, fileKey, phase: 'upload', status: 'uploading', progress: p })
        })

        if (!putRes.ok) {
          results.push({ fileName, success: false, key: item.key, error: `S3 上传失败（${putRes.status}）` })
          onFileProgress?.({ fileName, fileKey, phase: 'upload', status: 'error', progress: 0, error: `S3 上传失败（${putRes.status}）` })
          return
        }

        // 阶段2：立即调用 complete 处理这个文件（resize、登记等）
        onFileProgress?.({ fileName, fileKey, phase: 'complete', status: 'uploading', progress: 99 })

        try {
          const completeResp = await fetch(`${API_BASE_URL}/upload/complete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              brandName,
              brandId, // 传递 brandId 给 complete
              items: [{ key: item.key, fileName, mimeType: localFile.type || undefined }]
            }),
          })

          const completeData = (await completeResp.json().catch(() => null)) as any

          if (!completeResp.ok) {
            const msg = completeData?.error || '图片处理失败'
            results.push({ fileName, success: false, key: item.key, error: msg })
            onFileProgress?.({ fileName, fileKey, phase: 'complete', status: 'error', progress: 0, error: msg })
            return
          }

          // 处理成功
          const fileResult = completeData?.results?.[0]
          if (fileResult?.success && fileResult.url) {
            results.push({ fileName, success: true, key: item.key, url: fileResult.url, size: localFile.size })
            onFileProgress?.({ fileName, fileKey, phase: 'complete', status: 'success', progress: 100 })
          } else {
            const msg = fileResult?.error || '图片处理失败'
            results.push({ fileName, success: false, key: item.key, error: msg })
            onFileProgress?.({ fileName, fileKey, phase: 'complete', status: 'error', progress: 0, error: msg })
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : '图片处理失败'
          results.push({ fileName, success: false, key: item.key, error: msg })
          onFileProgress?.({ fileName, fileKey, phase: 'complete', status: 'error', progress: 0, error: msg })
        }
      },
      concurrency
    )

    const success = results.filter((r) => r.success).length
    const failed = results.length - success

    return {
      message: `上传完成：成功 ${success} 个，失败 ${failed} 个`,
      brandName,
      results,
      summary: { total: results.length, success, failed },
    }
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
    const body: { brand?: string } = {}
    if (brand && brand !== '全部') {
      body.brand = brand
    }

    const token = await getIdTokenOrThrow()
    const response = await fetch(`${API_BASE_URL}/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
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
    const token = await getIdTokenOrThrow()
    const response = await fetch(`${API_BASE_URL}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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
 * 一键删除某个品牌下的全部图片（后端按前缀分页删除，可覆盖 >1000 张）
 */
export async function deleteBrandImages(brandName: string): Promise<{ deletedCount: number }> {
  const token = await getIdTokenOrThrow()
  const response = await fetch(`${API_BASE_URL}/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ brandName }),
  })

  const data = await response.json().catch(() => null as any)
  if (!response.ok) {
    throw new Error((data && data.error) || '品牌批量删除失败')
  }
  return { deletedCount: Number(data?.deletedCount || 0) }
}

// 已切换为“后端签名 + 前端直传 S3”，不再需要 base64 编码上传

