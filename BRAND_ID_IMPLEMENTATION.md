# Brand ID 系统实施总结

## 完成的修改

### 1. DynamoDB 表结构更新

**文件**: `lambda/template.yaml`

- 将主键从 `UserId + BrandName` 改为 `UserId + BrandId`
- 添加 `BrandId` 属性（UUID 格式）
- 添加 `BrandNameIndex` GSI，用于通过品牌名称查询 BrandId

**新表结构**:
```yaml
主键: UserId (HASH) + BrandId (RANGE)
GSI: BrandNameIndex (UserId + BrandName)
属性: BrandId, BrandName, CreatedAt, UpdatedAt, Email, Groups, UploadCount
```

### 2. Lambda 函数更新

**文件**: `lambda/PFTryonUploadTool/index.mjs`

#### 新增功能:
1. **导入 UUID 生成器**: `import { randomUUID } from 'crypto'`
2. **导入 DynamoDB QueryCommand**: 用于 GSI 查询
3. **getBrandId() 函数**: 
   - 通过 GSI 查询品牌名称
   - 如果存在返回 BrandId
   - 如果不存在创建新品牌并返回新的 UUID
4. **createBrand() 函数**: 创建新品牌记录到 DynamoDB

#### 修改的路由:

**`/upload/prepare`**:
- 接收 `brandName`
- 调用 `getBrandId()` 获取或创建 `brandId`
- 使用 `brandId` 构建 S3 key: `{userId}/{brandId}/{timestamp}-{filename}.jpg`
- 返回 `brandId` 给前端

**`/upload/complete`**:
- 接收 `brandId`（必需）和 `brandName`（可选，用于 metadata）
- 使用 `brandId` 更新 DynamoDB
- 在 S3 metadata 中同时保存 `brandid` 和 `brand`

### 3. 前端 API 更新

**文件**: `lib/api.ts`

- 添加 `brandId` 到 `UploadPrepareResponse` 类型
- 从 `/upload/prepare` 响应中提取 `brandId`
- 将 `brandId` 传递给 `/upload/complete`

## S3 路径变化

### 修改前:
```
{userId}/{urlEncodedBrandName}/{timestamp}-{filename}.jpg
例如: user123/%E8%80%90%E5%85%8B/1702742400000-shirt.jpg
```

### 修改后:
```
{userId}/{brandId}/{timestamp}-{filename}.jpg
例如: user123/550e8400-e29b-41d4-a716-446655440000/1702742400000-shirt.jpg
```

## 优点

1. **✅ 避免编码问题**: S3 key 中不再有 URL 编码的中文/日文字符
2. **✅ 路径更简洁**: UUID 比编码后的品牌名称更短
3. **✅ 支持品牌改名**: 修改品牌名称不影响 S3 路径
4. **✅ 更好的性能**: UUID 比较比字符串比较更快
5. **✅ 向后兼容**: 前端无需修改，后端自动处理

## 工作流程

### 首次上传新品牌:
1. 用户输入品牌名称 "耐克"
2. `/upload/prepare` 调用 `getBrandId("user123", "耐克")`
3. GSI 查询未找到，创建新品牌，生成 UUID: `550e8400-...`
4. 返回 `brandId` 给前端
5. S3 路径: `user123/550e8400-.../image.jpg`

### 再次上传相同品牌:
1. 用户输入品牌名称 "耐克"
2. `/upload/prepare` 调用 `getBrandId("user123", "耐克")`
3. GSI 查询找到现有品牌，返回 UUID: `550e8400-...`
4. 使用相同的 `brandId`
5. S3 路径: `user123/550e8400-.../image2.jpg`

## 部署步骤

### 1. 删除旧表（开发环境）
```bash
aws dynamodb delete-table --table-name PFTryonUserBrand-dev
```

### 2. 部署新表和 Lambda
```bash
cd lambda
sam build
sam deploy
```

### 3. 验证
- 上传中文品牌名称的图片
- 检查 S3 路径是否使用 UUID
- 检查 DynamoDB 是否正确存储品牌信息

## 测试建议

1. **测试新品牌创建**: 上传全新的品牌名称
2. **测试品牌复用**: 再次上传相同品牌名称
3. **测试中文品牌**: 上传 "耐克"、"阿迪达斯" 等
4. **测试日文品牌**: 上传 "ナイキ"、"アディダス" 等
5. **检查 S3 路径**: 确认路径中没有 URL 编码字符
6. **检查 DynamoDB**: 确认 BrandId 和 BrandName 都正确存储

## 注意事项

- ⚠️ 此更改会删除旧的 DynamoDB 表，所有现有品牌数据将丢失
- ⚠️ 如果生产环境有重要数据，需要先备份或迁移
- ✅ 前端代码基本无需修改，后端自动处理
- ✅ S3 metadata 中同时保存了 `brandid` 和 `brand`，便于调试
