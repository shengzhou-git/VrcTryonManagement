# AWS 部署指南

## 📋 部署方式对比

本项目支持两种部署方式：

### 1. AWS SAM (推荐 - 原生AWS)

**配置文件**: `template.yaml`

**优点**:
- ✅ AWS 官方工具，原生支持
- ✅ 与 CloudFormation 完全集成
- ✅ 本地测试功能强大
- ✅ 中文社区资源丰富

**缺点**:
- ⚠️ 配置相对复杂
- ⚠️ 需要单独安装 SAM CLI

### 2. Serverless Framework

**配置文件**: `serverless.yml`

**优点**:
- ✅ 配置简洁
- ✅ 多云支持
- ✅ 插件生态丰富
- ✅ 社区活跃

**缺点**:
- ⚠️ 第三方工具
- ⚠️ 需要学习新的配置语法

---

## 🚀 方式一：使用 AWS SAM 部署（推荐）

### 前置要求

1. **安装 AWS CLI**

```bash
# Windows
# 下载安装程序: https://aws.amazon.com/cli/

# 验证安装
aws --version
```

2. **配置 AWS 凭证**

```bash
aws configure
# AWS Access Key ID: 你的访问密钥
# AWS Secret Access Key: 你的私密密钥
# Default region name: ap-northeast-1
# Default output format: json
```

3. **安装 AWS SAM CLI**

```bash
# Windows (使用 MSI 安装程序)
# 下载: https://github.com/aws/aws-sam-cli/releases/latest/download/AWS_SAM_CLI_64_PY3.msi

# 验证安装
sam --version
```

### 快速部署

#### 方法 1: 使用批处理脚本（最简单）

```bash
cd lambda

# 简单部署（一键部署到开发环境）
deploy-simple.bat

# 或完整部署（可选择环境）
deploy.bat
```

#### 方法 2: 手动部署

```bash
cd lambda

# 1. 安装依赖
npm install

# 2. 构建
sam build

# 3. 部署（首次）
sam deploy --guided

# 按提示输入:
# Stack Name: vrc-tryon-dev
# AWS Region: ap-northeast-1
# Parameter Environment: dev
# Confirm changes: Y
# Allow SAM CLI IAM role creation: Y
# Save arguments to samconfig.toml: Y

# 4. 后续部署（使用保存的配置）
sam deploy
```

### 获取 API 端点

部署完成后，控制台会显示输出：

```
Outputs
---------------------------------------------------------
Key                 ApiUrl
Description         API Gateway 端点 URL
Value               https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/dev
```

或使用命令查询：

```bash
aws cloudformation describe-stacks ^
    --stack-name vrc-tryon-dev ^
    --region ap-northeast-1 ^
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" ^
    --output text
```

### 本地测试

```bash
# 启动本地 API
sam local start-api

# API 将在 http://127.0.0.1:3000 可用
```

---

## 🚀 方式二：使用 Serverless Framework 部署

### 前置要求

1. **安装 Serverless Framework**

```bash
npm install -g serverless
```

2. **配置 AWS 凭证**

```bash
serverless config credentials ^
    --provider aws ^
    --key YOUR_ACCESS_KEY ^
    --secret YOUR_SECRET_KEY
```

### 部署

```bash
cd lambda

# 安装依赖
npm install

# 部署到开发环境
serverless deploy --stage dev

# 部署到生产环境
serverless deploy --stage prod
```

---

## 📝 配置文件说明

### template.yaml (AWS SAM)

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  # Lambda 函数
  UploadFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: upload-handler.handler
      Runtime: nodejs20.x
      # ...
  
  # API Gateway
  ApiGateway:
    Type: AWS::Serverless::Api
    # ...
  
  # S3 存储桶
  ImagesBucket:
    Type: AWS::S3::Bucket
    # ...
```

### serverless.yml (Serverless Framework)

```yaml
service: vrc-tryon-management

provider:
  name: aws
  runtime: nodejs20.x

functions:
  uploadHandler:
    handler: upload-handler.handler
    events:
      - http:
          path: upload
          method: post
```

---

## 🔧 常见问题

### Q1: sam build 失败

**错误**: `Build Failed`

**解决**:
```bash
# 方法1: 使用容器构建
sam build --use-container

# 方法2: 不使用容器
sam build
```

### Q2: 权限错误

**错误**: `User is not authorized to perform: cloudformation:CreateStack`

**解决**: 确保 IAM 用户有以下权限：
- CloudFormation 完全权限
- Lambda 完全权限
- API Gateway 完全权限
- S3 完全权限
- IAM 角色创建权限

### Q3: 堆栈已存在

**错误**: `Stack already exists`

**解决**:
```bash
# 更新现有堆栈
sam deploy

# 或删除后重新创建
aws cloudformation delete-stack --stack-name vrc-tryon-dev
# 等待删除完成
sam deploy
```

### Q4: 获取不到 API URL

**解决**:
```bash
# 方法1: 使用 AWS CLI
aws cloudformation describe-stacks ^
    --stack-name vrc-tryon-dev ^
    --query "Stacks[0].Outputs"

# 方法2: 在 AWS 控制台查看
# CloudFormation -> 堆栈 -> vrc-tryon-dev -> 输出
```

---

## 📊 部署流程图

```
开始
  │
  ├─→ 安装 AWS CLI
  ├─→ 配置 AWS 凭证 (aws configure)
  ├─→ 安装 SAM CLI
  │
  ├─→ cd lambda
  ├─→ npm install
  ├─→ sam build
  ├─→ sam deploy --guided (首次)
  │
  ├─→ 获取 API URL
  ├─→ 更新前端 .env.local
  │
  └─→ 完成！
```

---

## 🎯 快速命令参考

### SAM 常用命令

```bash
# 构建
sam build

# 部署
sam deploy

# 本地测试
sam local start-api

# 查看日志
sam logs -n UploadFunction --stack-name vrc-tryon-dev --tail

# 删除堆栈
sam delete --stack-name vrc-tryon-dev
```

### Serverless 常用命令

```bash
# 部署
serverless deploy

# 查看信息
serverless info

# 查看日志
serverless logs -f uploadHandler

# 删除
serverless remove
```

---

## 💰 成本估算

- **Lambda**: 前 100 万请求免费
- **API Gateway**: 前 100 万请求免费
- **S3**: 前 5GB 存储免费
- **CloudFormation**: 免费

**月使用 1000 次，存储 1GB: 基本免费**

---

## 📞 获取帮助

- AWS SAM 文档: https://docs.aws.amazon.com/serverless-application-model/
- Serverless 文档: https://www.serverless.com/framework/docs
- 提交 Issue: GitHub Issues

---

**选择你喜欢的方式，开始部署吧！** 🚀

