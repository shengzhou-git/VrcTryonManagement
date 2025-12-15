/**
 * AWS Lambda 函数 - PFTryonDeleteTool
 * 删除 S3 中的服装图片
 * Node.js 20.x (ES Module)
 */

import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

/**
 * 主处理函数
 */
export const handler = async (event) => {
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
    // 解析请求体
    const body = JSON.parse(event.body);
    const { keys } = body;

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

