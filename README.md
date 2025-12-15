# 服装图片管理系统

一个现代化的服装图片上传和管理平台，采用 Next.js 前端和 AWS Lambda 后端架构。

## ✨ 功能特点

- 🎨 **现代化 UI 设计** - 简洁美观的界面，提供出色的用户体验
- 📤 **批量上传** - 支持拖放上传和多文件批量处理
- 🏷️ **品牌管理** - 为每组图片添加品牌信息，方便分类管理
- 🔍 **智能预览** - 鼠标悬停即可预览图片，无需点击
- 🎯 **搜索筛选** - 支持按品牌和名称快速搜索
- ⚡ **高性能** - 基于 Next.js 14 和 AWS 云服务，快速可靠
- 📱 **响应式设计** - 完美适配桌面和移动设备

## 🛠️ 技术栈

### 前端
- **Next.js 14** - React 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 现代化样式
- **Lucide React** - 图标库

### 后端
- **AWS Lambda** - 无服务器计算
- **Node.js 20** - 运行时环境
- **AWS S3** - 对象存储
- **AWS API Gateway** - API 管理

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
│   ├── upload-handler.js    # 上传处理
│   ├── list-handler.js      # 列表处理
│   ├── delete-handler.js    # 删除处理
│   ├── package.json         # Lambda 依赖
│   ├── serverless.yml       # Serverless 配置
│   └── deploy.sh           # 部署脚本
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

创建 `.env.local` 文件：
```env
# AWS 配置
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET_NAME=your_bucket_name

# Lambda API 地址（部署后获取）
NEXT_PUBLIC_API_URL=https://your-api-gateway-url.amazonaws.com
```

4. **启动开发服务器**
```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## ☁️ AWS Lambda 部署

### 方法一：使用 Serverless Framework（推荐）

1. **安装 Serverless Framework**
```bash
npm install -g serverless
```

2. **配置 AWS 凭证**
```bash
serverless config credentials --provider aws --key YOUR_KEY --secret YOUR_SECRET
```

3. **部署到 AWS**
```bash
cd lambda
npm install
serverless deploy --stage dev
```

4. **获取 API 端点**

部署完成后，控制台会显示 API Gateway URL，将其添加到前端的 `.env.local` 文件中。

### 方法二：手动部署

1. **打包 Lambda 函数**
```bash
cd lambda
npm install
chmod +x deploy.sh
./deploy.sh
```

2. **在 AWS Console 中创建 Lambda 函数**

- 运行时：Node.js 20.x
- 上传 `function.zip`
- 配置环境变量：`S3_BUCKET_NAME`
- 设置 IAM 角色权限（S3 读写）

3. **创建 API Gateway**

- 创建 REST API
- 添加资源和方法（POST /upload, GET /list, POST /delete）
- 配置 CORS
- 部署 API

4. **创建 S3 存储桶**

- 启用 CORS
- 配置公开读取权限（可选）

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

在 `lambda/serverless.yml` 中配置：

- 内存大小
- 超时时间
- 环境变量
- IAM 权限

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

### 上传失败

- 检查 AWS 凭证是否正确
- 确认 S3 存储桶权限
- 查看浏览器控制台错误信息

### 图片无法显示

- 确认 S3 CORS 配置
- 检查图片 URL 是否正确
- 验证存储桶的公开访问设置

### Lambda 函数错误

- 查看 CloudWatch 日志
- 检查环境变量配置
- 确认 IAM 角色权限

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

