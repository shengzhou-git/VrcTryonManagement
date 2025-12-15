# 快速启动指南 🚀

5 分钟快速启动服装图片管理系统！

## ⚡ 快速开始（本地开发）

### 1️⃣ 安装依赖

```bash
npm install
```

### 2️⃣ 配置环境变量（可选）

如果你暂时不想配置 AWS，可以跳过这一步。前端可以独立运行（使用模拟数据）。

创建 `.env.local` 文件：

```env
# 如果已部署 Lambda，填写 API URL
NEXT_PUBLIC_API_URL=https://your-api-gateway-url.amazonaws.com/prod
```

### 3️⃣ 启动开发服务器

```bash
npm run dev
```

### 4️⃣ 打开浏览器

访问 [http://localhost:3000](http://localhost:3000)

🎉 完成！你现在可以看到应用界面了。

## 📸 功能演示

### 查看首页
- 访问 http://localhost:3000
- 看到精美的欢迎页面
- 两个主要功能入口：上传和浏览

### 测试上传功能
1. 点击"上传图片"卡片
2. 输入品牌名称（例如：Nike）
3. 拖放图片或点击"选择文件"
4. 点击"开始上传"
5. 查看上传进度

### 测试图片一览
1. 点击"图片一览"卡片
2. 看到图片网格布局
3. **鼠标悬停在任意图片上** → 显示大图预览 ✨
4. 使用搜索框搜索
5. 使用品牌筛选器

## 🔧 开发模式功能

在开发模式下（未连接 AWS）：

- ✅ UI 界面完全可用
- ✅ 上传流程模拟（带进度条）
- ✅ 图片一览展示模拟数据
- ✅ 悬停预览功能正常
- ⚠️ 实际上传/删除不会生效（需要连接 AWS）

## ☁️ 连接 AWS（完整功能）

如果你想要完整功能（真实上传到 S3），需要：

### 快速部署 Lambda

```bash
cd lambda
npm install

# 使用 Serverless Framework
serverless deploy --stage dev
```

部署完成后：
1. 复制 API Gateway URL
2. 更新前端的 `.env.local`
3. 重启开发服务器

详细步骤请查看 [DEPLOYMENT.md](DEPLOYMENT.md)

## 📱 测试响应式设计

打开浏览器开发者工具：

1. 按 F12 打开开发者工具
2. 点击设备工具栏图标（Ctrl+Shift+M）
3. 选择不同设备（iPhone、iPad 等）
4. 查看响应式布局

## 🎨 自定义主题

修改 `tailwind.config.js` 中的颜色：

```javascript
colors: {
  primary: {
    500: '#your-color',  // 主色调
    600: '#your-darker-color',
  },
}
```

## 📝 常见问题

### Q: 上传后图片没有保存？
A: 开发模式下使用模拟数据。需要连接 AWS 才能真实保存。

### Q: 图片悬停预览不显示？
A: 检查浏览器控制台是否有错误，或尝试刷新页面。

### Q: 样式看起来不对？
A: 确保 Tailwind CSS 正确配置，运行 `npm run dev` 重新编译。

### Q: 如何修改品牌列表？
A: 品牌列表是从上传的图片自动提取的。

## 🛠️ 常用命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint

# 进入 Lambda 目录
cd lambda

# 部署 Lambda
cd lambda && serverless deploy
```

## 📚 下一步

- 📖 阅读完整文档：[README.md](README.md)
- 🚀 部署到生产环境：[DEPLOYMENT.md](DEPLOYMENT.md)
- 🤝 参与贡献：[CONTRIBUTING.md](CONTRIBUTING.md)
- 🏗️ 了解项目结构：[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

## 💡 提示

### 开发技巧

1. **实时重载**：修改代码后自动刷新
2. **错误提示**：控制台会显示详细错误
3. **热更新**：无需重启服务器

### UI 开发

1. 使用浏览器开发者工具调试 CSS
2. 使用 Tailwind CSS 类名快速开发
3. 查看 `app/globals.css` 了解自定义样式

### API 开发

1. 在 `lib/api.ts` 中添加新的 API 函数
2. 在 `lambda/` 中创建对应的处理函数
3. 更新 `serverless.yml` 配置

## 🎯 测试清单

开发完成后，测试以下功能：

- [ ] 首页正常显示
- [ ] 上传页面可以选择文件
- [ ] 拖放上传功能正常
- [ ] 图片一览网格布局正常
- [ ] **鼠标悬停显示预览**
- [ ] 搜索功能正常
- [ ] 品牌筛选正常
- [ ] 响应式布局适配移动设备
- [ ] 动画过渡流畅

## 🎉 享受开发！

如有问题，请查看完整文档或提交 Issue。

---

**祝你开发愉快！** 💖

