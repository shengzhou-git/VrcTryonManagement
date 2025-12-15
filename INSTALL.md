# 安装说明

详细的安装和配置指南。

## 📋 系统要求

### 必需
- **Node.js**: 20.x 或更高版本
- **npm**: 9.x 或更高版本（或 yarn/pnpm）
- **操作系统**: Windows 10/11, macOS 10.15+, Linux

### 推荐
- **内存**: 4GB RAM 或更多
- **存储**: 至少 500MB 可用空间
- **浏览器**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### AWS 部署需要
- **AWS 账号**
- **AWS CLI** (可选，用于验证)
- **Serverless Framework** (推荐用于部署)

## 🔧 安装步骤

### 步骤 1: 检查 Node.js 版本

```bash
node --version
# 应该显示 v20.x.x 或更高

npm --version
# 应该显示 9.x.x 或更高
```

如果版本过低或未安装，请访问 [nodejs.org](https://nodejs.org/) 下载安装。

### 步骤 2: 克隆或下载项目

#### 使用 Git 克隆

```bash
git clone <repository-url>
cd vrc-tryon-management
```

#### 或下载 ZIP

1. 下载项目 ZIP 文件
2. 解压到目标目录
3. 打开终端，进入项目目录

### 步骤 3: 安装前端依赖

```bash
# 在项目根目录
npm install
```

这将安装以下主要依赖：
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Lucide React (图标)
- Framer Motion (动画)

**预计时间**: 2-5 分钟（取决于网络速度）

### 步骤 4: 安装 Lambda 依赖（可选）

如果你计划部署到 AWS：

```bash
cd lambda
npm install
cd ..
```

这将安装：
- AWS SDK

**预计时间**: 1-2 分钟

### 步骤 5: 配置环境变量（可选）

#### 开发环境

开发时可以不配置，使用模拟数据。

#### 生产环境

创建 `.env.local` 文件：

```bash
# Windows
copy .env.example .env.local

# macOS/Linux
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# AWS 配置（如果使用真实后端）
NEXT_PUBLIC_API_URL=https://your-api-gateway-url.amazonaws.com/prod
```

## 🚀 运行项目

### 开发模式

```bash
npm run dev
```

服务器将启动在 http://localhost:3000

**特点**：
- 热重载（修改代码自动刷新）
- 详细的错误信息
- 使用模拟数据（如果未连接 AWS）

### 生产模式

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

生产服务器将启动在 http://localhost:3000

**特点**：
- 优化的构建
- 更快的性能
- 压缩的资源

## 🔍 验证安装

### 1. 检查首页

访问 http://localhost:3000

你应该看到：
- ✅ 精美的欢迎页面
- ✅ 两个功能卡片（上传、浏览）
- ✅ 页脚信息

### 2. 检查上传页面

访问 http://localhost:3000/upload

你应该看到：
- ✅ 品牌名称输入框
- ✅ 拖放上传区域
- ✅ 文件选择按钮

### 3. 检查图片一览

访问 http://localhost:3000/gallery

你应该看到：
- ✅ 搜索和筛选栏
- ✅ 图片网格（模拟数据）
- ✅ 鼠标悬停显示预览

### 4. 检查控制台

浏览器控制台（F12）不应该有错误。

## 🐛 常见安装问题

### 问题 1: npm install 失败

**症状**：
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**解决方案**：
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 和 lock 文件
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 问题 2: 端口 3000 被占用

**症状**：
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案**：

#### Windows
```powershell
# 查找占用端口的进程
netstat -ano | findstr :3000

# 结束进程（替换 PID）
taskkill /PID <PID> /F
```

#### macOS/Linux
```bash
# 查找并结束进程
lsof -ti:3000 | xargs kill -9

# 或使用其他端口
PORT=3001 npm run dev
```

### 问题 3: TypeScript 错误

**症状**：
```
Cannot find module 'next' or its corresponding type declarations
```

**解决方案**：
```bash
# 重新安装类型定义
npm install --save-dev @types/node @types/react @types/react-dom

# 或完全重新安装
rm -rf node_modules package-lock.json
npm install
```

### 问题 4: Tailwind CSS 不工作

**症状**：样式不显示或只有基础样式

**解决方案**：
```bash
# 确保配置文件存在
ls tailwind.config.js postcss.config.js

# 重启开发服务器
# Ctrl+C 停止，然后
npm run dev
```

### 问题 5: 图片预览不显示

**症状**：悬停时没有预览

**检查**：
1. 浏览器控制台是否有错误
2. 检查 `app/gallery/page.tsx` 是否正确
3. 清除浏览器缓存
4. 尝试其他浏览器

### 问题 6: Node.js 版本过低

**症状**：
```
error Unsupported engine: required Node version >=20.0.0
```

**解决方案**：

#### 使用 nvm (推荐)

```bash
# 安装 nvm
# Windows: https://github.com/coreybutler/nvm-windows
# macOS/Linux: https://github.com/nvm-sh/nvm

# 安装 Node.js 20
nvm install 20
nvm use 20
```

#### 或直接安装

访问 [nodejs.org](https://nodejs.org/) 下载最新 LTS 版本。

## 📦 依赖说明

### 前端依赖

```json
{
  "next": "^14.0.4",           // React 框架
  "react": "^18.2.0",          // UI 库
  "react-dom": "^18.2.0",      // DOM 渲染
  "typescript": "^5.3.3",      // 类型系统
  "tailwindcss": "^3.3.6",     // CSS 框架
  "lucide-react": "^0.294.0",  // 图标库
  "framer-motion": "^10.16.16", // 动画库
  "axios": "^1.6.2"            // HTTP 客户端
}
```

### Lambda 依赖

```json
{
  "aws-sdk": "^2.1515.0"       // AWS 服务 SDK
}
```

## 🎓 学习资源

### Next.js
- [官方文档](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

### React
- [官方文档](https://react.dev/)
- [React Hooks](https://react.dev/reference/react)

### Tailwind CSS
- [官方文档](https://tailwindcss.com/docs)
- [组件示例](https://tailwindui.com/)

### TypeScript
- [官方手册](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### AWS Lambda
- [Lambda 文档](https://docs.aws.amazon.com/lambda/)
- [Serverless Framework](https://www.serverless.com/framework/docs)

## 📞 获取帮助

### 文档

- [README.md](README.md) - 项目概述
- [QUICKSTART.md](QUICKSTART.md) - 快速开始
- [DEPLOYMENT.md](DEPLOYMENT.md) - 部署指南
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - 项目结构

### 支持

- 提交 GitHub Issue
- 查看现有 Issues
- 阅读贡献指南

## ✅ 安装清单

完成以下清单确保安装成功：

- [ ] Node.js 20+ 已安装
- [ ] npm 9+ 已安装
- [ ] 项目代码已下载
- [ ] `npm install` 成功完成
- [ ] `npm run dev` 可以启动
- [ ] 浏览器可以访问 http://localhost:3000
- [ ] 首页正常显示
- [ ] 上传页面可以访问
- [ ] 图片一览页面可以访问
- [ ] 悬停预览功能正常
- [ ] 控制台没有错误

## 🎉 下一步

安装完成后：

1. 📖 阅读 [QUICKSTART.md](QUICKSTART.md) 快速上手
2. 🎨 自定义配置和样式
3. ☁️ （可选）部署到 AWS
4. 🚀 开始开发自己的功能

---

**安装愉快！如有问题，请查看故障排除部分或提交 Issue。** 🚀

