# S3 元数据非 ASCII 字符修复

## 🐛 问题描述

**错误信息**：
```
ERROR [PFTryonUploadTool] [1/3] 错误: Invalid character in header content ["x-amz-meta-originalname"]
```

**原因**：
S3 的元数据（Metadata）只能包含 ASCII 字符。当品牌名称或文件名包含中文、日文等非 ASCII 字符时，会导致上传失败。

## ✅ 解决方案

### 1. 上传时：Base64 编码元数据

在 `lambda/PFTryonUploadTool/index.mjs` 中，对元数据值进行 Base64 编码：

```javascript
Metadata: {
  brand: Buffer.from(brandName, 'utf8').toString('base64'),              // Base64 编码品牌名
  originalname: Buffer.from(file.name, 'utf8').toString('base64'),      // Base64 编码文件名
  uploaddate: new Date().toISOString()
}
```

**优点**：
- Base64 只包含 ASCII 字符（A-Z, a-z, 0-9, +, /, =）
- 可以完整保留原始信息（包括中文、日文等）
- 解码时不会丢失信息

### 2. 读取时：Base64 解码元数据

在 `lambda/PFTryonGetListTool/index.mjs` 中，对元数据进行 Base64 解码：

```javascript
// 解码元数据（从 Base64 解码，支持中日文）
const decodedBrand = metadata.Metadata?.brand 
  ? decodeBase64Metadata(metadata.Metadata.brand) 
  : safeDecodeURIComponent(objectBrand);

const decodedFileName = metadata.Metadata?.originalname 
  ? decodeBase64Metadata(metadata.Metadata.originalname) 
  : fileName;
```

**辅助函数**：
```javascript
function decodeBase64Metadata(base64String) {
  try {
    if (!base64String) {
      return '';
    }
    return Buffer.from(base64String, 'base64').toString('utf8');
  } catch (error) {
    console.warn(`Base64 解码失败: ${error.message}, 返回原始值`);
    return base64String; // 如果解码失败，返回原始值
  }
}
```

### 3. 修复预签名 URL 生成

**问题**：使用了 `PutObjectCommand` 而不是 `GetObjectCommand`

**修复**：
```javascript
// 修复前（错误）
const getCommand = new PutObjectCommand({
  Bucket: BUCKET_NAME,
  Key: fileKey
});

// 修复后（正确）
const getCommand = new GetObjectCommand({
  Bucket: BUCKET_NAME,
  Key: fileKey
});
```

**原因**：
- `PutObjectCommand` 用于上传
- `GetObjectCommand` 用于读取/下载
- 预签名 URL 应该用于读取，所以使用 `GetObjectCommand`

## 📝 修改的文件

1. **`lambda/PFTryonUploadTool/index.mjs`**
   - ✅ 导入 `GetObjectCommand`
   - ✅ 元数据值 Base64 编码
   - ✅ 修复预签名 URL 生成（使用 `GetObjectCommand`）
   - ✅ 更新注释（Node.js 18.x）

2. **`lambda/PFTryonGetListTool/index.mjs`**
   - ✅ 添加 `decodeBase64Metadata` 函数
   - ✅ 添加 `safeDecodeURIComponent` 函数
   - ✅ 解码元数据值
   - ✅ 错误处理

## 🧪 测试场景

### 测试用例 1：中文品牌名和文件名
- **品牌名**：耐克
- **文件名**：1074的副本.jpg
- **预期**：上传成功，列表显示正确的中文名称

### 测试用例 2：日文品牌名和文件名
- **品牌名**：ユニクロ
- **文件名**：シャツ_001.jpg
- **预期**：上传成功，列表显示正确的日文名称

### 测试用例 3：混合字符
- **品牌名**：Nike 耐克
- **文件名**：shirt-001_シャツ.jpg
- **预期**：上传成功，列表显示正确的混合字符

## 🔍 验证步骤

1. **部署 Lambda 函数**
   ```bash
   cd lambda
   deploy-simple.bat
   ```

2. **测试上传**
   - 使用包含中文/日文的品牌名和文件名上传图片
   - 检查 CloudWatch 日志，确认没有错误

3. **验证列表**
   - 查看图片列表
   - 确认品牌名和文件名显示正确（中文/日文）

4. **验证预签名 URL**
   - 点击图片预览
   - 确认图片可以正常显示

## 📊 数据流

### 上传流程
```
前端（中文品牌名/文件名）
  ↓
Base64 编码（lib/api.ts）
  ↓
Lambda PFTryonUploadTool
  ↓
Base64 编码元数据（支持中文/日文）
  ↓
S3 存储（元数据为 ASCII）
```

### 读取流程
```
Lambda PFTryonGetListTool
  ↓
读取 S3 元数据（Base64 编码）
  ↓
Base64 解码（恢复中文/日文）
  ↓
返回前端（正确显示）
```

## ⚠️ 注意事项

1. **向后兼容性**
   - 旧数据可能没有 Base64 编码的元数据
   - 代码中已添加 fallback 逻辑
   - 如果元数据不存在，从 S3 Key 中提取并 URL 解码

2. **性能影响**
   - Base64 编码/解码性能开销很小
   - 对上传和列表性能影响可忽略

3. **存储空间**
   - Base64 编码会增加约 33% 的存储空间
   - 元数据通常很小，影响可忽略

## ✅ 修复完成

- ✅ 支持中文品牌名和文件名
- ✅ 支持日文品牌名和文件名
- ✅ 支持混合字符
- ✅ 预签名 URL 生成修复
- ✅ 错误处理完善
- ✅ 向后兼容

现在可以正常上传包含中文、日文等非 ASCII 字符的品牌名和文件名了！

