/**
 * AWS Lambda 函数 - PFTryonUploadTool
 * 处理服装图片上传到 S3（私有存储桶）
 * Node.js 18.x (ES Module)
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

// 配置
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const BRAND_TABLE_NAME = process.env.BRAND_TABLE_NAME;
const SIGNED_URL_EXPIRATION = parseInt(process.env.SIGNED_URL_EXPIRATION || '86400'); // 1小时
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const OUTPUT_WIDTH = 768
const OUTPUT_HEIGHT = 1024

/**
 * 主处理函数
 */
export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  const startTime = Date.now();
  const requestId = event.requestContext?.requestId || 'unknown';

  console.log('========================================');
  console.log(`[PFTryonUploadTool] 请求开始 - RequestId: ${requestId}`);
  console.log(`[PFTryonUploadTool] 方法: ${event.httpMethod}`);
  console.log(`[PFTryonUploadTool] 路径: ${event.path}`);

  // CORS 预检请求处理
  if (event.httpMethod === 'OPTIONS') {
    console.log(`[PFTryonUploadTool] OPTIONS 请求，返回 CORS 响应`);
    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: ''
    };
  }

  try {
    const auth = getAuthInfo(event)
    if (!auth.userId) {
      return createErrorResponse(401, 'Unauthorized')
    }
    if (!auth.groups?.includes('Admin')) {
      return createErrorResponse(403, 'Forbidden')
    }

    const path = String(event.path || '')
    console.log(`[PFTryonUploadTool] auth ok - requestId=${requestId}, userId=${auth.userId}, groups=${(auth.groups || []).join(',')}`)

    // /upload/prepare: 生成 presigned PUT URL（前端直传 S3）
    if (path.endsWith('/upload/prepare')) {
      const t0 = Date.now()
      const body = safeJsonParse(event.body) || {}
      const { brandName, files } = body
      console.log(`[PFTryonUploadTool] prepare start - requestId=${requestId}, userId=${auth.userId}, brand=${String(brandName || '')}, files=${Array.isArray(files) ? files.length : 0}`)

      if (!brandName || !String(brandName).trim()) {
        return createErrorResponse(400, '品牌名称不能为空')
      }
      if (!files || !Array.isArray(files) || files.length === 0) {
        return createErrorResponse(400, '请至少上传一个文件')
      }

      const safeBrandName = sanitizeForUrl(String(brandName))
      const safeUserId = sanitizeForUrl(String(auth.userId))

      const items = []
      for (const f of files) {
        const name = String(f?.name || '')
        const type = String(f?.type || '')
        const size = Number(f?.size || 0)
        if (!name) {
          items.push({ fileName: name || '(unknown)', success: false, error: '文件名不能为空' })
          continue
        }
        if (!ALLOWED_MIME_TYPES.includes(type)) {
          items.push({ fileName: name, success: false, error: `不支持的文件类型: ${type}` })
          continue
        }
        if (!Number.isFinite(size) || size <= 0) {
          items.push({ fileName: name, success: false, error: '文件大小不合法' })
          continue
        }
        if (size > MAX_FILE_SIZE) {
          items.push({ fileName: name, success: false, error: `文件大小超过限制（最大 10MB）` })
          continue
        }

        const timestamp = Date.now()
        const safeFileName = sanitizeFileName(name)
        const jpgFileName = replaceFileExtToJpg(safeFileName)
        const key = `${safeUserId}/${safeBrandName}/${timestamp}-${jpgFileName}`

        // 预签名 PUT：允许前端直接上传二进制
        // 注意：浏览器端 PUT 时如果携带了额外 headers，可能导致与签名不匹配而 403
        // 这里保持签名最简（仅 Bucket/Key），避免 SignedHeaders/hoist 差异带来的失败
        const putCmd = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        })

        const uploadUrl = await getSignedUrl(s3Client, putCmd, { expiresIn: 900 }) // 15 分钟

        items.push({
          fileName: name,
          success: true,
          key,
          uploadUrl,
          method: 'PUT'
        })
      }

      const okCount = items.filter((x) => x?.success).length
      const badCount = items.length - okCount
      console.log(`[PFTryonUploadTool] prepare done - requestId=${requestId}, userId=${auth.userId}, ok=${okCount}, failed=${badCount}, ms=${Date.now() - t0}`)

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          brandName,
          items,
          note: '请在 15 分钟内使用 uploadUrl 直传到 S3；完成后调用 /upload/complete 进行登记',
        }),
      }
    }

    // /upload/complete: 校验对象存在 + 写 DynamoDB 关联 + 返回预签名 GET URL（用于前端立即展示）
    if (path.endsWith('/upload/complete')) {
      const t0 = Date.now()
      const body = safeJsonParse(event.body) || {}
      const { brandName, keys, items } = body
      console.log(
        `[PFTryonUploadTool] complete start - requestId=${requestId}, userId=${auth.userId}, brand=${String(brandName || '')}, keys=${Array.isArray(keys) ? keys.length : 0}, items=${Array.isArray(items) ? items.length : 0}`
      )

      if (!brandName || !String(brandName).trim()) {
        return createErrorResponse(400, '品牌名称不能为空')
      }
      const keyList = Array.isArray(items) ? items.map((x) => String(x?.key || '')).filter(Boolean) : keys
      if (!keyList || !Array.isArray(keyList) || keyList.length === 0) {
        return createErrorResponse(400, '请提供已上传成功的文件 keys')
      }

      const safeUserId = sanitizeForUrl(String(auth.userId))
      const requiredPrefix = `${safeUserId}/`
      const invalidPrefixCount = keyList.filter((k) => !String(k || '').startsWith(requiredPrefix)).length
      if (invalidPrefixCount > 0) {
        console.warn(`[PFTryonUploadTool] complete invalid keys prefix - requestId=${requestId}, userId=${auth.userId}, invalid=${invalidPrefixCount}`)
      }

      const results = []
      const nameByKey = new Map(
        Array.isArray(items)
          ? items.map((x) => [String(x?.key || ''), String(x?.fileName || '')])
          : []
      )
      const mimeByKey = new Map(
        Array.isArray(items)
          ? items.map((x) => [String(x?.key || ''), String(x?.mimeType || '')])
          : []
      )

      for (const k of keyList) {
        const key = String(k || '')
        if (!key.startsWith(requiredPrefix)) {
          console.warn(
            `[PFTryonUploadTool] complete key prefix mismatch - requestId=${requestId}, userId=${auth.userId}, requiredPrefix=${requiredPrefix}, key=${key}`
          )
          results.push({ key, success: false, error: 'Forbidden' })
          continue
        }
        try {
          // 确认对象存在 + 获取元信息
          const head = await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }))

          // 下载原图
          const obj = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }))
          const inputBuffer = await streamToBuffer(obj?.Body)

          // 等比缩放 + 居中裁剪到固定尺寸（不拉伸变形）
          // cover：保持纵横比，必要时裁剪
          // 优先使用前端上报的 mimeType（避免 PUT 未携带 Content-Type 导致 HeadObject 变成 application/octet-stream）
          const reported = String(mimeByKey.get(key) || '').toLowerCase()
          const headCt = String(head?.ContentType || '').toLowerCase()
          const ct = normalizeMimeType(reported || headCt)
          console.log(
            `[PFTryonUploadTool] complete image content-type - key=${key}, reported=${reported}, headCt=${headCt}, normalized=${ct}`
          )
          if (ct && !ALLOWED_MIME_TYPES.includes(ct) && ct !== 'application/octet-stream') {
            throw new Error(`不支持的文件类型: ${ct}`)
          }

          const { Jimp, MIME_JPEG } = await getJimpModule()
          let original
          try {
            const isWebp = ct === 'image/webp'

            if (isWebp) {
              // 优先尝试让 Jimp 自己解码 WebP，失败再使用 @jsquash/webp 兜底
              try {
                original = await Jimp.read(inputBuffer)
              } catch {
                const fallback = await decodeWebpToJimp(Jimp, inputBuffer)
                original = fallback
              }
            } else {
              // 非 WebP：统一走 Jimp.read
              original = await Jimp.read(inputBuffer)
            }
          } catch (e) {
            console.error(
              `[PFTryonUploadTool] Jimp.read failed - key=${key}, ct=${ct}, error=${e?.message || e}`
            )
            throw e
          }

          // 部分图片有 EXIF 方向信息（主要是手机照片）
          if (typeof original.exifRotate === 'function') {
            original.exifRotate()
          }

          console.log(
            `[PFTryonUploadTool] before resize - key=${key}, width=${original?.bitmap?.width}, height=${original?.bitmap?.height}`
          )

          // 等比缩放 + 居中裁剪到固定尺寸（不拉伸）
          const processed = coverCenter(original, OUTPUT_WIDTH, OUTPUT_HEIGHT)

          console.log(
            `[PFTryonUploadTool] after resize - key=${key}, width=${processed?.bitmap?.width}, height=${processed?.bitmap?.height}`
          )

          // 统一输出 JPG：透明背景铺白（PNG）
          // Jimp v1 requires object argument: { width, height, color }
          const bg = new Jimp({ width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT, color: 0xffffffff })
          bg.composite(processed, 0, 0)
          if (typeof bg.quality === 'function') bg.quality(90)

          const out = await bg.getBuffer(MIME_JPEG)

          // 写入 metadata（供 GetListTool 展示） + 覆盖写回同一 key
          const originalName = nameByKey.get(key) || key.split('/').slice(-1)[0] || ''
          const meta = {
            brand: Buffer.from(String(brandName), 'utf8').toString('base64'),
            originalname: Buffer.from(String(originalName), 'utf8').toString('base64'),
            owner: Buffer.from(String(auth.userId), 'utf8').toString('base64'),
            uploaddate: new Date().toISOString(),
          }

          await s3Client.send(
            new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: key,
              Body: out,
              ContentType: 'image/jpeg',
              Metadata: meta,
            })
          )

          // 生成预签名 GET
          const getCmd = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
          const url = await getSignedUrl(s3Client, getCmd, { expiresIn: SIGNED_URL_EXPIRATION })
          results.push({ key, success: true, url, expiresIn: SIGNED_URL_EXPIRATION })
        } catch (e) {
          console.error(
            `[PFTryonUploadTool] complete error for key - requestId=${requestId}, userId=${auth.userId}, key=${key}, error=${e?.message || e}`
          )
          results.push({ key, success: false, error: e?.message || 'NOT_FOUND' })
        }
      }

      const successCount = results.filter((r) => r.success).length
      const failCount = results.length - successCount

      // 关联用户与品牌（DynamoDB）
      if (BRAND_TABLE_NAME && successCount > 0) {
        try {
          const now = new Date().toISOString()
          const cmd = new UpdateItemCommand({
            TableName: BRAND_TABLE_NAME,
            Key: {
              UserId: { S: auth.userId },
              BrandName: { S: String(brandName) },
            },
            UpdateExpression:
              'SET CreatedAt = if_not_exists(CreatedAt, :now), UpdatedAt = :now, Email = :email, Groups = :groups ADD UploadCount :inc',
            ExpressionAttributeValues: {
              ':now': { S: now },
              ':email': { S: auth.email || '' },
              ':groups': { S: (auth.groups || []).join(',') },
              ':inc': { N: String(successCount) },
            },
          })
          await ddbClient.send(cmd)
          console.log(`[PFTryonUploadTool] DynamoDB 已记录用户品牌关联: user=${auth.userId}, brand=${brandName}, +${successCount}`)
        } catch (e) {
          console.error('[PFTryonUploadTool] DynamoDB 记录失败:', e?.message || e)
        }
      }

      const totalTime = Date.now() - startTime
      console.log(`[PFTryonUploadTool] complete done - success=${successCount}, failed=${failCount}, ms=${totalTime}`)
      console.log(`[PFTryonUploadTool] complete done (detail) - requestId=${requestId}, userId=${auth.userId}, ms=${Date.now() - t0}`)

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          message: `上传完成：成功 ${successCount} 个，失败 ${failCount} 个`,
          brandName,
          results,
          summary: { total: results.length, success: successCount, failed: failCount },
          note: `图片 URL 为临时访问链接，有效期约 ${Math.round(SIGNED_URL_EXPIRATION / 3600)} 小时`,
        }),
      }
    }

    // 兼容：旧的 /upload base64 JSON 上传（不推荐，可能触发 413）
    console.warn(`[PFTryonUploadTool] legacy /upload(base64) called - requestId=${requestId}, userId=${auth.userId} (may hit 413)`)
    // 解析请求体
    const body = JSON.parse(event.body);
    const { brandName, files } = body;

    console.log(`[PFTryonUploadTool] 品牌名称: ${brandName}`);
    console.log(`[PFTryonUploadTool] 文件数量: ${files?.length || 0}`);

    // 验证输入
    if (!brandName || !brandName.trim()) {
      return createErrorResponse(400, '品牌名称不能为空');
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return createErrorResponse(400, '请至少上传一个文件');
    }

    // 处理每个文件
    const uploadResults = [];
    console.log(`[PFTryonUploadTool] 开始处理文件上传...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileStartTime = Date.now();

      console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 处理文件: ${file.name}`);

      try {
        // 验证文件
        const validation = validateFile(file);
        if (!validation.valid) {
          console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 验证失败: ${validation.error}`);
          uploadResults.push({
            fileName: file.name,
            success: false,
            error: validation.error
          });
          continue;
        }

        // 生成文件路径（按用户隔离：userId/brand/...）
        const timestamp = Date.now();
        const safeBrandName = sanitizeForUrl(brandName);
        const safeFileName = sanitizeFileName(file.name);
        const safeUserId = sanitizeForUrl(auth.userId);
        const fileKey = `${safeUserId}/${safeBrandName}/${timestamp}-${safeFileName}`;

        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 原始品牌: ${brandName}`);
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 安全品牌: ${safeBrandName}`);
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 用户ID: ${auth.userId}`);
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 原始文件名: ${file.name}`);
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 安全文件名: ${safeFileName}`);
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 文件路径: ${fileKey}`);

        // 解码 Base64 文件内容
        const fileBuffer = Buffer.from(file.content, 'base64');
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 文件大小: ${(fileBuffer.length / 1024).toFixed(2)} KB`);

        // 上传到 S3（私有）
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 开始上传到 S3...`);

        // S3 元数据只能包含 ASCII 字符，需要对非 ASCII 字符进行 Base64 编码
        const uploadCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
          Body: fileBuffer,
          ContentType: file.type,
          Metadata: {
            brand: Buffer.from(brandName, 'utf8').toString('base64'),              // Base64 编码品牌名（支持中日文）
            originalname: Buffer.from(file.name, 'utf8').toString('base64'),      // Base64 编码文件名（支持中日文）
            owner: Buffer.from(String(auth.userId), 'utf8').toString('base64'),   // 记录上传者（用于排查/审计）
            uploaddate: new Date().toISOString()
          }
        });

        await s3Client.send(uploadCommand);
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 上传成功`);

        // 生成预签名 URL（临时访问链接）
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 生成预签名 URL...`);
        const getCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey
        });

        const signedUrl = await getSignedUrl(s3Client, getCommand, {
          expiresIn: SIGNED_URL_EXPIRATION
        });

        const fileProcessTime = Date.now() - fileStartTime;
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 完成，耗时: ${fileProcessTime}ms`);

        uploadResults.push({
          fileName: file.name,
          success: true,
          url: signedUrl,
          key: fileKey,
          size: fileBuffer.length,
          expiresIn: SIGNED_URL_EXPIRATION
        });

      } catch (fileError) {
        console.error(`[PFTryonUploadTool] [${i + 1}/${files.length}] 错误:`, fileError.message);
        console.error(`[PFTryonUploadTool] [${i + 1}/${files.length}] 错误堆栈:`, fileError.stack);
        uploadResults.push({
          fileName: file.name,
          success: false,
          error: fileError.message
        });
      }
    }

    // 统计结果
    const successCount = uploadResults.filter(r => r.success).length;
    const failCount = uploadResults.filter(r => !r.success).length;

    // 关联用户与品牌（DynamoDB）
    if (BRAND_TABLE_NAME && successCount > 0) {
      try {
        const now = new Date().toISOString()
        const cmd = new UpdateItemCommand({
          TableName: BRAND_TABLE_NAME,
          Key: {
            UserId: { S: auth.userId },
            BrandName: { S: brandName },
          },
          UpdateExpression:
            'SET CreatedAt = if_not_exists(CreatedAt, :now), UpdatedAt = :now, Email = :email, Groups = :groups ADD UploadCount :inc',
          ExpressionAttributeValues: {
            ':now': { S: now },
            ':email': { S: auth.email || '' },
            ':groups': { S: (auth.groups || []).join(',') },
            ':inc': { N: String(successCount) },
          },
        })
        await ddbClient.send(cmd)
        console.log(`[PFTryonUploadTool] DynamoDB 已记录用户品牌关联: user=${auth.userId}, brand=${brandName}, +${successCount}`)
      } catch (e) {
        console.error('[PFTryonUploadTool] DynamoDB 记录失败:', e?.message || e)
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[PFTryonUploadTool] ========================================`);
    console.log(`[PFTryonUploadTool] 上传完成 - 成功: ${successCount}, 失败: ${failCount}`);
    console.log(`[PFTryonUploadTool] 总耗时: ${totalTime}ms`);
    console.log(`[PFTryonUploadTool] RequestId: ${requestId}`);
    console.log(`[PFTryonUploadTool] ========================================`);

    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        message: `上传完成：成功 ${successCount} 个，失败 ${failCount} 个`,
        brandName,
        results: uploadResults,
        summary: {
          total: uploadResults.length,
          success: successCount,
          failed: failCount
        },
        note: `图片 URL 为临时访问链接，有效期约 ${Math.round(SIGNED_URL_EXPIRATION / 3600)} 小时`
      })
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[PFTryonUploadTool] ========================================`);
    console.error(`[PFTryonUploadTool] 请求失败 - RequestId: ${requestId}`);
    console.error(`[PFTryonUploadTool] 错误信息:`, error.message);
    console.error(`[PFTryonUploadTool] 错误堆栈:`, error.stack);
    console.error(`[PFTryonUploadTool] 耗时: ${totalTime}ms`);
    console.error(`[PFTryonUploadTool] ========================================`);
    return createErrorResponse(500, '服务器内部错误', error.message);
  }
};

function getAuthInfo(event) {
  const claims = event?.requestContext?.authorizer?.claims || {}
  const userId = claims.sub || claims['cognito:username'] || null
  const email = claims.email || null
  const rawGroups = claims['cognito:groups'] || claims['cognito:groups'.toLowerCase?.()] || null
  const groups = normalizeGroups(rawGroups)
  return { userId, email, groups }
}

function normalizeGroups(raw) {
  if (!raw) return null
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean)
  return null
}

function safeJsonParse(s) {
  try {
    if (!s) return null
    return JSON.parse(s)
  } catch {
    return null
  }
}

async function streamToBuffer(body) {
  if (!body) return Buffer.alloc(0)
  if (Buffer.isBuffer(body)) return body
  if (body instanceof Uint8Array) return Buffer.from(body)
  if (typeof body === 'string') return Buffer.from(body)

  const chunks = []
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

let __jimpCache = null
async function getJimpModule() {
  if (__jimpCache) return __jimpCache
  const mod = await import('jimp')

  // 兼容不同版本/导出形态
  const Jimp = mod.Jimp || mod.default || mod
  const MIME_JPEG = mod.MIME_JPEG || mod.JimpMime?.jpeg || 'image/jpeg'

  if (!Jimp || typeof Jimp.read !== 'function') {
    throw new Error('Jimp_NOT_AVAILABLE')
  }

  __jimpCache = { Jimp, MIME_JPEG }
  return __jimpCache
}

function coverCenter(img, targetW, targetH) {
  // 优先使用 cover（如果版本支持）
  if (typeof img.cover === 'function') {
    try {
      // Jimp v1 requires object argument: { w, h }
      img.cover({ w: targetW, h: targetH })
      return img
    } catch (e) {
      // 如果对象参数失败，尝试旧版参数（兼容性）
      try {
        img.cover(targetW, targetH)
        return img
      } catch {
        // fallback below
      }
    }
  }

  const w = img.bitmap?.width || 1
  const h = img.bitmap?.height || 1
  const scale = Math.max(targetW / w, targetH / h)
  const rw = Math.max(targetW, Math.round(w * scale))
  const rh = Math.max(targetH, Math.round(h * scale))

  // Jimp v1 requires object argument
  try {
    img.resize({ w: rw, h: rh })
  } catch {
    img.resize(rw, rh)
  }

  const x = Math.max(0, Math.floor((rw - targetW) / 2))
  const y = Math.max(0, Math.floor((rh - targetH) / 2))

  try {
    img.crop({ x, y, w: targetW, h: targetH })
  } catch {
    img.crop(x, y, targetW, targetH)
  }

  return img
}

function normalizeMimeType(mime) {
  const m = String(mime || '').toLowerCase().trim()
  if (!m) return ''
  // 处理常见的带参数 Content-Type（例如 image/jpeg; charset=binary）
  const semi = m.indexOf(';')
  const clean = semi >= 0 ? m.slice(0, semi).trim() : m
  // 某些客户端会把 jpg 写成 image/jpg
  if (clean === 'image/jpg') return 'image/jpeg'
  return clean
}

let __webpCache = null
async function getWebpModule() {
  if (__webpCache) return __webpCache
  const mod = await import('@jsquash/webp')
  const decode = mod.decode || mod.default?.decode || mod.default
  if (typeof decode !== 'function') {
    throw new Error('WEBP_DECODE_NOT_AVAILABLE')
  }
  __webpCache = { decode }
  return __webpCache
}

async function decodeWebpToJimp(Jimp, inputBuffer) {
  const { decode } = await getWebpModule()
  // @jsquash/webp 期望 Uint8Array
  const imgData = await decode(new Uint8Array(inputBuffer))
  const width = imgData?.width
  const height = imgData?.height
  const data = imgData?.data
  if (!width || !height || !data) {
    throw new Error('WEBP_DECODE_FAILED')
  }

  const buf = Buffer.from(data)

  // 兼容 Jimp v1 的构造方式
  try {
    return new Jimp({ data: buf, width, height })
  } catch {
    return await new Promise((resolve, reject) => {
      // eslint-disable-next-line new-cap
      new Jimp({ data: buf, width, height }, (err, image) => {
        if (err) return reject(err)
        resolve(image)
      })
    })
  }
}

/**
 * 将字符串转换为 URL 安全格式
 * 保留英文、数字、连字符，其他字符转换为 URL 编码
 */
function sanitizeForUrl(str) {
  // 移除首尾空格
  str = String(str || '').trim();

  // 替换空格为连字符
  str = str.replace(/\s+/g, '-');

  // 对中文、日文等非 ASCII 字符进行 URL 编码
  str = encodeURIComponent(str);

  // 替换编码后的某些字符使其更可读
  str = str.replace(/%20/g, '-');

  return str;
}

/**
 * 生成安全的文件名
 * 保留原始扩展名，对文件名主体进行安全转换
 */
function sanitizeFileName(fileName) {
  // 分离文件名和扩展名
  const lastDotIndex = fileName.lastIndexOf('.');
  let name = fileName;
  let ext = '';

  if (lastDotIndex > 0) {
    name = fileName.substring(0, lastDotIndex);
    ext = fileName.substring(lastDotIndex); // 包含点号
  }

  // 清理文件名主体
  name = sanitizeForUrl(name);

  // 如果文件名被完全编码（全是非ASCII字符），使用时间戳
  if (name.length > 100 || name.includes('%')) {
    name = Date.now().toString();
  }

  return name + ext.toLowerCase();
}

function replaceFileExtToJpg(fileName) {
  const n = String(fileName || '')
  const i = n.lastIndexOf('.')
  const base = i > 0 ? n.slice(0, i) : n
  return `${base}.jpg`
}

/**
 * 验证文件
 */
function validateFile(file) {
  if (!file.name) {
    return { valid: false, error: '文件名不能为空' };
  }

  if (!file.type) {
    return { valid: false, error: '文件类型不能为空' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `不支持的文件类型: ${file.type}` };
  }

  if (!file.content) {
    return { valid: false, error: '文件内容不能为空' };
  }

  // 估算文件大小（Base64 编码后的大小约为原始大小的 4/3）
  const estimatedSize = (file.content.length * 3) / 4;
  if (estimatedSize > MAX_FILE_SIZE) {
    return { valid: false, error: `文件大小超过限制（最大 10MB）` };
  }

  return { valid: true };
}

/**
 * 创建错误响应
 */
function createErrorResponse(statusCode, message, details = null) {
  const body = { error: message };
  if (details) {
    body.details = details;
  }

  return {
    statusCode,
    headers: getCorsHeaders(),
    body: JSON.stringify(body)
  };
}

/**
 * 获取 CORS 响应头
 */
function getCorsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // 生产环境中应该设置具体的域名
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE'
  };
}
