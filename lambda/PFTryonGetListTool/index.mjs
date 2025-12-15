/**
 * AWS Lambda 函数 - PFTryonGetListTool
 * 获取服装图片列表（使用预签名 URL）
 * Node.js 20.x (ES Module)
 */

import { S3Client, ListObjectsV2Command, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const SIGNED_URL_EXPIRATION = parseInt(process.env.SIGNED_URL_EXPIRATION || '3600'); // 1小时

/**
 * 主处理函数
 */
export const handler = async (event) => {
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
    // 解析请求体（现在使用 POST）
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (parseError) {
        console.error(`[PFTryonGetListTool] 解析请求体失败:`, parseError);
      }
    }
    
    const brand = body.brand;
    const prefix = brand ? `${brand}/` : '';

    console.log(`[PFTryonGetListTool] 请求参数 - 品牌筛选: ${brand || '全部'}`);
    console.log(`[PFTryonGetListTool] S3 前缀: ${prefix || '(根目录)'}`);

    // 列出 S3 对象
    console.log(`[PFTryonGetListTool] 开始列出 S3 对象...`);
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: 1000
    });

    const s3Data = await s3Client.send(listCommand);
    const objectCount = s3Data.Contents?.length || 0;
    console.log(`[PFTryonGetListTool] 找到 ${objectCount} 个对象`);

    // 处理结果
    const images = [];
    console.log(`[PFTryonGetListTool] 开始处理对象元数据和生成预签名 URL...`);

    for (let i = 0; i < (s3Data.Contents || []).length; i++) {
      const object = s3Data.Contents[i];
      
      try {
        console.log(`[PFTryonGetListTool] [${i + 1}/${objectCount}] 处理: ${object.Key}`);
        
        // 获取对象元数据
        const headCommand = new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: object.Key
        });

        const metadata = await s3Client.send(headCommand);

        // 解析品牌名称（从路径中提取）
        const pathParts = object.Key.split('/');
        const objectBrand = pathParts[0];
        const fileName = pathParts[pathParts.length - 1];

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
            : safeDecodeURIComponent(objectBrand);
        } catch (error) {
          console.warn(`[PFTryonGetListTool] 品牌名解码失败: ${error.message}, 使用原始值`);
          decodedBrand = objectBrand;
        }
        
        const decodedFileName = metadata.Metadata?.originalname 
          ? decodeBase64Metadata(metadata.Metadata.originalname) 
          : fileName;

        images.push({
          id: object.ETag.replace(/"/g, ''),
          name: decodedFileName,
          brand: decodedBrand,
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
        note: '图片 URL 为临时访问链接，有效期 1 小时'
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
