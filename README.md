# 服装图片管理系统

一个现代化的服装图片上传和管理平台，采用 Next.js 前端和 AWS Lambda 后端架构。

## ✨ 功能特点

- 🎨 **现代化 UI 设计** - 简洁美观的界面，提供出色的用户体验
- 📤 **批量上传** - 支持拖放上传、多文件和文件夹批量处理
- 🏷️ **品牌管理** - 为每组图片添加品牌信息，方便分类管理
- 🔍 **智能预览** - 鼠标悬停即可预览图片，无需点击
- 🎯 **搜索筛选** - 支持按品牌和名称快速搜索
- 🔒 **安全保护** - API Key 认证 + 私有 S3 存储 + 预签名 URL
- 🌏 **多语言支持** - 中文、英语、日语三种语言
- ⚡ **高性能** - 基于 Next.js 14 和 AWS 云服务，快速可靠
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🌐 **国际化文件名** - 支持中文、日文品牌名和文件名

## 🛠️ 技术栈

### 前端
- **Next.js 14** - React 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 现代化样式
- **Lucide React** - 图标库

### 后端
- **AWS Lambda** - 无服务器计算
- **Node.js 18** - 运行时环境
- **AWS S3** - 对象存储（私有，使用预签名 URL）
- **AWS API Gateway** - API 管理（REGIONAL 端点，API Key 认证）
- **AWS SAM** - 无服务器应用模型

## 📦 项目结构

```
vrc-tryon-management/
├── app/                      # Next.js 应用目录
│   ├── page.tsx             # 首页
│   ├── upload/              # 上传页面
│   │   └── page.tsx
│   ├── gallery/             # 图片一览页面
│   │   └── page.tsx
│   ├── layout.tsx           # 全局布局
│   └── globals.css          # 全局样式
├── components/              # React 组件
│   ├── Loading.tsx          # 加载组件
│   └── ErrorMessage.tsx     # 错误消息组件
├── lib/                     # 工具库
│   ├── api.ts              # API 客户端
│   └── utils.ts            # 工具函数
├── lambda/                  # AWS Lambda 函数
│   ├── PFTryonUploadTool/   # 上传处理函数
│   │   └── index.mjs
│   ├── PFTryonGetListTool/  # 列表处理函数
│   │   └── index.mjs
│   ├── PFTryonDeleteTool/   # 删除处理函数
│   │   └── index.mjs
│   ├── package.json         # Lambda 依赖
│   ├── template.yaml        # AWS SAM 配置
│   ├── deploy.bat          # 部署脚本（交互式）
│   └── deploy-simple.bat   # 部署脚本（简化版）
├── public/                  # 静态资源
├── package.json            # 项目依赖
├── next.config.js          # Next.js 配置
├── tailwind.config.js      # Tailwind 配置
└── tsconfig.json           # TypeScript 配置
```

## 🚀 快速开始

### 前置要求

- Node.js 20.x 或更高版本
- npm 或 yarn
- AWS 账号（用于部署后端）

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd vrc-tryon-management
```

2. **安装前端依赖**
```bash
npm install
```

3. **配置环境变量**

> ⚠️ **注意：** 请先部署后端（步骤 4），然后再配置环境变量

复制 `env.template` 为 `.env.local`：
```bash
cp env.template .env.local
```

编辑 `.env.local` 文件，填入实际值（从 AWS 部署后获取）：
```env
# AWS API Gateway 端点 URL（从 CloudFormation Outputs 获取）
AWS_API_URL=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod

# AWS API Key（从 AWS Console > API Gateway > API Keys 获取）
# 重要：不使用 NEXT_PUBLIC_ 前缀，保护 API Key 只在服务器端使用
AWS_API_KEY=your-api-key-here
```

**安全说明：**
- ✅ API Key 只在服务器端使用（Next.js API Routes）
- ✅ 不会暴露到浏览器端
- ✅ 前端通过 `/api/*` 路由调用，服务器端代理到 AWS

详细配置步骤请参考 [API_SECURITY_UPDATE.md](./API_SECURITY_UPDATE.md)

4. **启动开发服务器**
```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## ☁️ AWS Lambda 部署

### 前置要求

- AWS CLI 已安装并配置
- AWS SAM CLI 已安装
- 拥有 AWS 账号和适当的 IAM 权限

### 方法一：简化部署（推荐）

使用 `deploy-simple.bat` 快速部署：

```bash
cd lambda
deploy-simple.bat
```

此脚本会自动：
1. 安装依赖
2. 构建 Lambda 函数
3. 部署到 AWS（使用已保存的配置）

### 方法二：交互式部署（首次部署）

使用 `deploy.bat` 进行交互式配置：

```bash
cd lambda
deploy.bat
```

按照提示输入：
- **Stack Name**: `vrc-tryon-prod`（或 `vrc-tryon-dev`）
- **Region**: `ap-northeast-1`（东京）
- **Environment**: `prod`（或 `dev`）
- 确认 IAM 角色创建

### 部署后配置

1. **获取 API Gateway URL**
   - 在部署输出中查找 `ApiUrl`
   - 或在 AWS CloudFormation Console 的 Outputs 标签页中查看

2. **获取 API Key**
   - 登录 AWS Console
   - 进入 API Gateway > API Keys
   - 找到 `vrc-tryon-apikey-prod`
   - 点击 "Show" 查看 API Key 值

3. **配置前端环境变量**
   - 将 API URL 和 API Key 填入 `.env.local`
   - 详细步骤见 [API_KEY_SETUP.md](./API_KEY_SETUP.md)

### 架构说明

部署会创建以下 AWS 资源：

- **3 个 Lambda 函数**：
  - `PFTryonUploadTool` - 处理图片上传
  - `PFTryonGetListTool` - 获取图片列表
  - `PFTryonDeleteTool` - 删除图片

- **1 个 S3 存储桶**：
  - 名称：`vrc-tryon-images-{Environment}`
  - 配置：私有（不公开访问）
  - 使用预签名 URL 访问

- **1 个 API Gateway**：
  - 类型：REGIONAL（区域端点）
  - 认证：API Key 必需
  - 所有方法：POST（包括列表查询）

- **1 个 API Key 和 Usage Plan**：
  - 速率限制：100 请求/秒
  - 突发限制：200 请求
  - 配额：10,000 请求/天

## 📖 使用指南

### 上传图片

1. 点击首页的"上传图片"
2. 输入品牌名称
3. 拖放或选择图片文件
4. 点击"开始上传"
5. 等待上传完成，自动跳转到图片一览页面

### 浏览图片

1. 点击首页的"图片一览"或访问 `/gallery`
2. 使用搜索框搜索图片
3. 使用品牌筛选器筛选
4. 鼠标悬停在图片卡片上查看大图预览
5. 点击操作按钮下载或删除图片

### 图片管理

- **下载**：点击图片卡片上的下载图标
- **删除**：点击图片卡片上的删除图标
- **预览**：鼠标悬停在图片上自动显示大图

## 🎨 UI 设计特点

- **渐变背景**：使用柔和的渐变色营造现代感
- **圆角设计**：大圆角卡片和按钮，提升视觉舒适度
- **悬停效果**：丰富的交互反馈，提升用户体验
- **动画过渡**：流畅的动画效果，增强视觉吸引力
- **响应式布局**：适配各种屏幕尺寸
- **无障碍设计**：考虑可访问性和键盘导航

## 🔧 配置选项

### Next.js 配置

在 `next.config.js` 中配置：

```javascript
module.exports = {
  images: {
    domains: ['your-bucket.s3.amazonaws.com'],
  },
}
```

### Tailwind 配置

在 `tailwind.config.js` 中自定义主题颜色和动画。

### Lambda 配置

在 `lambda/template.yaml` 中配置：

- 内存大小（默认：512 MB）
- 超时时间（默认：30 秒）
- 环境变量（S3 桶名、URL 过期时间、时区）
- IAM 权限
- API Key 使用限制

## 📝 开发指南

### 添加新功能

1. 前端组件放在 `components/` 目录
2. 页面放在 `app/` 目录
3. API 函数放在 `lib/api.ts`
4. 工具函数放在 `lib/utils.ts`
5. Lambda 函数放在 `lambda/` 目录

### 样式规范

- 使用 Tailwind CSS 类名
- 遵循响应式设计原则
- 保持一致的间距和颜色

### 代码规范

- 使用 TypeScript 类型定义
- 添加必要的注释
- 遵循 ESLint 规则

## 🐛 故障排除

### 403 Forbidden 错误

- **原因**：API Key 未配置或错误
- **解决**：
  1. 检查 `.env.local` 中的 `NEXT_PUBLIC_API_KEY` 是否正确
  2. 在 AWS Console 中确认 API Key 已启用
  3. 确认 API Key 已关联到 Usage Plan

### 上传失败

- **原因**：Lambda 权限或 S3 配置问题
- **解决**：
  1. 查看浏览器控制台错误信息
  2. 检查 CloudWatch Logs
  3. 确认 Lambda IAM 角色有 S3 写入权限

### 图片无法显示

- **原因**：预签名 URL 过期或生成失败
- **解决**：
  1. 刷新页面（重新获取列表和新的预签名 URL）
  2. 检查 S3 CORS 配置
  3. 查看 Lambda 日志确认预签名 URL 生成成功

### CORS 错误

- **原因**：API Gateway CORS 配置缺少 `x-api-key` header
- **解决**：
  1. 确认 `template.yaml` 中 CORS 配置包含 `x-api-key`
  2. 重新部署 API Gateway

### Lambda 函数错误

- **解决**：
  1. 查看 CloudWatch Logs（详细日志已添加）
  2. 检查环境变量配置（`S3_BUCKET_NAME`, `SIGNED_URL_EXPIRATION`, `TZ`）
  3. 确认 IAM 角色权限

### 预签名 URL 过期

- **原因**：默认 1 小时过期
- **解决**：
  1. 修改 `template.yaml` 中的 `SIGNED_URL_EXPIRATION` 环境变量
  2. 重新部署

### API 请求超限

- **原因**：超过 Usage Plan 限制
- **解决**：
  1. 在 AWS Console 的 API Gateway > Usage Plans 中查看使用情况
  2. 修改 `template.yaml` 中的 `UsagePlan` 配置
  3. 重新部署

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

如有问题，请通过以下方式联系：

- 提交 GitHub Issue
- 发送邮件至：support@example.com

## 🙏 致谢

- Next.js 团队
- Tailwind CSS 团队
- AWS 云服务
- 所有开源贡献者

---

**享受使用服装图片管理系统！** 🎉

