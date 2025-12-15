# 项目结构说明

## 📂 目录结构

```
vrc-tryon-management/
│
├── app/                          # Next.js 14 App Router
│   ├── page.tsx                 # 首页（导航页面）
│   ├── layout.tsx               # 全局布局
│   ├── globals.css              # 全局样式
│   ├── upload/                  # 上传功能
│   │   └── page.tsx            # 上传页面
│   └── gallery/                 # 图片一览
│       └── page.tsx            # 图片一览页面（带悬停预览）
│
├── components/                   # React 组件
│   ├── Loading.tsx              # 加载状态组件
│   └── ErrorMessage.tsx         # 错误消息组件
│
├── lib/                          # 工具库
│   ├── api.ts                   # API 客户端（与 Lambda 通信）
│   └── utils.ts                 # 工具函数
│
├── lambda/                       # AWS Lambda 后端
│   ├── upload-handler.js        # 上传处理函数
│   ├── list-handler.js          # 列表获取函数
│   ├── delete-handler.js        # 删除处理函数
│   ├── package.json             # Lambda 依赖
│   ├── serverless.yml           # Serverless Framework 配置
│   ├── deploy.sh               # 部署脚本
│   └── README.md               # Lambda 文档
│
├── public/                       # 静态资源
│
├── package.json                  # 项目依赖和脚本
├── next.config.js               # Next.js 配置
├── tsconfig.json                # TypeScript 配置
├── tailwind.config.js           # Tailwind CSS 配置
├── postcss.config.js            # PostCSS 配置
├── .gitignore                   # Git 忽略文件
├── .env.example                 # 环境变量示例
│
├── README.md                     # 项目说明
├── DEPLOYMENT.md                # 部署指南
├── CONTRIBUTING.md              # 贡献指南
├── LICENSE                       # 许可证
└── PROJECT_STRUCTURE.md         # 本文件
```

## 🎯 核心功能模块

### 1. 首页（`app/page.tsx`）

- **功能**：应用入口，提供导航
- **特点**：
  - 精美的欢迎界面
  - 上传和浏览功能的快速入口
  - 功能特点展示
  - 响应式设计

### 2. 上传页面（`app/upload/page.tsx`）

- **功能**：上传服装图片
- **特点**：
  - 品牌名称输入
  - 拖放上传支持
  - 批量文件选择
  - 实时上传进度
  - 文件预览
  - 成功/失败状态显示

### 3. 图片一览页面（`app/gallery/page.tsx`）

- **功能**：浏览和管理已上传的图片
- **特点**：
  - 网格布局展示
  - **鼠标悬停预览**（核心功能）
  - 搜索功能
  - 品牌筛选
  - 下载和删除操作
  - 文件信息显示

### 4. API 客户端（`lib/api.ts`）

- **功能**：前后端通信
- **方法**：
  - `uploadImages()` - 上传图片
  - `listImages()` - 获取列表
  - `deleteImages()` - 删除图片
  - `fileToBase64()` - 文件转换

### 5. Lambda 函数（`lambda/`）

#### upload-handler.js
- 接收 Base64 编码的图片
- 验证文件类型和大小
- 上传到 S3
- 返回结果和 URL

#### list-handler.js
- 列出 S3 对象
- 获取元数据
- 支持品牌筛选
- 返回格式化的图片列表

#### delete-handler.js
- 批量删除 S3 对象
- 错误处理
- 返回删除结果

## 🎨 UI/UX 设计特点

### 设计理念

参考了 AWS S3 控制台的界面，但进行了现代化改进：

1. **更加柔和的颜色**
   - 使用渐变背景
   - 主色调：蓝色系（Primary 500-600）
   - 辅助色：绿色、红色

2. **更大的圆角**
   - 卡片：`rounded-2xl`
   - 按钮：`rounded-xl`
   - 输入框：`rounded-xl`

3. **丰富的交互**
   - 悬停效果
   - 缩放动画
   - 过渡效果
   - 阴影变化

4. **更好的视觉层次**
   - 使用阴影区分层级
   - 清晰的信息架构
   - 合理的间距

### 关键 UI 组件

1. **导航栏**
   - 固定在顶部
   - 品牌标识
   - 操作按钮

2. **卡片**
   - 白色背景
   - 大圆角
   - 悬停阴影

3. **按钮**
   - 渐变背景（主按钮）
   - 边框样式（次要按钮）
   - 图标 + 文字

4. **图片预览**
   - 固定位置跟随鼠标
   - 大尺寸预览（400x400）
   - 半透明背景信息
   - 边框和阴影

## 🔧 技术实现细节

### 悬停预览功能

```typescript
// 核心实现逻辑
const handleMouseMove = (e: React.MouseEvent, imageId: string) => {
  setHoveredImage(imageId)
  
  // 计算位置，防止超出屏幕
  let x = e.clientX + 20
  let y = e.clientY + 20
  
  if (x + 400 > window.innerWidth) {
    x = e.clientX - 400 - 20
  }
  
  if (y + 400 > window.innerHeight) {
    y = e.clientY - 400 - 20
  }
  
  setPreviewPosition({ x, y })
}
```

### 拖放上传

```typescript
// 拖放处理
const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  const files = e.dataTransfer.files
  handleFileSelect(files)
}
```

### Base64 转换

```typescript
// 文件转 Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.readAsDataURL(file)
  })
}
```

## 📱 响应式设计

### 断点

- **sm**: 640px - 小屏幕设备
- **md**: 768px - 平板设备
- **lg**: 1024px - 笔记本电脑
- **xl**: 1280px - 桌面显示器

### 布局适配

```typescript
// 网格布局示例
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {/* 图片卡片 */}
</div>
```

## 🚀 部署架构

```
用户浏览器
    │
    ├─→ Next.js 前端（Vercel/Amplify）
    │       │
    │       └─→ API Gateway
    │               │
    │               ├─→ Lambda (Upload)
    │               ├─→ Lambda (List)
    │               └─→ Lambda (Delete)
    │                       │
    │                       └─→ S3 存储桶
    │
    └─→ S3 (图片访问)
```

## 📊 数据流

### 上传流程

```
1. 用户选择文件 + 输入品牌
2. 文件转 Base64
3. 发送到 Lambda (POST /upload)
4. Lambda 验证并上传到 S3
5. 返回 URL 和结果
6. 前端显示成功状态
7. 跳转到图片一览
```

### 浏览流程

```
1. 加载图片一览页面
2. 调用 Lambda (GET /list)
3. Lambda 查询 S3
4. 返回图片列表
5. 前端渲染网格
6. 用户悬停 → 显示预览
```

### 删除流程

```
1. 用户点击删除按钮
2. 确认操作
3. 调用 Lambda (POST /delete)
4. Lambda 从 S3 删除
5. 返回结果
6. 前端更新列表
```

## 🔐 安全考虑

1. **文件验证**
   - 类型检查（仅图片）
   - 大小限制（10MB）
   - MIME 类型验证

2. **访问控制**
   - Lambda 函数权限
   - S3 存储桶策略
   - API Gateway 认证（可选）

3. **CORS 配置**
   - Lambda 响应头
   - S3 CORS 规则
   - API Gateway CORS

## 📈 性能优化

1. **前端**
   - 图片懒加载
   - 代码分割
   - 缓存策略

2. **后端**
   - Lambda 预留并发
   - S3 传输加速
   - CloudFront CDN

3. **数据库**
   - （未来）使用 DynamoDB 存储元数据
   - 减少 S3 API 调用

## 🔮 未来改进

1. **功能扩展**
   - 批量编辑
   - 图片标签
   - 高级搜索
   - 收藏夹
   - 分享链接

2. **技术升级**
   - 添加数据库
   - 用户认证
   - 图片压缩
   - AI 自动标签

3. **UI 改进**
   - 暗色模式
   - 自定义主题
   - 更多视图选项
   - 拖放排序

## 📞 维护指南

### 常规维护

- 定期更新依赖
- 监控 AWS 成本
- 查看错误日志
- 备份重要数据

### 问题排查

- 查看 CloudWatch 日志
- 检查 Network 请求
- 验证环境变量
- 测试 API 端点

---

**项目结构清晰，易于维护和扩展！** 🎯

