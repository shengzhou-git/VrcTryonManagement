# API Key 认证和 POST 统一 - 变更说明

## 📋 变更概览

本次更新将所有 API 请求方法统一为 **POST**，并添加了 **API Key 认证**，显著提升了 API 安全性。

## 🔄 主要变更

### 1. API Gateway 配置

#### ✅ 统一请求方法
- **之前**：`/upload` 和 `/delete` 使用 POST，`/list` 使用 GET
- **现在**：所有端点统一使用 POST

| 端点 | 之前方法 | 现在方法 | 参数位置 |
|------|---------|---------|----------|
| `/upload` | POST | POST | Body |
| `/list` | GET | POST | Body (之前是 Query String) |
| `/delete` | POST | POST | Body |

#### ✅ API Key 认证
- **之前**：无认证，任何人都可以调用 API
- **现在**：所有 API 请求必须包含有效的 API Key

**请求示例：**
```javascript
fetch('https://api-url/list', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key-here'  // 必需
  },
  body: JSON.stringify({ brand: 'Nike' })
})
```

#### ✅ 端点类型
- **之前**：EDGE（边缘优化，使用 CloudFront）
- **现在**：REGIONAL（区域端点，直连东京区域）

**优势：**
- 更低延迟
- 更低成本
- 更简单的架构

### 2. Lambda 函数更新

#### PFTryonGetListTool
- **参数来源变更**：从 `queryStringParameters` 改为 `body`
- **方法支持**：从 GET 改为 POST

**之前：**
```javascript
const queryParams = event.queryStringParameters || {};
const brand = queryParams.brand;
```

**现在：**
```javascript
const body = JSON.parse(event.body || '{}');
const brand = body.brand;
```

### 3. 前端 API 客户端更新

#### 新增环境变量
```env
NEXT_PUBLIC_API_KEY=your-api-key-here
```

#### API 调用更新

**lib/api.ts 变更：**

1. **添加 API Key 常量**
```typescript
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';
```

2. **所有请求添加 API Key header**
```typescript
headers: {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,  // 新增
}
```

3. **listImages 方法改为 POST**

**之前（GET）：**
```typescript
const params = new URLSearchParams()
if (brand && brand !== '全部') {
  params.append('brand', brand)
}
const url = `${API_BASE_URL}/list?${params.toString()}`
const response = await fetch(url, { method: 'GET' })
```

**现在（POST）：**
```typescript
const body: { brand?: string } = {}
if (brand && brand !== '全部') {
  body.brand = brand
}
const response = await fetch(`${API_BASE_URL}/list`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
  body: JSON.stringify(body),
})
```

### 4. AWS 资源新增

#### API Key
- **名称**：`vrc-tryon-apikey-{Environment}`
- **状态**：已启用
- **类型**：API_KEY

#### Usage Plan
- **速率限制**：100 请求/秒
- **突发限制**：200 请求
- **每日配额**：10,000 请求

配置：
```yaml
Throttle:
  BurstLimit: 200      # 突发限制
  RateLimit: 100       # 速率限制（请求/秒）
Quota:
  Limit: 10000         # 每日配额
  Period: DAY
```

#### CORS 更新
添加了 `x-api-key` 到允许的 headers：
```yaml
AllowHeaders: "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-api-key'"
```

## 🚀 部署步骤

### 1. 更新代码
```bash
git pull origin main
```

### 2. 部署后端
```bash
cd lambda
deploy-simple.bat
```

### 3. 获取 API Key
1. 登录 AWS Console
2. 进入 API Gateway > API Keys
3. 找到 `vrc-tryon-apikey-prod`
4. 点击 "Show" 查看值
5. 复制 API Key

### 4. 更新前端环境变量
编辑 `.env.local`：
```env
NEXT_PUBLIC_API_URL=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
NEXT_PUBLIC_API_KEY=your-copied-api-key
```

### 5. 重启前端
```bash
npm run dev
```

## 🔒 安全性提升

### 之前的安全问题
- ❌ 无认证机制，任何人都可以调用 API
- ❌ 无速率限制，容易被滥用
- ❌ 无使用监控

### 现在的安全保护
- ✅ API Key 认证，只有持有有效 Key 的客户端可以访问
- ✅ 速率限制（100 请求/秒），防止 DDoS 攻击
- ✅ 每日配额（10,000 请求/天），控制成本
- ✅ 使用监控，可在 AWS Console 查看
- ✅ S3 私有存储 + 预签名 URL，图片访问安全

## 📊 监控和管理

### 查看 API 使用情况
1. AWS Console > API Gateway
2. 点击 Usage Plans
3. 选择 `vrc-tryon-usage-plan-prod`
4. 查看使用统计

### 管理 API Key
1. 在 API Gateway > API Keys 中管理
2. 可以创建多个 API Key
3. 可以禁用或删除 API Key
4. 建议定期轮换 API Key

### CloudWatch 日志
- Lambda 函数已添加详细日志
- 可在 CloudWatch Logs 中查看
- 日志组：`/aws/lambda/PFTryonXXXTool-prod`

## 🎯 优势总结

1. **安全性** ⬆️
   - API Key 认证保护所有端点
   - 私有 S3 + 预签名 URL

2. **性能** ⬆️
   - REGIONAL 端点，更低延迟
   - 直连东京区域

3. **成本** ⬇️
   - 不使用 CloudFront，节省流量费用
   - Usage Plan 控制配额，避免超支

4. **可维护性** ⬆️
   - 统一使用 POST 方法，API 更一致
   - 详细日志便于排查问题
   - 使用监控便于分析

5. **可控性** ⬆️
   - 速率限制防止滥用
   - 每日配额控制成本
   - 可随时禁用 API Key

## 📚 相关文档

- [API_KEY_SETUP.md](./API_KEY_SETUP.md) - API Key 配置详细步骤
- [README.md](./README.md) - 项目总体文档
- [lambda/template.yaml](./lambda/template.yaml) - AWS SAM 配置
- [env.template](./env.template) - 环境变量模板

## ⚠️ 重要提醒

1. **API Key 是敏感信息**
   - 不要提交到 Git
   - 不要分享给他人
   - 定期轮换

2. **`.env.local` 已在 `.gitignore` 中**
   - 确保不会被提交

3. **部署顺序很重要**
   - 先部署后端（获取 API URL 和 Key）
   - 再配置前端环境变量
   - 最后启动前端

4. **监控使用情况**
   - 定期检查 Usage Plan
   - 关注异常流量
   - 必要时调整限制

## 🤝 支持

如有问题，请：
1. 查看 [API_KEY_SETUP.md](./API_KEY_SETUP.md) 故障排除部分
2. 查看 CloudWatch Logs
3. 提交 GitHub Issue

