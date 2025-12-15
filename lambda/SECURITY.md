# 安全说明

## 🔒 S3 私有存储桶配置

本项目使用 **私有 S3 存储桶** 存储图片，而不是公开访问的存储桶。

### 为什么使用私有存储桶？

1. **安全性** - 防止未授权访问
2. **访问控制** - 完全控制谁可以访问图片
3. **审计追踪** - 所有访问都通过 Lambda 函数记录
4. **合规要求** - 符合数据保护法规

### S3 配置

```yaml
PublicAccessBlockConfiguration:
  BlockPublicAcls: true          # 阻止公开 ACL
  BlockPublicPolicy: true        # 阻止公开策略
  IgnorePublicAcls: true         # 忽略公开 ACL
  RestrictPublicBuckets: true    # 限制公开存储桶
```

## 🔑 预签名 URL

由于 S3 存储桶是私有的，我们使用 **预签名 URL (Pre-signed URLs)** 来提供临时访问。

### 什么是预签名 URL？

预签名 URL 是包含认证信息的临时链接，允许在指定时间内访问私有 S3 对象。

### 特点

- ✅ **临时性** - URL 在设定时间后自动过期
- ✅ **安全性** - 包含加密签名，无法伪造
- ✅ **灵活性** - 可以为不同操作生成不同的 URL
- ✅ **无需凭证** - 前端不需要 AWS 凭证

### 有效期

**默认**: 1 小时（3600 秒）

可以在 `template.yaml` 中修改：

```yaml
Environment:
  Variables:
    SIGNED_URL_EXPIRATION: '3600'  # 单位：秒
```

**建议值**:
- 短期访问: 900 秒（15 分钟）
- 中期访问: 3600 秒（1 小时）- **默认**
- 长期访问: 86400 秒（24 小时）

### 工作原理

```
用户请求图片列表
     ↓
Lambda 函数查询 S3
     ↓
为每个图片生成预签名 URL
     ↓
返回包含预签名 URL 的列表
     ↓
前端使用预签名 URL 显示图片
     ↓
URL 在 1 小时后自动过期
```

## 📋 Lambda 函数更新

### PFTryonUploadTool

上传后生成预签名 URL：

```javascript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// 上传文件
await s3Client.send(new PutObjectCommand({
  Bucket: BUCKET_NAME,
  Key: fileKey,
  Body: fileBuffer
  // 不设置 ACL，默认私有
}));

// 生成预签名 URL
const signedUrl = await getSignedUrl(s3Client, getCommand, {
  expiresIn: 3600  // 1 小时
});
```

### PFTryonGetListTool

列表中返回预签名 URL：

```javascript
// 为每个对象生成预签名 URL
const getCommand = new GetObjectCommand({
  Bucket: BUCKET_NAME,
  Key: object.Key
});

const signedUrl = await getSignedUrl(s3Client, getCommand, {
  expiresIn: 3600
});

images.push({
  url: signedUrl,  // 预签名 URL
  urlExpiresIn: 3600,
  // ... 其他属性
});
```

### PFTryonDeleteTool

删除功能无需更改，因为 Lambda 有删除权限。

## 🔐 IAM 权限

Lambda 函数需要以下 S3 权限：

### 上传函数权限

```yaml
Policies:
  - S3CrudPolicy:
      BucketName: !Ref ImagesBucket
```

包含:
- `s3:PutObject` - 上传文件
- `s3:GetObject` - 读取文件（用于生成预签名 URL）
- `s3:DeleteObject` - 删除文件

### 列表函数权限

```yaml
Policies:
  - S3ReadPolicy:
      BucketName: !Ref ImagesBucket
```

包含:
- `s3:GetObject` - 读取文件
- `s3:ListBucket` - 列出对象

### 删除函数权限

```yaml
Policies:
  - S3CrudPolicy:
      BucketName: !Ref ImagesBucket
```

## 🌐 CORS 配置

即使 S3 是私有的，仍然需要 CORS 配置以允许浏览器访问预签名 URL：

```yaml
CorsConfiguration:
  CorsRules:
    - AllowedOrigins:
        - '*'
      AllowedMethods:
        - GET
        - PUT
        - POST
        - DELETE
        - HEAD
      AllowedHeaders:
        - '*'
      MaxAge: 3000
```

**生产环境建议**：将 `AllowedOrigins` 改为具体域名：

```yaml
AllowedOrigins:
  - 'https://your-domain.com'
```

## 📝 API 响应变化

### 上传响应

```json
{
  "results": [
    {
      "fileName": "image.jpg",
      "url": "https://bucket.s3.amazonaws.com/...?X-Amz-Signature=...",
      "expiresIn": 3600
    }
  ],
  "note": "图片 URL 为临时访问链接，有效期 1 小时"
}
```

### 列表响应

```json
{
  "images": [
    {
      "url": "https://bucket.s3.amazonaws.com/...?X-Amz-Signature=...",
      "urlExpiresIn": 3600
    }
  ],
  "note": "图片 URL 为临时访问链接，有效期 1 小时"
}
```

## ⚠️ 注意事项

### 前端处理

由于 URL 会过期，前端需要注意：

1. **缓存策略** - 不要长期缓存图片 URL
2. **刷新机制** - URL 过期后重新获取列表
3. **错误处理** - 处理 403 Forbidden 错误（URL 过期）

### 推荐做法

```javascript
// 前端示例
async function loadImages() {
  const response = await fetch('/list');
  const data = await response.json();
  
  // 使用图片
  displayImages(data.images);
  
  // 在 URL 即将过期前刷新
  setTimeout(loadImages, 3000 * 1000); // 50 分钟后刷新
}
```

## 🔄 URL 过期处理

### 前端错误处理

```javascript
<img 
  src={imageUrl} 
  onError={async (e) => {
    // URL 可能已过期，重新获取
    const newData = await refetchImages();
    e.target.src = newData.find(img => img.key === imageKey)?.url;
  }}
/>
```

### 自动刷新策略

1. **定时刷新** - 每 50 分钟刷新一次
2. **懒加载刷新** - 访问时检查是否过期
3. **错误触发刷新** - 加载失败时重新获取

## 💰 成本影响

使用预签名 URL 对成本的影响：

| 操作 | 成本 |
|------|------|
| 生成预签名 URL | 免费（Lambda 内部操作） |
| 通过预签名 URL 访问 | S3 GET 请求费用 |
| Lambda 执行时间 | 略微增加（生成签名） |

**总体**: 成本增加微乎其微，安全性大幅提升 ✅

## 🎯 最佳实践

1. **合理设置过期时间** - 根据使用场景选择
2. **前端缓存管理** - 不要缓存过期的 URL
3. **错误处理** - 优雅处理过期 URL
4. **监控日志** - 监控预签名 URL 生成频率
5. **生产环境 CORS** - 限制特定域名

## 📊 监控

### CloudWatch 指标

监控以下指标：
- Lambda 调用次数
- S3 GET 请求次数
- 403 错误率（URL 过期）
- Lambda 执行时间

### 日志

```javascript
console.log('Generated signed URL for:', key, 'expires in:', expiresIn);
```

## 🔧 故障排除

### 问题 1: 图片无法显示

**可能原因**: URL 已过期

**解决**: 重新获取图片列表

### 问题 2: 403 Forbidden

**可能原因**: 
- URL 已过期
- Lambda 权限不足
- CORS 配置错误

**解决**: 
1. 检查 URL 是否过期
2. 验证 Lambda IAM 权限
3. 检查 S3 CORS 配置

### 问题 3: 生成签名失败

**可能原因**: Lambda 没有 S3 权限

**解决**: 检查 `template.yaml` 中的 Policies 配置

---

**使用私有 S3 存储桶，提升系统安全性！** 🔒

