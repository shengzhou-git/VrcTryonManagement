/**
 * AWS Lambda 函数 - PFTryonGetListTool
 * 获取服装图片列表（使用预签名 URL）
 * Node.js 20.x (ES Module)
 */

import { S3Client, ListObjectsV2Command, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const BRAND_TABLE_NAME = process.env.BRAND_TABLE_NAME;
const SIGNED_URL_EXPIRATION = parseInt(process.env.SIGNED_URL_EXPIRATION || '3600'); // 1小时

/**
 * 主处理函数
 */
export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  const startTime = Date.now();
  const requestId = event.requestContext?.requestId || 'unknown';
  
  console.log('========================================');
  console.log(`[PFTryonGetListTool] 请求开始 - RequestId: ${requestId}`);
  console.log(`[PFTryonGetListTool] 方法: ${event.httpMethod}`);
  console.log(`[PFTryonGetListTool] 路径: ${event.path}`);

  // CORS 预检请求处理
  if (event.httpMethod === 'OPTIONS') {
    console.log(`[PFTryonGetListTool] OPTIONS 请求，返回 CORS 响应`);
    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: ''
    };
  }

  try {
    const auth = getAuthInfo(event)
    if (!auth.userId) {
      return {
        statusCode: 401,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }
    const isSuperAdmin = auth.groups?.includes('SuperAdmin')
    const ok = auth.groups?.includes('Admin') || auth.groups?.includes('ViewData') || isSuperAdmin
    if (!ok) {
      return {
        statusCode: 403,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: 'Forbidden' }),
      }
    }

    // 解析请求体（现在使用 POST）
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (parseError) {
        console.error(`[PFTryonGetListTool] 解析请求体失败:`, parseError);
      }
    }
    
    const brand = String(body.brand || '').trim(); // 兼容：brandName 过滤（旧前端）
    const brandId = String(body.brandId || '').trim(); // 推荐：brandId 精确过滤
    const targetUserId = String(body.userId || '').trim(); // 兼容旧前端：保留但新 Key 不再依赖
    const limit = Math.max(1, Math.min(200, Number(body.limit || 60))) // 默认 60
    const cursor = body.cursor ? String(body.cursor) : null // S3 ContinuationToken

    // 重要：图片 Key 格式已调整为 brandId/filename（去掉 userId 前缀）
    // 访问控制：
    // - SuperAdmin：可按 brandId 访问任意品牌
    // - 普通用户：只能访问“属于自己”的 brandId（查 DynamoDB 校验/枚举）
    const safeBrandId = brandId ? sanitizeForUrl(brandId) : ''

    console.log(`[PFTryonGetListTool] 请求参数 - 品牌筛选: ${brand || '全部'}`);
    console.log(`[PFTryonGetListTool] brandId: ${brandId || '(empty)'} targetUserId: ${targetUserId || '(empty)'} cursor: ${cursor || '(null)'}`);

    async function listOnePrefix(prefix, continuationToken) {
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        MaxKeys: limit,
        ...(continuationToken ? { ContinuationToken: continuationToken } : {})
      })
      return await s3Client.send(listCommand)
    }

    async function getBrandIdsForUser(userId) {
      if (!BRAND_TABLE_NAME) throw new Error('BRAND_TABLE_NAME 未配置')
      const ids = []
      let lastKey = undefined
      for (let page = 0; page < 50; page++) {
        const resp = await ddbClient.send(
          new QueryCommand({
            TableName: BRAND_TABLE_NAME,
            KeyConditionExpression: 'UserId = :userId',
            ExpressionAttributeValues: { ':userId': { S: String(userId) } },
            ProjectionExpression: 'BrandId',
            ExclusiveStartKey: lastKey,
            Limit: 200,
          })
        )
        const arr = resp?.Items || []
        for (const it of arr) {
          const bid = it?.BrandId?.S || ''
          if (bid) ids.push(String(bid))
        }
        lastKey = resp?.LastEvaluatedKey
        if (!lastKey) break
      }
      return ids
    }

    // 先确定要 list 的前缀集合
    let prefixes = []
    if (safeBrandId) {
      // brandId 指定：按单个品牌列出
      if (!isSuperAdmin) {
        // 普通用户必须校验 brandId 归属
        const owns = await getBrandIdsForUser(auth.userId)
        if (!owns.includes(brandId)) {
          return {
            statusCode: 403,
            headers: getCorsHeaders(),
            body: JSON.stringify({ error: 'Forbidden' }),
          }
        }
      }
      prefixes = [`${safeBrandId}/`]
    } else {
      // 未指定 brandId：
      // - SuperAdmin：避免误扫全桶，直接返回空（前端 SuperAdmin 实际总是按 brandId 访问）
      // - 普通用户：枚举该用户拥有的 brandIds，并聚合返回（最多 limit 张）
      if (isSuperAdmin) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: 'brandId 不能为空' }),
        }
      }
      const owns = await getBrandIdsForUser(auth.userId)
      prefixes = owns.map((x) => `${sanitizeForUrl(x)}/`)
    }

    // 列出 S3 对象
    console.log(`[PFTryonGetListTool] 开始列出 S3 对象... prefixes=${prefixes.join(',') || '(none)'}`);
    const allObjects = []
    let nextCursor = null
    let hasMore = false
    if (prefixes.length === 1) {
      const s3Data = await listOnePrefix(prefixes[0], cursor)
      allObjects.push(...(s3Data.Contents || []))
      nextCursor = s3Data?.NextContinuationToken || null
      hasMore = !!s3Data?.IsTruncated
    } else {
      // 多前缀聚合：不支持 cursor 分页（避免复杂度爆炸），只返回前 limit 张
      for (const p of prefixes) {
        if (allObjects.length >= limit) break
        const s3Data = await listOnePrefix(p, null)
        const arr = s3Data.Contents || []
        for (const o of arr) {
          allObjects.push(o)
          if (allObjects.length >= limit) break
        }
      }
      nextCursor = null
      hasMore = false
    }
    const objectCount = allObjects.length
    console.log(`[PFTryonGetListTool] 找到 ${objectCount} 个对象`);

    // 处理结果
    const images = [];
    console.log(`[PFTryonGetListTool] 开始处理对象元数据和生成预签名 URL...`);

    for (let i = 0; i < allObjects.length; i++) {
      const object = allObjects[i];
      
      try {
        console.log(`[PFTryonGetListTool] [${i + 1}/${objectCount}] 处理: ${object.Key}`);
        
        // 获取对象元数据
        const headCommand = new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: object.Key
        });

        const metadata = await s3Client.send(headCommand);

        // Key 格式：brandId/filename 或 brandId/config/filename
        const pathParts = object.Key.split('/');
        const objectBrandId = pathParts[0] || '';
        const objectFolder = pathParts[1] || '';
        const fileName = pathParts[pathParts.length - 1];
        const lowerFileName = String(fileName || '').toLowerCase()

        // gallery 只展示图片，过滤掉配置文件目录
        if (objectFolder === 'config') {
          continue
        }
        // 过滤非图片文件（例如 gender-map.json / 配置 JSON）
        if (lowerFileName.endsWith('.json')) {
          continue
        }

        // 生成预签名 URL（临时访问链接）
        const getCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: object.Key
        });

        const signedUrl = await getSignedUrl(s3Client, getCommand, {
          expiresIn: SIGNED_URL_EXPIRATION
        });

        console.log(`[PFTryonGetListTool] [${i + 1}/${objectCount}] 生成预签名 URL 成功`);

        // 解码元数据（从 Base64 解码，支持中日文）
        let decodedBrand;
        try {
          decodedBrand = metadata.Metadata?.brand 
            ? decodeBase64Metadata(metadata.Metadata.brand) 
            : safeDecodeURIComponent(objectBrandId);
        } catch (error) {
          console.warn(`[PFTryonGetListTool] 品牌名解码失败: ${error.message}, 使用原始值`);
          decodedBrand = objectBrandId;
        }
        
        const decodedFileName = metadata.Metadata?.originalname 
          ? decodeBase64Metadata(metadata.Metadata.originalname) 
          : fileName;

        // 过滤：brandId（优先）或 brandName
        if (brandId && objectBrandId !== sanitizeForUrl(brandId)) {
          continue
        }
        if (brand && decodedBrand !== brand) {
          continue
        }

        images.push({
          // 使用 Key 保证唯一性（ETag 可能重复，导致前端 key 冲突）
          id: object.Key,
          name: decodedFileName,
          brand: decodedBrand,
          brandId: objectBrandId,
          url: signedUrl,
          key: object.Key,
          size: object.Size,
          uploadDate: object.LastModified,
          type: metadata.ContentType,
          urlExpiresIn: SIGNED_URL_EXPIRATION
        });
      } catch (metadataError) {
        console.error(`[PFTryonGetListTool] [${i + 1}/${objectCount}] 错误:`, metadataError.message);
        // 继续处理其他文件
      }
    }

    // 按上传日期降序排序
    images.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    console.log(`[PFTryonGetListTool] 排序完成`);

    const totalTime = Date.now() - startTime;
    console.log(`[PFTryonGetListTool] ========================================`);
    console.log(`[PFTryonGetListTool] 查询完成 - 返回 ${images.length} 张图片`);
    console.log(`[PFTryonGetListTool] 总耗时: ${totalTime}ms`);
    console.log(`[PFTryonGetListTool] 平均处理时间: ${images.length > 0 ? (totalTime / images.length).toFixed(2) : 0}ms/图片`);
    console.log(`[PFTryonGetListTool] RequestId: ${requestId}`);
    console.log(`[PFTryonGetListTool] ========================================`);

    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        images,
        total: images.length,
        brand: brand || '全部',
        nextCursor,
        hasMore,
        note: `图片 URL 为临时访问链接，有效期约 ${Math.round(SIGNED_URL_EXPIRATION / 3600)} 小时`
      })
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[PFTryonGetListTool] ========================================`);
    console.error(`[PFTryonGetListTool] 请求失败 - RequestId: ${requestId}`);
    console.error(`[PFTryonGetListTool] 错误信息:`, error.message);
    console.error(`[PFTryonGetListTool] 错误堆栈:`, error.stack);
    console.error(`[PFTryonGetListTool] 耗时: ${totalTime}ms`);
    console.error(`[PFTryonGetListTool] ========================================`);
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        error: '获取图片列表失败',
        details: error.message
      })
    };
  }
};

function getAuthInfo(event) {
  const claims = event?.requestContext?.authorizer?.claims || {}
  const userId = claims.sub || claims['cognito:username'] || null
  const email = claims.email || null
  const rawGroups = claims['cognito:groups'] || null
  const groups = normalizeGroups(rawGroups)
  return { userId, email, groups }
}

function normalizeGroups(raw) {
  if (!raw) return null
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean)
  return null
}

function sanitizeForUrl(str) {
  str = String(str || '').trim()
  str = str.replace(/\s+/g, '-')
  str = encodeURIComponent(str)
  str = str.replace(/%20/g, '-')
  return str
}

/**
 * 解码 Base64 编码的元数据
 * 如果解码失败，返回原始值
 */
function decodeBase64Metadata(base64String) {
  try {
    if (!base64String) {
      return '';
    }
    return Buffer.from(base64String, 'base64').toString('utf8');
  } catch (error) {
    console.warn(`[PFTryonGetListTool] Base64 解码失败: ${error.message}, 返回原始值`);
    return base64String; // 如果解码失败，返回原始值
  }
}

/**
 * 安全地解码 URL 编码的字符串
 * 如果解码失败，返回原始值
 */
function safeDecodeURIComponent(encodedString) {
  try {
    if (!encodedString) {
      return '';
    }
    return decodeURIComponent(encodedString);
  } catch (error) {
    console.warn(`[PFTryonGetListTool] URL 解码失败: ${error.message}, 返回原始值`);
    return encodedString; // 如果解码失败，返回原始值
  }
}

/**
 * 获取 CORS 响应头
 */
function getCorsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE'
  };
}
