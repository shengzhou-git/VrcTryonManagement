/**
 * AWS Lambda 函数 - PFTryonUploadTool
 * 处理服装图片上传到 S3（私有存储桶）
 * Node.js 20.x (ES Module)
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });

// 配置
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const SIGNED_URL_EXPIRATION = parseInt(process.env.SIGNED_URL_EXPIRATION || '3600'); // 1小时
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 主处理函数
 */
export const handler = async (event) => {
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

        // 生成文件路径（URL 安全）
        const timestamp = Date.now();
        const safeBrandName = sanitizeForUrl(brandName);
        const safeFileName = sanitizeFileName(file.name);
        const fileKey = `${safeBrandName}/${timestamp}-${safeFileName}`;
        
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 原始品牌: ${brandName}`);
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 安全品牌: ${safeBrandName}`);
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 原始文件名: ${file.name}`);
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 安全文件名: ${safeFileName}`);
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 文件路径: ${fileKey}`);

        // 解码 Base64 文件内容
        const fileBuffer = Buffer.from(file.content, 'base64');
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 文件大小: ${(fileBuffer.length / 1024).toFixed(2)} KB`);

        // 上传到 S3（私有）
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 开始上传到 S3...`);
        const uploadCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
          Body: fileBuffer,
          ContentType: file.type,
          Metadata: {
            brand: brandName,              // 保存原始品牌名（支持中日文）
            originalname: file.name,       // 保存原始文件名（支持中日文）
            uploaddate: new Date().toISOString()
          }
        });

        await s3Client.send(uploadCommand);
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 上传成功`);

        // 生成预签名 URL（临时访问链接）
        console.log(`[PFTryonUploadTool] [${i + 1}/${files.length}] 生成预签名 URL...`);
        const getCommand = new PutObjectCommand({
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
        note: '图片 URL 为临时访问链接，有效期 1 小时'
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

/**
 * 将字符串转换为 URL 安全格式
 * 保留英文、数字、连字符，其他字符转换为 URL 编码
 */
function sanitizeForUrl(str) {
  // 移除首尾空格
  str = str.trim();
  
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
