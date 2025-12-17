/**
 * AWS Lambda 函数 - PFTryonUploadTool
 * 处理服装图片上传到 S3（私有存储桶）
 * Node.js 18.x (ES Module)
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, UpdateItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

// 配置
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const BRAND_TABLE_NAME = process.env.BRAND_TABLE_NAME;
const SIGNED_URL_EXPIRATION = parseInt(process.env.SIGNED_URL_EXPIRATION || '86400'); // 1小时
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
    const path = String(event.path || '')
    const groupsStr = (auth.groups || []).join(',')
    console.log(`[PFTryonUploadTool] auth ok - requestId=${requestId}, userId=${auth.userId}, groups=${groupsStr}`)

    // 权限策略：
    // - /config/*：仅 SuperAdmin
    // - /upload/*：Admin 或 SuperAdmin
    const isSuperAdmin = Array.isArray(auth.groups) && auth.groups.includes('SuperAdmin')
    const isAdmin = Array.isArray(auth.groups) && auth.groups.includes('Admin')
    const isUploadPath = path.includes('/upload')
    const isConfigPath = path.includes('/config')
    const isBrandAdminPath = path.includes('/brand/')
    if (isConfigPath && !isSuperAdmin) {
      return createErrorResponse(403, 'Forbidden')
    }
    if (isBrandAdminPath && !isSuperAdmin) {
      return createErrorResponse(403, 'Forbidden')
    }
    if (isUploadPath && !(isAdmin || isSuperAdmin)) {
      return createErrorResponse(403, 'Forbidden')
    }

    // /brand/listAll: SuperAdmin 获取全局品牌列表（来自 DynamoDB 表）
    if (path.endsWith('/brand/listAll')) {
      const t0 = Date.now()
      if (!BRAND_TABLE_NAME) return createErrorResponse(500, 'BRAND_TABLE_NAME 未配置')

      const items = []
      const seen = new Set()
      let lastKey = undefined
      let scanned = 0
      // 简单分页扫描，避免一次性太大（SuperAdmin 专用）
      for (let page = 0; page < 20; page++) {
        const resp = await ddbClient.send(
          new ScanCommand({
            TableName: BRAND_TABLE_NAME,
            ProjectionExpression: 'UserId, BrandId, BrandName, CreatedAt, UpdatedAt, UploadCount',
            ExclusiveStartKey: lastKey,
            Limit: 500,
          })
        )
        const arr = resp?.Items || []
        scanned += arr.length
        for (const it of arr) {
          const userId = it?.UserId?.S || ''
          const brandId = it?.BrandId?.S || ''
          const brandName = it?.BrandName?.S || ''
          if (!userId || !brandId || !brandName) continue
          const k = `${userId}::${brandId}`
          if (seen.has(k)) continue
          seen.add(k)
          items.push({
            userId,
            brandId,
            brandName,
            createdAt: it?.CreatedAt?.S || null,
            updatedAt: it?.UpdatedAt?.S || null,
            uploadCount: Number(it?.UploadCount?.N || 0),
          })
        }
        lastKey = resp?.LastEvaluatedKey
        if (!lastKey) break
      }

      items.sort((a, b) => String(a.brandName).localeCompare(String(b.brandName)))
      console.log(`[PFTryonUploadTool] brand listAll done - requestId=${requestId}, userId=${auth.userId}, count=${items.length}, scanned=${scanned}, ms=${Date.now() - t0}`)
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({ success: true, items }),
      }
    }

    // /config/prepare: 生成 JSON 配置的 presigned PUT URL（SuperAdmin 专用）
    if (path.endsWith('/config/prepare')) {
      const t0 = Date.now()
      const body = safeJsonParse(event.body) || {}
      const fileName = String(body?.fileName || 'config.json')
      const size = Number(body?.size || 0)
      const mimeType = String(body?.mimeType || 'application/json').toLowerCase()

      const brandId = String(body?.brandId || '').trim()
      if (!brandId) return createErrorResponse(400, 'brandId 不能为空')
      if (!Number.isFinite(size) || size <= 0) return createErrorResponse(400, '文件大小不合法')
      if (size > 2 * 1024 * 1024) return createErrorResponse(400, '文件过大（最大 2MB）')

      const lower = fileName.toLowerCase()
      if (!lower.endsWith('.json') || (mimeType && mimeType !== 'application/json' &&   mimeType !== 'text/json')) {
        return createErrorResponse(400, '仅支持 JSON 文件')
      }

      const safeBrandId = sanitizeForUrl(brandId)
      const safeFileName = replaceFileExtToJson(sanitizeFileName(fileName))
      // SuperAdmin 管理配置：不需要 userId 前缀，直接按 brandId 归档
      const key = `${safeBrandId}/config/${safeFileName}`

      const putCmd = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
      const uploadUrl = await getSignedUrl(s3Client, putCmd, { expiresIn: 900 })

      console.log(`[PFTryonUploadTool] config prepare done - requestId=${requestId}, userId=${auth.userId}, brandId=${brandId}, key=${key}, ms=${Date.now() - t0}`)
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({ success: true, key, uploadUrl, method: 'PUT' }),
      }
    }

    // /config/complete: 校验对象存在 + 返回预签名 GET URL（SuperAdmin 专用）
    if (path.endsWith('/config/complete')) {
      const t0 = Date.now()
      const body = safeJsonParse(event.body) || {}
      const key = String(body?.key || '')

      const brandId = String(body?.brandId || '').trim()
      if (!key) return createErrorResponse(400, 'key 不能为空')
      if (!brandId) return createErrorResponse(400, 'brandId 不能为空')
      // 安全校验：必须在 {brandId}/config/ 下（避免 SuperAdmin 任意写桶内其他位置）
      const requiredPrefix = `${sanitizeForUrl(brandId)}/config/`
      if (!key.startsWith(requiredPrefix)) return createErrorResponse(403, 'Forbidden')

      try {
        await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }))
        const getCmd = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
        const url = await getSignedUrl(s3Client, getCmd, { expiresIn: SIGNED_URL_EXPIRATION })
        console.log(`[PFTryonUploadTool] config complete done - requestId=${requestId}, userId=${auth.userId}, key=${key}, ms=${Date.now() - t0}`)
        return {
          statusCode: 200,
          headers: getCorsHeaders(),
          body: JSON.stringify({ success: true, key, url, expiresIn: SIGNED_URL_EXPIRATION }),
        }
      } catch (e) {
        console.error(`[PFTryonUploadTool] config complete error - requestId=${requestId}, userId=${auth.userId}, key=${key}, error=${e?.message || e}`)
        return createErrorResponse(500, '配置上传确认失败', e?.message || String(e))
      }
    }

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

      // 获取或创建品牌 ID
      const brandId = await getBrandId(auth.userId, String(brandName).trim(), auth.email, auth.groups)
      console.log(`[PFTryonUploadTool] prepare brandId - requestId=${requestId}, userId=${auth.userId}, brandName=${brandName}, brandId=${brandId}`)

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


        const safeFileName = sanitizeFileName(name)
        const jpgFileName = replaceFileExtToJpg(safeFileName)
        // 使用 brandId 而不是 brandName 构建 S3 key
        const key = `${safeUserId}/${brandId}/${jpgFileName}`

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
      console.log(`[PFTryonUploadTool] prepare done - requestId=${requestId}, userId=${auth.userId}, brandId=${brandId}, ok=${okCount}, failed=${badCount}, ms=${Date.now() - t0}`)

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          brandName,
          brandId, // 返回 brandId 给前端
          items,
          note: '请在 15 分钟内使用 uploadUrl 直传到 S3；完成后调用 /upload/complete 进行登记',
        }),
      }
    }

    // /upload/complete: 校验对象存在 + 写 DynamoDB 关联 + 返回预签名 GET URL（用于前端立即展示）
    if (path.endsWith('/upload/complete')) {
      const t0 = Date.now()
      const body = safeJsonParse(event.body) || {}
      const { brandName, brandId, keys, items } = body
      console.log(
        `[PFTryonUploadTool] complete start - requestId=${requestId}, userId=${auth.userId}, brandName=${String(brandName || '')}, brandId=${String(brandId || '')}, keys=${Array.isArray(keys) ? keys.length : 0}, items=${Array.isArray(items) ? items.length : 0}`
      )

      // brandId 是必需的（由 /upload/prepare 返回）
      if (!brandId || !String(brandId).trim()) {
        return createErrorResponse(400, 'brandId 不能为空')
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
          // 不再在 Lambda 内做图片解码/resize/转码。
          // 这里仅做对象存在校验，并通过 CopyObject 方式“替换写入 metadata / content-type”，不改动对象内容。
          // 优先使用前端上报的 mimeType（避免 PUT 未携带 Content-Type 导致 HeadObject 变成 application/octet-stream）
          const reported = String(mimeByKey.get(key) || '').toLowerCase()
          const headCt = String(head?.ContentType || '').toLowerCase()
          const ct = normalizeMimeType(reported || headCt)
          if (ct && !ALLOWED_MIME_TYPES.includes(ct) && ct !== 'application/octet-stream') {
            throw new Error(`不支持的文件类型: ${ct}`)
          }

          // 写入 metadata（供 GetListTool 展示） + 覆盖写回同一 key
          const originalName = nameByKey.get(key) || key.split('/').slice(-1)[0] || ''
          const meta = {
            brand: Buffer.from(String(brandName || ''), 'utf8').toString('base64'),
            brandid: Buffer.from(String(brandId), 'utf8').toString('base64'),
            originalname: Buffer.from(String(originalName), 'utf8').toString('base64'),
            owner: Buffer.from(String(auth.userId), 'utf8').toString('base64'),
            uploaddate: new Date().toISOString(),
          }

          const copySource = encodeS3CopySource(BUCKET_NAME, key)
          const copyParams = {
            Bucket: BUCKET_NAME,
            Key: key,
            CopySource: copySource,
            MetadataDirective: 'REPLACE',
            Metadata: meta,
          }
          // 仅当 content-type 合法且可识别时才显式设置，避免错误覆盖
          if (ct && ct !== 'application/octet-stream') {
            copyParams.ContentType = ct
          }
          await s3Client.send(new CopyObjectCommand(copyParams))

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

      // 更新品牌上传计数（DynamoDB）
      if (BRAND_TABLE_NAME && successCount > 0) {
        try {
          const now = new Date().toISOString()
          const cmd = new UpdateItemCommand({
            TableName: BRAND_TABLE_NAME,
            Key: {
              UserId: { S: auth.userId },
              BrandId: { S: String(brandId) },
            },
            UpdateExpression:
              'SET UpdatedAt = :now, Email = :email, Groups = :groups ADD UploadCount :inc',
            ExpressionAttributeValues: {
              ':now': { S: now },
              ':email': { S: auth.email || '' },
              ':groups': { S: (auth.groups || []).join(',') },
              ':inc': { N: String(successCount) },
            },
          })
          await ddbClient.send(cmd)
          console.log(`[PFTryonUploadTool] DynamoDB 已更新品牌上传计数: user=${auth.userId}, brandId=${brandId}, +${successCount}`)
        } catch (e) {
          console.error('[PFTryonUploadTool] DynamoDB 更新失败:', e?.message || e)
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

function encodeS3CopySource(bucket, key) {
  // CopySource 需要 URL-encode，但保持 "/" 不被编码
  const encodedKey = encodeURIComponent(String(key || '')).replace(/%2F/g, '/')
  return `${bucket}/${encodedKey}`
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

function replaceFileExtToJson(fileName) {
  const n = String(fileName || '')
  const i = n.lastIndexOf('.')
  const base = i > 0 ? n.slice(0, i) : n
  return `${base}.json`
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

/**
 * 获取或创建品牌 ID
 * 通过 GSI 查询品牌名称，如果不存在则创建新品牌
 */
async function getBrandId(userId, brandName, email, groups) {
  try {
    // 通过 GSI 查询品牌名称
    const queryCmd = new QueryCommand({
      TableName: BRAND_TABLE_NAME,
      IndexName: 'BrandNameIndex',
      KeyConditionExpression: 'UserId = :userId AND BrandName = :brandName',
      ExpressionAttributeValues: {
        ':userId': { S: userId },
        ':brandName': { S: brandName }
      },
      Limit: 1
    })

    const result = await ddbClient.send(queryCmd)

    if (result.Items && result.Items.length > 0) {
      // 品牌已存在，返回现有的 BrandId
      const brandId = result.Items[0].BrandId?.S
      console.log(`[getBrandId] Found existing brand - userId=${userId}, brandName=${brandName}, brandId=${brandId}`)
      return brandId
    }

    // 品牌不存在，创建新品牌
    const newBrandId = randomUUID()
    await createBrand(userId, newBrandId, brandName, email, groups)
    console.log(`[getBrandId] Created new brand - userId=${userId}, brandName=${brandName}, brandId=${newBrandId}`)
    return newBrandId
  } catch (error) {
    console.error(`[getBrandId] Error - userId=${userId}, brandName=${brandName}, error=${error.message}`)
    throw error
  }
}

/**
 * 创建新品牌记录
 */
async function createBrand(userId, brandId, brandName, email, groups) {
  const now = new Date().toISOString()
  const cmd = new UpdateItemCommand({
    TableName: BRAND_TABLE_NAME,
    Key: {
      UserId: { S: userId },
      BrandId: { S: brandId }
    },
    UpdateExpression:
      'SET BrandName = :brandName, CreatedAt = :now, UpdatedAt = :now, Email = :email, Groups = :groups, UploadCount = :zero',
    ExpressionAttributeValues: {
      ':brandName': { S: brandName },
      ':now': { S: now },
      ':email': { S: email || '' },
      ':groups': { S: (groups || []).join(',') },
      ':zero': { N: '0' }
    }
  })
  await ddbClient.send(cmd)
}

