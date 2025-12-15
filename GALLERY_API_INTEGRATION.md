# Gallery 页面 API 集成和国际化说明

## ✅ 完成的修改

### 1. 移除模拟数据
- ❌ 删除了 `mockImages` 模拟数据
- ✅ 改为从 Lambda API 获取真实数据

### 2. 添加国际化支持
- ✅ 导入 `useLanguage` 和 `LanguageSwitcher`
- ✅ 所有 UI 文本使用翻译
- ✅ 支持中文、英文、日文三种语言

### 2. 实现真实 API 调用

#### 加载图片列表
```typescript
const loadImages = async () => {
  const brand = selectedBrand === '全部' ? undefined : selectedBrand
  const response = await listImages(brand)
  setImages(response.images)
}
```

#### 删除图片
```typescript
const handleDelete = async (image: ImageItem) => {
  await deleteImages([image.key])
  setImages(prev => prev.filter(img => img.id !== image.id))
}
```

#### 下载图片
```typescript
const handleDownload = async (image: ImageItem) => {
  const response = await fetch(image.url)
  const blob = await response.blob()
  // 触发下载
}
```

### 3. 添加状态管理

#### 新增状态
- `isLoading` - 加载状态
- `error` - 错误信息
- `isDeleting` - 删除中的图片 ID

#### UI 状态
- ✅ 加载中显示 Spinner
- ✅ 错误时显示错误信息和重试按钮
- ✅ 空状态显示提示和上传按钮
- ✅ 删除时按钮显示 Spinner

### 4. 接口完善

#### `lib/api.ts` 更新

##### ImageItem 接口
```typescript
export interface ImageItem {
  id: string           // S3 对象 ETag
  name: string         // 原始文件名（从 metadata 获取）
  brand: string        // 品牌名（从 metadata 获取）
  url: string          // 预签名 URL（1 小时有效）
  key: string          // S3 对象 Key（用于删除）
  size: number         // 文件大小（字节）
  uploadDate: string   // 上传日期（ISO 字符串）
  type: string         // MIME 类型
  urlExpiresIn?: number // URL 过期时间（秒）
}
```

##### ListImagesResponse 接口
```typescript
export interface ListImagesResponse {
  images: ImageItem[]  // 图片列表
  total: number        // 总数
  brand: string        // 筛选的品牌
  note?: string        // 备注信息（如 URL 过期提示）
}
```

### 5. UI 增强

#### 刷新按钮
- 位置：标题栏右侧
- 功能：重新加载图片列表（刷新预签名 URL）
- 状态：加载时显示 Spinner

#### URL 过期提示
- 位置：统计信息旁边
- 显示：图片链接有效期（默认 1 小时）
- 样式：琥珀色提示框

#### 操作按钮
- **下载按钮**：点击下载图片到本地
- **删除按钮**：删除 S3 中的图片（带确认）
- 删除时按钮显示 Spinner，防止重复操作

## 🔄 数据流

### 加载流程
```
用户访问 /gallery
  ↓
useEffect 触发 loadImages()
  ↓
调用 /api/list (Next.js API Route)
  ↓
服务器端调用 AWS API Gateway /list (带 API Key)
  ↓
Lambda PFTryonGetListTool
  ↓
S3 ListObjects + GetObjectCommand (生成预签名 URL)
  ↓
返回图片列表到前端
  ↓
更新 UI 显示
```

### 删除流程
```
用户点击删除按钮
  ↓
确认对话框
  ↓
调用 /api/delete (Next.js API Route)
  ↓
服务器端调用 AWS API Gateway /delete (带 API Key)
  ↓
Lambda PFTryonDeleteTool
  ↓
S3 DeleteObjects
  ↓
成功后从前端列表中移除
  ↓
更新 UI 显示
```

### 下载流程
```
用户点击下载按钮
  ↓
fetch 预签名 URL
  ↓
转换为 Blob
  ↓
创建临时下载链接
  ↓
触发浏览器下载
  ↓
清理临时链接
```

## 🎯 Lambda API 返回数据示例

### GET /list 响应
```json
{
  "images": [
    {
      "id": "abc123",
      "name": "shirt-001.jpg",
      "brand": "Nike",
      "url": "https://s3.amazonaws.com/...?X-Amz-Signature=...",
      "key": "Nike/1234567890-shirt-001.jpg",
      "size": 524288,
      "uploadDate": "2025-12-15T10:30:00.000Z",
      "type": "image/jpeg",
      "urlExpiresIn": 3600
    }
  ],
  "total": 1,
  "brand": "全部",
  "note": "图片 URL 为临时访问链接，有效期 1 小时"
}
```

### POST /delete 请求
```json
{
  "keys": ["Nike/1234567890-shirt-001.jpg"]
}
```

### POST /delete 响应
```json
{
  "message": "成功删除 1 张图片",
  "deletedKeys": ["Nike/1234567890-shirt-001.jpg"],
  "deletedCount": 1
}
```

## ⚠️ 注意事项

### 1. 预签名 URL 过期
- **有效期**：默认 1 小时（3600 秒）
- **过期后**：图片无法显示
- **解决方案**：点击刷新按钮重新获取新的预签名 URL

### 2. 品牌筛选
- 切换品牌时自动重新加载列表
- `selectedBrand` 变化触发 `useEffect`

### 3. 搜索功能
- 前端过滤（不调用 API）
- 同时搜索文件名和品牌名
- 实时过滤，无需重新加载

### 4. 性能优化
- 删除操作是即时的（乐观更新）
- 删除成功后直接从前端列表移除
- 无需重新加载整个列表

### 5. 错误处理
- 网络错误显示错误信息和重试按钮
- 删除失败显示 alert 提示
- 下载失败显示 alert 提示

## 🔍 接口差异检查

### ✅ 已实现的接口
1. **GET /list** → **POST /list** ✅
2. **POST /upload** ✅
3. **POST /delete** ✅

### ✅ 完整的字段
1. **ImageItem**
   - ✅ id
   - ✅ name (原始文件名，从 metadata)
   - ✅ brand (从 metadata)
   - ✅ url (预签名 URL)
   - ✅ key (用于删除)
   - ✅ size
   - ✅ uploadDate
   - ✅ type
   - ✅ urlExpiresIn (新增)

2. **ListImagesResponse**
   - ✅ images
   - ✅ total
   - ✅ brand
   - ✅ note (新增)

### 📝 无需补充的接口
所有必要的接口都已实现！

## 🚀 测试清单

### 功能测试
- [ ] 访问 `/gallery` 页面加载图片列表
- [ ] 搜索框输入关键字过滤图片
- [ ] 品牌下拉框筛选图片
- [ ] 鼠标悬停显示大图预览
- [ ] 点击下载按钮下载图片
- [ ] 点击删除按钮删除图片
- [ ] 点击刷新按钮重新加载列表
- [ ] 空状态显示正确（无图片时）
- [ ] 错误状态显示正确（网络错误时）
- [ ] 加载状态显示正确（加载中）

### 边界测试
- [ ] 预签名 URL 过期后点击刷新
- [ ] 删除最后一张图片后显示空状态
- [ ] 搜索无结果时显示正确提示
- [ ] 网络断开时显示错误并可重试
- [ ] 快速连续点击删除按钮（防抖）

## 📚 相关文档

- [lib/api.ts](./lib/api.ts) - API 客户端
- [app/api/list/route.ts](./app/api/list/route.ts) - List API 路由
- [app/api/delete/route.ts](./app/api/delete/route.ts) - Delete API 路由
- [lambda/PFTryonGetListTool/index.mjs](./lambda/PFTryonGetListTool/index.mjs) - Lambda 列表函数
- [lambda/PFTryonDeleteTool/index.mjs](./lambda/PFTryonDeleteTool/index.mjs) - Lambda 删除函数

## 🌐 国际化功能

### 翻译的内容
- ✅ 导航栏（应用名称、上传、返回）
- ✅ 标题和统计（图片一览、共 X 张图片）
- ✅ 刷新按钮（刷新/刷新中）
- ✅ URL 过期提示（图片链接有效期：X 分钟）
- ✅ 搜索框占位符
- ✅ 品牌筛选（全部/すべて/All Brands）
- ✅ 加载状态（加载中...）
- ✅ 错误状态（加载失败、重试）
- ✅ 空状态（还没有上传图片、没有找到图片）
- ✅ 按钮提示（下载、删除）
- ✅ 确认对话框（确定要删除这张图片吗？）
- ✅ 成功/失败消息（删除成功、删除失败、下载失败）

### 语言切换
- 位置：导航栏右侧
- 组件：`LanguageSwitcher`
- 持久化：LocalStorage
- 自动检测：浏览器语言

## 🎉 完成

Gallery 页面现已完全集成真实 API，移除了所有模拟数据，并支持三种语言！

### 功能完整性
✅ 真实 API 调用（Lambda 后端）
✅ 图片列表加载
✅ 品牌筛选
✅ 搜索功能
✅ 图片预览（鼠标悬停）
✅ 图片下载
✅ 图片删除
✅ 刷新列表
✅ 加载状态
✅ 错误处理
✅ 空状态
✅ 国际化（中/英/日）
✅ 语言切换
✅ URL 过期提示
✅ 响应式设计


