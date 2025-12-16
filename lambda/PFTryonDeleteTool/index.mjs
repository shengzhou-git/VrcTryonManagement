/**
 * AWS Lambda 函数 - PFTryonDeleteTool
 * 删除 S3 中的服装图片
 * Node.js 20.x (ES Module)
 */

import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

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
    if (!auth.groups?.includes('Admin')) {
      return {
        statusCode: 403,
        headers: getCorsHeaders(),
        body: JSON.stringify({ error: 'Forbidden' }),
      }
    }

    // 解析请求体
    const body = JSON.parse(event.body || '{}');
    const { keys, brandName } = body;

    // 按用户隔离：只允许操作当前 userId 前缀下的对象
    const safeUserId = sanitizeForUrl(String(auth.userId))
    const requiredPrefix = `${safeUserId}/`

    // 1) 通过 brandName 按前缀批量删除（推荐：可删除 >1000）
    if (brandName && String(brandName).trim()) {
      const safeBrand = sanitizeForUrl(String(brandName))
      const prefix = `${requiredPrefix}${safeBrand}/`
      console.log(`[PFTryonDeleteTool] 批量删除品牌 - user=${auth.userId}, brand=${brandName}, prefix=${prefix}`)

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
        console.log(`[PFTryonDeleteTool] list page ${loop} - found=${keysToDelete.length}, truncated=${!!listRes.IsTruncated}`)

        if (keysToDelete.length > 0) {
          // 单次 DeleteObjects 最多 1000
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

      const totalTime = Date.now() - startTime;
      console.log(`[PFTryonDeleteTool] 品牌批量删除完成 - deleted=${deletedCount}, errors=${errors.length}, ms=${totalTime}`)

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          message: `成功删除 ${deletedCount} 个文件`,
          deletedCount,
          errors,
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

    const invalidKeys = keys.filter((k) => typeof k !== 'string' || !k.startsWith(requiredPrefix))
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

