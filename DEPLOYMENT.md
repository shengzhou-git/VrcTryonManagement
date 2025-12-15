# 部署指南

本文档详细说明如何将服装图片管理系统部署到生产环境。

## 📋 部署前准备

### 1. AWS 账号设置

确保你有一个 AWS 账号并完成以下设置：

- ✅ 创建 IAM 用户（具有 Lambda、S3、API Gateway 权限）
- ✅ 获取访问密钥（Access Key ID 和 Secret Access Key）
- ✅ 选择部署区域（推荐：ap-northeast-1 东京）

### 2. 本地开发环境

- Node.js 20.x 或更高版本
- npm 或 yarn
- AWS CLI（可选，用于验证）
- Serverless Framework（可选，推荐）

## 🚀 部署步骤

### 第一步：部署 AWS Lambda 后端

#### 选项 A：使用 Serverless Framework（推荐）

1. **安装 Serverless Framework**

```bash
npm install -g serverless
```

2. **配置 AWS 凭证**

```bash
# 方法 1：使用 Serverless CLI
serverless config credentials \
  --provider aws \
  --key YOUR_ACCESS_KEY_ID \
  --secret YOUR_SECRET_ACCESS_KEY

# 方法 2：使用 AWS CLI
aws configure
```

3. **进入 Lambda 目录并安装依赖**

```bash
cd lambda
npm install
```

4. **修改配置（可选）**

编辑 `serverless.yml`，根据需要调整：

```yaml
provider:
  region: ap-northeast-1  # 你的区域
  stage: prod             # 环境名称
  memorySize: 512         # 内存大小
  timeout: 30             # 超时时间
```

5. **部署到 AWS**

```bash
# 开发环境
serverless deploy --stage dev

# 生产环境
serverless deploy --stage prod
```

6. **记录 API 端点**

部署完成后，控制台会显示类似以下信息：

```
endpoints:
  POST - https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/upload
  GET - https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/list
  POST - https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/delete
```

保存这个 URL（去掉路径部分），后续配置前端时使用。

#### 选项 B：手动部署

1. **打包 Lambda 函数**

```bash
cd lambda
npm install
npm run package
```

2. **创建 S3 存储桶**

在 AWS Console 中创建 S3 存储桶：

- 存储桶名称：`vrc-tryon-images-prod`
- 区域：ap-northeast-1
- 启用"阻止所有公共访问"：关闭（如需公开访问）
- 配置 CORS：

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```

3. **创建 Lambda 函数**

在 AWS Console 中创建三个 Lambda 函数：

**函数 1：UploadHandler**
- 名称：`vrc-tryon-upload`
- 运行时：Node.js 20.x
- 架构：x86_64
- 上传 `function.zip`
- 处理程序：`upload-handler.handler`
- 环境变量：
  - `S3_BUCKET_NAME`: `vrc-tryon-images-prod`
- 内存：512 MB
- 超时：30 秒

**函数 2：ListHandler**
- 名称：`vrc-tryon-list`
- 运行时：Node.js 20.x
- 上传 `function.zip`
- 处理程序：`list-handler.handler`
- 环境变量和其他设置同上

**函数 3：DeleteHandler**
- 名称：`vrc-tryon-delete`
- 运行时：Node.js 20.x
- 上传 `function.zip`
- 处理程序：`delete-handler.handler`
- 环境变量和其他设置同上

4. **配置 IAM 角色**

为 Lambda 函数添加 S3 权限：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:HeadObject"
      ],
      "Resource": [
        "arn:aws:s3:::vrc-tryon-images-prod",
        "arn:aws:s3:::vrc-tryon-images-prod/*"
      ]
    }
  ]
}
```

5. **创建 API Gateway**

- 类型：REST API
- 创建资源：`/upload`, `/list`, `/delete`
- 添加方法：POST（upload、delete）, GET（list）, OPTIONS（所有）
- 集成类型：Lambda 函数
- 启用 CORS
- 部署 API（创建部署阶段：prod）

6. **记录 API 端点**

```
https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
```

### 第二步：部署 Next.js 前端

#### 选项 A：部署到 Vercel（推荐）

1. **推送代码到 GitHub**

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. **在 Vercel 中导入项目**

- 访问 [vercel.com](https://vercel.com)
- 点击 "New Project"
- 导入你的 GitHub 仓库
- 配置环境变量：

```
NEXT_PUBLIC_API_URL=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
```

3. **部署**

Vercel 会自动构建和部署你的应用。

#### 选项 B：部署到 AWS Amplify

1. **推送代码到 GitHub**（同上）

2. **在 AWS Amplify 中创建应用**

- 登录 AWS Console
- 进入 Amplify 服务
- 点击 "New app" -> "Host web app"
- 连接 GitHub 仓库
- 配置构建设置：

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

- 添加环境变量：

```
NEXT_PUBLIC_API_URL=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
```

3. **保存并部署**

#### 选项 C：自己的服务器

1. **构建生产版本**

```bash
npm run build
```

2. **启动生产服务器**

```bash
npm start
```

或使用 PM2：

```bash
npm install -g pm2
pm2 start npm --name "vrc-tryon" -- start
pm2 save
```

3. **配置 Nginx 反向代理**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔒 安全配置

### 1. CORS 设置

在生产环境中，将 Lambda 函数的 CORS 配置更改为特定域名：

```javascript
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': 'https://your-domain.com',
    // ...
  };
}
```

### 2. API 认证

考虑添加 API 密钥或 JWT 认证：

```javascript
// Lambda 函数中
const apiKey = event.headers['x-api-key'];
if (apiKey !== process.env.API_KEY) {
  return createErrorResponse(401, '未授权');
}
```

### 3. 文件上传限制

在 Lambda 函数中已经实现了：
- 文件类型验证
- 文件大小限制（10MB）
- 品牌名称验证

### 4. S3 存储桶策略

如果不需要公开访问，可以使用签名 URL：

```javascript
const signedUrl = s3.getSignedUrl('getObject', {
  Bucket: BUCKET_NAME,
  Key: fileKey,
  Expires: 3600
});
```

## 📊 监控和日志

### CloudWatch 日志

Lambda 函数的日志会自动发送到 CloudWatch：

1. 登录 AWS Console
2. 进入 CloudWatch 服务
3. 查看日志组：`/aws/lambda/vrc-tryon-*`

### Vercel 分析

如果使用 Vercel 部署，可以启用 Analytics：

```bash
npm install @vercel/analytics
```

在 `app/layout.tsx` 中添加：

```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

## 🔧 故障排除

### Lambda 超时

如果上传大文件时超时，增加超时时间：

```yaml
# serverless.yml
provider:
  timeout: 60  # 增加到 60 秒
```

### S3 权限错误

确保 Lambda 执行角色有正确的 S3 权限。

### CORS 错误

检查：
1. Lambda 函数返回正确的 CORS 头
2. API Gateway 启用了 CORS
3. S3 存储桶配置了 CORS

### 图片无法访问

确保：
1. S3 存储桶允许公开读取
2. 或使用签名 URL
3. 检查存储桶策略

## 📈 性能优化

### 1. CDN 加速

使用 CloudFront 分发 S3 内容：

- 创建 CloudFront 分配
- 源：S3 存储桶
- 启用缓存
- 更新图片 URL 使用 CloudFront 域名

### 2. 图片压缩

在上传前添加图片压缩：

```typescript
// 使用 browser-image-compression
import imageCompression from 'browser-image-compression';

const compressedFile = await imageCompression(file, {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920
});
```

### 3. Lambda 预热

使用 CloudWatch Events 定期调用 Lambda 函数，避免冷启动。

## 💰 成本估算

基于中等使用量的估算：

- **Lambda**：前 100 万请求免费，之后 $0.20/百万请求
- **S3**：前 5GB 存储免费，之后约 $0.023/GB/月
- **API Gateway**：前 100 万请求免费，之后 $3.50/百万请求
- **数据传输**：前 100GB 免费，之后约 $0.09/GB

每月约 1000 次上传，1GB 存储：**基本免费**

## 📞 获取帮助

如遇到部署问题，请：

1. 查看 CloudWatch 日志
2. 检查 AWS 服务状态
3. 参考本文档的故障排除部分
4. 提交 GitHub Issue

---

祝你部署顺利！🎉

