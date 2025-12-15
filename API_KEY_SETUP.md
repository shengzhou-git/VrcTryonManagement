# API Key 配置说明

## 部署后的配置步骤

### 1. 部署 Lambda 函数

运行部署脚本：

```bash
cd lambda
deploy-simple.bat
```

### 2. 获取 API Gateway URL

部署完成后，在输出中找到 `ApiUrl`：

```
ApiUrl: https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
```

### 3. 获取 API Key

1. 登录 AWS Console
2. 进入 **API Gateway** 服务
3. 点击左侧菜单 **API Keys**
4. 找到名为 `vrc-tryon-apikey-prod` 的 API Key
5. 点击 **Show** 查看 API Key 值
6. 复制 API Key 值（类似：`AbCdEfGhIjKlMnOpQrStUvWxYz123456`）

### 4. 配置前端环境变量

在项目根目录创建 `.env.local` 文件（如果没有）：

```bash
# .env.local

# AWS API Gateway 端点 URL（从步骤2获取）
AWS_API_URL=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod

# AWS API Key（从步骤3获取）
# 重要：不使用 NEXT_PUBLIC_ 前缀，这样 API Key 只在服务器端使用，不会暴露到浏览器
AWS_API_KEY=AbCdEfGhIjKlMnOpQrStUvWxYz123456
```

**安全说明：**
- ✅ 使用 `AWS_API_URL` 和 `AWS_API_KEY`（不带 NEXT_PUBLIC_ 前缀）
- ✅ Next.js API Routes 在服务器端读取这些变量
- ✅ 前端调用 `/api/upload`, `/api/list`, `/api/delete`
- ✅ 服务器端 API Routes 代理到 AWS API Gateway 并添加 API Key
- ✅ API Key 永远不会暴露到浏览器端

### 5. 启动前端开发服务器

```bash
npm run dev
```

## API Key 使用限制

当前配置的限制：

- **速率限制**：100 请求/秒
- **突发限制**：200 请求
- **配额**：10,000 请求/天

如需调整，请修改 `lambda/template.yaml` 中的 `UsagePlan` 配置：

```yaml
UsagePlan:
  Type: AWS::ApiGateway::UsagePlan
  Properties:
    Throttle:
      BurstLimit: 200      # 突发限制
      RateLimit: 100       # 速率限制（请求/秒）
    Quota:
      Limit: 10000         # 每日配额
      Period: DAY
```

## 安全建议

1. **不要提交 `.env.local` 到 Git**
   - 该文件已在 `.gitignore` 中
   - 确保 API Key 不泄露

2. **定期轮换 API Key**
   - 在 AWS Console 中可以创建新的 API Key
   - 更新 `.env.local` 中的值
   - 删除旧的 API Key

3. **监控 API 使用情况**
   - 在 AWS Console 的 API Gateway > Usage Plans 中查看
   - 设置 CloudWatch 告警

## 故障排除

### 403 Forbidden 错误

- 检查 API Key 是否正确配置
- 确认 `.env.local` 文件中的 `NEXT_PUBLIC_API_KEY` 值正确
- 检查 API Key 是否已启用（Enabled）

### API 请求超时

- 检查 API Gateway URL 是否正确
- 确认 Lambda 函数已成功部署
- 查看 CloudWatch Logs 了解详细错误

### CORS 错误

- 确认 `template.yaml` 中的 CORS 配置包含 `x-api-key` header
- 重新部署 API Gateway

```yaml
Cors:
  AllowHeaders: "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-api-key'"
```

