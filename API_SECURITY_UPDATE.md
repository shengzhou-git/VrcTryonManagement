# API 安全性更新 - 服务器端代理

## 🔒 安全问题修复

### 之前的问题
使用 `NEXT_PUBLIC_API_KEY` 会将 API Key 暴露到浏览器端：
- ❌ 任何人都可以在浏览器开发者工具中看到 API Key
- ❌ 打包后的 JavaScript 文件包含 API Key
- ❌ 无法真正保护 API Key

### 现在的解决方案
使用 **Next.js API 路由作为服务器端代理**：
- ✅ API Key 只存在于服务器端（`.env.local`）
- ✅ 浏览器无法访问 API Key
- ✅ 前端调用本地 API 路由（`/api/*`）
- ✅ 服务器端 API 路由再调用 AWS API Gateway

## 📐 架构变更

### 之前的架构
```
浏览器 
  → 直接调用 AWS API Gateway (带 API Key)
  → AWS Lambda
```

**问题**：API Key 在浏览器中可见

### 现在的架构
```
浏览器 
  → Next.js API 路由 (/api/upload, /api/list, /api/delete)
  → 服务器端添加 API Key
  → AWS API Gateway
  → AWS Lambda
```

**优势**：API Key 只在服务器端，浏览器不可见

## 🔄 文件变更

### 1. 新增文件

#### `app/api/upload/route.ts` - 上传图片 API 路由
```typescript
import { NextRequest, NextResponse } from 'next/server'

const AWS_API_URL = process.env.AWS_API_URL || ''
const AWS_API_KEY = process.env.AWS_API_KEY || ''  // 服务器端环境变量

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // 在服务器端添加 API Key
  const response = await fetch(`${AWS_API_URL}/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': AWS_API_KEY,  // 只在服务器端使用
    },
    body: JSON.stringify(body),
  })
  
  return NextResponse.json(await response.json())
}
```

#### `app/api/list/route.ts` - 获取列表 API 路由
类似结构，代理到 AWS API Gateway 的 `/list` 端点

#### `app/api/delete/route.ts` - 删除图片 API 路由
类似结构，代理到 AWS API Gateway 的 `/delete` 端点

### 2. 修改文件

#### `lib/api.ts` - 前端 API 客户端
**之前：**
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || ''

fetch(`${API_BASE_URL}/upload`, {
  headers: {
    'x-api-key': API_KEY,  // ❌ API Key 在浏览器中
  }
})
```

**现在：**
```typescript
const API_BASE_URL = '/api'  // 调用本地 API 路由

fetch(`${API_BASE_URL}/upload`, {
  headers: {
    'Content-Type': 'application/json'
    // ✅ 不需要 API Key，由服务器端添加
  }
})
```

#### `app/upload/page.tsx` - 上传页面
**之前：**
```typescript
// 模拟上传过程（实际应该调用API）
for (let i = 0; i < files.length; i++) {
  // ... 模拟代码
}
```

**现在：**
```typescript
// 调用真实的上传 API
const { uploadImages } = await import('@/lib/api')
const fileList = files.map(f => f.file)
const response = await uploadImages(brandName, fileList)

// 根据响应更新 UI 状态
if (response.results) {
  // 更新每个文件的上传状态
}
```

#### `env.template` - 环境变量模板
**之前：**
```env
NEXT_PUBLIC_API_URL=...
NEXT_PUBLIC_API_KEY=...
```

**现在：**
```env
# 不使用 NEXT_PUBLIC_ 前缀，保护 API Key
AWS_API_URL=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
AWS_API_KEY=your-api-key-here
```

## 🚀 部署和配置

### 1. 环境变量配置

创建或更新 `.env.local`：

```env
# 服务器端环境变量（不会暴露到浏览器）
AWS_API_URL=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
AWS_API_KEY=your-actual-api-key-from-aws-console
```

### 2. 部署步骤

1. **部署 AWS Lambda 后端**（如果还没有）
   ```bash
   cd lambda
   deploy-simple.bat
   ```

2. **获取 API Gateway URL 和 API Key**
   - API URL：在 CloudFormation Outputs 中查看
   - API Key：AWS Console > API Gateway > API Keys

3. **配置 Next.js 环境变量**
   ```bash
   # 复制模板
   copy env.template .env.local
   
   # 编辑 .env.local，填入实际值
   ```

4. **启动 Next.js 开发服务器**
   ```bash
   npm run dev
   ```

5. **构建生产环境**
   ```bash
   npm run build
   npm start
   ```

## 🔐 安全性验证

### 检查 API Key 是否泄露

1. **打开浏览器开发者工具**
   - 按 F12 打开开发者工具
   - 切换到 Network（网络）标签

2. **执行操作**（上传图片、查看列表等）

3. **检查网络请求**
   - 应该只看到对 `/api/upload`, `/api/list`, `/api/delete` 的请求
   - **不应该**看到对 AWS API Gateway URL 的直接请求
   - **不应该**在任何请求头中看到 `x-api-key`

4. **检查 JavaScript 源码**
   - 在 Sources 标签中查看 JavaScript 文件
   - 搜索 "API_KEY" 或你的实际 API Key
   - **不应该**找到任何 API Key

### 预期行为

✅ **浏览器网络请求示例：**
```
POST http://localhost:3000/api/upload
Request Headers:
  Content-Type: application/json
Request Body:
  {"brandName":"Nike","files":[...]}
```

✅ **服务器端日志（只在服务器控制台可见）：**
```
Calling AWS API: https://xxx.execute-api.ap-northeast-1.amazonaws.com/prod/upload
Using API Key: AbCdEf...（只在服务器日志中）
```

❌ **不应该看到：**
```
POST https://xxx.execute-api.ap-northeast-1.amazonaws.com/prod/upload
Request Headers:
  x-api-key: your-api-key  ← 这不应该出现在浏览器中
```

## 📊 性能影响

### 额外的请求跳转
- 浏览器 → Next.js 服务器 → AWS API Gateway → Lambda
- 增加了一次网络跳转

### 优化建议
1. **使用相同区域部署**
   - Next.js 服务器和 AWS Lambda 部署在同一区域
   - 减少跨区域延迟

2. **启用 HTTP/2**
   - Next.js 默认支持 HTTP/2
   - 复用连接，减少延迟

3. **添加缓存**（可选）
   - 对列表查询等读操作添加缓存
   - 使用 Next.js API 路由的缓存机制

4. **生产环境部署**
   - 使用 Vercel、AWS Amplify 或 EC2
   - 自动优化性能

## 🛡️ 其他安全最佳实践

### 1. CORS 配置
确保 AWS API Gateway 只允许你的 Next.js 服务器域名：
```yaml
# lambda/template.yaml
Cors:
  AllowOrigin: "'https://your-domain.com'"  # 不要使用 '*'
```

### 2. 速率限制
在 Next.js API 路由中添加速率限制：
```typescript
// 可以使用 next-rate-limit 等库
import rateLimit from 'express-rate-limit'
```

### 3. 身份验证（可选）
如果需要用户登录，在 API 路由中添加身份验证：
```typescript
export async function POST(request: NextRequest) {
  // 检查用户 session
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 继续处理请求
}
```

### 4. 输入验证
在服务器端 API 路由中验证所有输入：
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // 验证输入
  if (!body.brandName || typeof body.brandName !== 'string') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  
  // 继续处理
}
```

## 📚 相关文档

- [Next.js API Routes 文档](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [环境变量安全](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [API_KEY_SETUP.md](./API_KEY_SETUP.md) - 原 API Key 配置指南
- [API_KEY_CHANGES.md](./API_KEY_CHANGES.md) - 原变更说明

## ✅ 检查清单

部署后请确认：

- [ ] `.env.local` 文件包含 `AWS_API_URL` 和 `AWS_API_KEY`（不带 NEXT_PUBLIC_ 前缀）
- [ ] `.env.local` 在 `.gitignore` 中
- [ ] 浏览器网络请求只显示 `/api/*` 路径
- [ ] 浏览器开发者工具中看不到 API Key
- [ ] JavaScript 源码中搜索不到 API Key
- [ ] 上传功能正常工作
- [ ] 列表显示功能正常工作
- [ ] 删除功能正常工作
- [ ] 生产环境构建成功（`npm run build`）

## 🎉 完成

现在你的 API Key 已经得到了妥善保护！
- ✅ 只在服务器端存储
- ✅ 不会暴露到浏览器
- ✅ 不会出现在打包后的 JavaScript 中
- ✅ 真实的 HTTP 请求替代了模拟代码

