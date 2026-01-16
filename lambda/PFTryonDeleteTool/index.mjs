/**
 * AWS Lambda 函数 - PFTryonDeleteTool
 * 删除 S3 中的服装图片
 * Node.js 20.x (ES Module)
 */

import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { DynamoDBClient, DeleteItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const BRAND_TABLE_NAME = process.env.BRAND_TABLE_NAME;

/**
 * 主处理函数
 */
export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  const startTime = Date.now();
  const requestId = event.requestContext?.requestId || 'unknown';
  
  console.log('========================================');
  console.log(`[PFTryonDeleteTool] 请求开始 - RequestId: ${requestId}`);
  console.log(`[PFTryonDeleteTool] 方法: ${event.httpMethod}`);
  console.log(`[PFTryonDeleteTool] 路径: ${event.path}`);

  // CORS 预检请求处理
  if (event.httpMethod === 'OPTIONS') {
    console.log(`[PFTryonDeleteTool] OPTIONS 请求，返回 CORS 响应`);
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
    const ok = auth.groups?.includes('Admin') || auth.groups?.includes('SuperAdmin')
    if (!ok) {
      return {
        statusCode: 403,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: 'Forbidden' }),
      }
    }

    // 解析请求体
    const body = JSON.parse(event.body || '{}');
    const { keys, brandName, brandId } = body;

    const safeUserId = sanitizeForUrl(String(auth.userId))

    async function getBrandIdsForUser(userId) {
      if (!BRAND_TABLE_NAME) return []
      const out = []
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
          if (bid) out.push(String(bid))
        }
        lastKey = resp?.LastEvaluatedKey
        if (!lastKey) break
      }
      return out
    }

    const ownedBrandIds = new Set(await getBrandIdsForUser(auth.userId))

    async function deleteByPrefix(prefix) {
      let continuationToken = undefined
      let deletedCount = 0
      const errors = []
      let loop = 0

      while (true) {
        loop += 1
        const listRes = await s3Client.send(
          new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix,
            MaxKeys: 1000,
            ContinuationToken: continuationToken,
          })
        )

        const keysToDelete = (listRes.Contents || []).map((o) => o.Key).filter(Boolean)
        console.log(`[PFTryonDeleteTool] list page ${loop} - prefix=${prefix}, found=${keysToDelete.length}, truncated=${!!listRes.IsTruncated}`)

        if (keysToDelete.length > 0) {
          const delRes = await s3Client.send(
            new DeleteObjectsCommand({
              Bucket: BUCKET_NAME,
              Delete: {
                Objects: keysToDelete.map((k) => ({ Key: k })),
                Quiet: false,
              },
            })
          )
          deletedCount += delRes.Deleted?.length || 0
          if (delRes.Errors?.length) {
            errors.push(...delRes.Errors.map((e) => ({ Key: e.Key, Message: e.Message })))
          }
        }

        if (!listRes.IsTruncated) break
        continuationToken = listRes.NextContinuationToken
        if (!continuationToken) break
      }

      return { deletedCount, errors }
    }

    // 1) 通过 brandId / brandName 按前缀批量删除（可删除 >1000）
    // 新路径：{brandId}/...
    // 旧路径（兼容）：{userId}/{brandId}/... 或 {userId}/{brandName}/...
    if ((brandId && String(brandId).trim()) || (brandName && String(brandName).trim())) {
      const safeBrandId = brandId ? sanitizeForUrl(String(brandId)) : ''
      const safeBrandName = brandName ? sanitizeForUrl(String(brandName)) : ''
      const prefixes = []
      if (safeBrandId) {
        // brandId 归属校验（普通 Admin 只允许删自己的品牌）
        if (!auth.groups?.includes('SuperAdmin') && !ownedBrandIds.has(String(brandId))) {
          return {
            statusCode: 403,
            headers: getCorsHeaders(),
            body: JSON.stringify({ error: 'Forbidden' }),
          }
        }
        prefixes.push(`${safeBrandId}/`) // 新结构
        prefixes.push(`${safeUserId}/${safeBrandId}/`) // 兼容旧结构
      }
      if (safeBrandName) prefixes.push(`${safeUserId}/${safeBrandName}/`) // 兼容旧结构（brandName 目录）
      // 去重（brandId 可能就是 brandName 的旧值）
      const uniq = Array.from(new Set(prefixes))

      console.log(
        `[PFTryonDeleteTool] 批量删除品牌 - user=${auth.userId}, brandName=${String(brandName || '')}, brandId=${String(brandId || '')}, prefixes=${uniq.join(',')}`
      )

      let deletedCount = 0
      const errors = []
      const perPrefix = []
      for (const p of uniq) {
        const r = await deleteByPrefix(p)
        deletedCount += r.deletedCount
        if (r.errors?.length) errors.push(...r.errors)
        perPrefix.push({ prefix: p, deletedCount: r.deletedCount, errors: r.errors?.length || 0 })
      }

      // 2) 删除 DynamoDB 品牌记录（仅当 brandId 存在时）
      let dbDeleted = false
      if (BRAND_TABLE_NAME && safeBrandId) {
        try {
          await ddbClient.send(
            new DeleteItemCommand({
              TableName: BRAND_TABLE_NAME,
              Key: {
                UserId: { S: String(auth.userId) },
                BrandId: { S: String(brandId) },
              },
            })
          )
          dbDeleted = true
        } catch (e) {
          console.error(
            `[PFTryonDeleteTool] DynamoDB delete brand failed - user=${auth.userId}, brandId=${String(brandId)}, error=${e?.message || e}`
          )
        }
      }

      const totalTime = Date.now() - startTime;
      console.log(`[PFTryonDeleteTool] 品牌批量删除完成 - deleted=${deletedCount}, errors=${errors.length}, dbDeleted=${dbDeleted}, ms=${totalTime}`)

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          message: `成功删除 ${deletedCount} 个文件`,
          deletedCount,
          errors,
          perPrefix,
          dbDeleted,
        }),
      }
    }

    // 2) 通过 keys 批量删除（原逻辑）
    console.log(`[PFTryonDeleteTool] 请求删除 ${keys?.length || 0} 个文件`);

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      console.log(`[PFTryonDeleteTool] 验证失败：文件列表为空`);
      return {
        statusCode: 400,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          error: '请提供要删除的文件列表'
        })
      };
    }

    const invalidKeys = []
    for (const k of keys) {
      if (typeof k !== 'string') {
        invalidKeys.push(k)
        continue
      }
      const key = String(k)
      // 兼容旧结构：userId/... 仅允许当前用户前缀
      if (key.startsWith(`${safeUserId}/`)) continue
      // 新结构：brandId/... 仅允许属于自己的 brandId
      const seg0 = key.split('/')[0] || ''
      if (!seg0) {
        invalidKeys.push(k)
        continue
      }
      if (!auth.groups?.includes('SuperAdmin') && !ownedBrandIds.has(seg0)) {
        invalidKeys.push(k)
        continue
      }
    }
    if (invalidKeys.length > 0) {
      console.warn(`[PFTryonDeleteTool] 越权删除尝试：user=${auth.userId}, invalidKeys=${JSON.stringify(invalidKeys)}`)
      return {
        statusCode: 403,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: 'Forbidden' }),
      }
    }

    // 打印要删除的文件列表
    console.log(`[PFTryonDeleteTool] 删除文件列表:`);
    keys.forEach((key, index) => {
      console.log(`[PFTryonDeleteTool]   [${index + 1}] ${key}`);
    });

    // 批量删除
    console.log(`[PFTryonDeleteTool] 执行批量删除...`);
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
        Quiet: false
      }
    });

    const result = await s3Client.send(deleteCommand);

    const deletedCount = result.Deleted?.length || 0;
    const errorCount = result.Errors?.length || 0;
    
    console.log(`[PFTryonDeleteTool] 删除完成 - 成功: ${deletedCount}, 失败: ${errorCount}`);
    
    if (result.Errors && result.Errors.length > 0) {
      console.error(`[PFTryonDeleteTool] 删除错误:`);
      result.Errors.forEach((err, index) => {
        console.error(`[PFTryonDeleteTool]   [${index + 1}] ${err.Key}: ${err.Message}`);
      });
    }

    const totalTime = Date.now() - startTime;
    console.log(`[PFTryonDeleteTool] ========================================`);
    console.log(`[PFTryonDeleteTool] 删除操作完成`);
    console.log(`[PFTryonDeleteTool] 总耗时: ${totalTime}ms`);
    console.log(`[PFTryonDeleteTool] RequestId: ${requestId}`);
    console.log(`[PFTryonDeleteTool] ========================================`);

    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        message: `成功删除 ${deletedCount} 个文件`,
        deleted: result.Deleted || [],
        errors: result.Errors || []
      })
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[PFTryonDeleteTool] ========================================`);
    console.error(`[PFTryonDeleteTool] 请求失败 - RequestId: ${requestId}`);
    console.error(`[PFTryonDeleteTool] 错误信息:`, error.message);
    console.error(`[PFTryonDeleteTool] 错误堆栈:`, error.stack);
    console.error(`[PFTryonDeleteTool] 耗时: ${totalTime}ms`);
    console.error(`[PFTryonDeleteTool] ========================================`);
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        error: '删除文件失败',
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

