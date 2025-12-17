import { getIdTokenOrThrow } from '@/lib/cognito-auth'

/**
 * API 客户端 - 通过 Next.js API 路由与后端通信
 * API Key 在服务器端，不会暴露到浏览器
 */

const API_BASE_URL = '/api'; // 使用本地 Next.js API 路由

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableFetchError(err: unknown): boolean {
  // 浏览器 fetch 网络错误通常是 TypeError，message 可能是 "Failed to fetch"
  const msg = err instanceof Error ? err.message : String(err || '')
  return (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('ERR_CONNECTION_CLOSED') ||
    msg.includes('Load failed') ||
    msg.includes('fetch failed')
  )
}

async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit, opts?: { retries?: number; baseDelayMs?: number }) {
  const retries = Math.max(0, Math.floor(opts?.retries ?? 2)) // 2 => 最多 3 次
  const baseDelayMs = Math.max(50, Math.floor(opts?.baseDelayMs ?? 400))

  let lastErr: unknown = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(input, init)
      // 仅对 429 / 5xx 做重试（非幂等接口也谨慎；complete 对同 key 是可重复执行的）
      if (resp.status === 429 || (resp.status >= 500 && resp.status <= 599)) {
        if (attempt < retries) {
          const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 120)
          await sleep(delay)
          continue
        }
      }
      return resp
    } catch (e) {
      lastErr = e
      const retryable = isRetryableFetchError(e)
      if (!retryable || attempt >= retries) throw e
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 120)
      await sleep(delay)
    }
  }
  // 理论上不会走到这里
  throw lastErr || new Error('FETCH_RETRY_FAILED')
}

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

export type UploadJsonOptions = {
  onProgress?: (p: number) => void
}

type ConfigPrepareResponse = {
  success: boolean
  key?: string
  uploadUrl?: string
  method?: 'PUT'
  error?: string
}

type ConfigCompleteResponse = {
  success: boolean
  key?: string
  url?: string
  expiresIn?: number
  error?: string
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
  brandId?: string
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
    // Amplify/Next API 在大量请求时更容易出现连接被关闭，默认并发稍微保守一些
    const concurrency = options.concurrency ?? 2

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
          const completeResp = await fetchWithRetry(`${API_BASE_URL}/upload/complete`, {
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
          }, { retries: 2, baseDelayMs: 500 })

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
 * 上传品牌配置 JSON（仅 SuperAdmin）
 * 流程：/api/config/prepare -> PUT 到 S3 -> /api/config/complete
 */
export type BrandItem = {
  userId: string
  brandId: string
  brandName: string
  createdAt?: string | null
  updatedAt?: string | null
  uploadCount?: number
}

export async function listAllBrandsForSuperAdmin(): Promise<BrandItem[]> {
  const token = await getIdTokenOrThrow()
  const resp = await fetch(`${API_BASE_URL}/brand/list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  })
  const data = (await resp.json().catch(() => null)) as any
  if (!resp.ok) throw new Error(data?.error || '获取品牌列表失败')
  const items = Array.isArray(data?.items) ? data.items : []
  return items as BrandItem[]
}

/**
 * 上传品牌配置 JSON（仅 SuperAdmin）
 * 路径：{userId}/{brandId}/config/<filename>.json
 */
export async function uploadBrandConfigJson(
  target: { brandId: string },
  file: File,
  options: UploadJsonOptions = {}
): Promise<{ key: string; url?: string }> {
  const token = await getIdTokenOrThrow()

  // 1) prepare：申请 presigned uploadUrl
  const prepareResp = await fetch(`${API_BASE_URL}/config/prepare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      brandId: target.brandId,
      fileName: file.name,
      size: file.size,
      mimeType: file.type || 'application/json',
    }),
  })

  const prepareData = (await prepareResp.json().catch(() => null)) as ConfigPrepareResponse | null
  if (!prepareResp.ok || !prepareData?.success || !prepareData.uploadUrl || !prepareData.key) {
    throw new Error(prepareData?.error || '配置上传准备失败')
  }

  // 2) PUT 到 S3（带进度）
  options.onProgress?.(1)
  const putRes = await putToS3WithProgress(prepareData.uploadUrl, file, (p) => options.onProgress?.(p))
  if (!putRes.ok) {
    throw new Error(`S3 上传失败（${putRes.status}）`)
  }

  // 3) complete：确认对象存在并返回临时读取链接（可选）
  const completeResp = await fetchWithRetry(
    `${API_BASE_URL}/config/complete`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key: prepareData.key, brandId: target.brandId }),
    },
    { retries: 2, baseDelayMs: 500 }
  )

  const completeData = (await completeResp.json().catch(() => null)) as ConfigCompleteResponse | null
  if (!completeResp.ok || !completeData?.success || !completeData.key) {
    throw new Error(completeData?.error || '配置上传完成确认失败')
  }

  options.onProgress?.(100)
  return { key: completeData.key, url: completeData.url }
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

export async function listImagesForBrandId(target: { userId: string; brandId: string }): Promise<ListImagesResponse> {
  const token = await getIdTokenOrThrow()
  const response = await fetch(`${API_BASE_URL}/list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId: target.userId, brandId: target.brandId, limit: 60 }),
  })

  const data = await response.json().catch(() => null as any)
  if (!response.ok) {
    throw new Error((data && data.error) || '获取列表失败')
  }
  return data as ListImagesResponse
}

export async function listImagesForBrandIdPaged(target: { userId: string; brandId: string; limit?: number; cursor?: string | null }): Promise<ListImagesResponse & { nextCursor?: string | null; hasMore?: boolean }> {
  const token = await getIdTokenOrThrow()
  const response = await fetch(`${API_BASE_URL}/list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      userId: target.userId,
      brandId: target.brandId,
      limit: target.limit ?? 60,
      cursor: target.cursor ?? null,
    }),
  })

  const data = await response.json().catch(() => null as any)
  if (!response.ok) {
    throw new Error((data && data.error) || '获取列表失败')
  }
  return data as any
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
export async function deleteBrandImages(input: { brandName: string; brandId?: string | null }): Promise<{ deletedCount: number }> {
  const token = await getIdTokenOrThrow()
  const response = await fetch(`${API_BASE_URL}/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ brandName: input.brandName, brandId: input.brandId || undefined }),
  })

  const data = await response.json().catch(() => null as any)
  if (!response.ok) {
    throw new Error((data && data.error) || '品牌批量删除失败')
  }
  return { deletedCount: Number(data?.deletedCount || 0) }
}

// 已切换为“后端签名 + 前端直传 S3”，不再需要 base64 编码上传

