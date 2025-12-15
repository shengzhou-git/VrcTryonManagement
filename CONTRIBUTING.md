# 贡献指南

感谢您对服装图片管理系统的关注！我们欢迎各种形式的贡献。

## 🤝 如何贡献

### 报告问题

如果您发现了 bug 或有功能建议：

1. 查看现有的 [Issues](https://github.com/your-repo/issues) 确认问题未被报告
2. 创建新的 Issue，包含：
   - 清晰的标题
   - 详细的描述
   - 重现步骤（如果是 bug）
   - 期望的行为
   - 屏幕截图（如果适用）
   - 环境信息（浏览器、操作系统等）

### 提交代码

1. **Fork 仓库**

2. **创建分支**
```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

3. **开发和测试**
   - 遵循代码规范
   - 添加必要的注释
   - 确保代码通过 lint 检查
   - 测试你的更改

4. **提交更改**
```bash
git add .
git commit -m "feat: add new feature" # 或 "fix: fix bug"
```

提交信息格式：
- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式（不影响功能）
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建或辅助工具

5. **推送到 GitHub**
```bash
git push origin feature/your-feature-name
```

6. **创建 Pull Request**
   - 描述你的更改
   - 关联相关的 Issue
   - 等待代码审查

## 📝 代码规范

### TypeScript/JavaScript

- 使用 TypeScript 类型
- 遵循 ESLint 规则
- 使用有意义的变量名
- 添加必要的注释

### React 组件

- 使用函数组件和 Hooks
- Props 使用 TypeScript 接口定义
- 保持组件简洁，单一职责

### 样式

- 使用 Tailwind CSS
- 保持一致的间距和颜色
- 支持响应式设计

### 命名约定

- 组件：PascalCase（如 `ImageCard.tsx`）
- 函数：camelCase（如 `formatDate`）
- 常量：UPPER_SNAKE_CASE（如 `MAX_FILE_SIZE`）
- 文件名：kebab-case 或 PascalCase

## 🧪 测试

在提交 PR 前，请确保：

- [ ] 代码通过 lint 检查：`npm run lint`
- [ ] 应用可以正常构建：`npm run build`
- [ ] 手动测试所有更改的功能
- [ ] 没有引入新的警告或错误

## 📚 文档

如果你的更改影响用户使用：

- 更新 README.md
- 更新 DEPLOYMENT.md（如果涉及部署）
- 添加代码注释

## 🎯 开发建议

### 设置开发环境

```bash
# 克隆仓库
git clone <your-fork>
cd vrc-tryon-management

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 调试技巧

- 使用浏览器开发者工具
- 查看 Next.js 控制台输出
- 检查网络请求
- 使用 React Developer Tools

### 常见任务

**添加新页面**
1. 在 `app/` 目录创建新文件夹
2. 添加 `page.tsx`
3. 更新导航链接

**添加新 API**
1. 在 `lambda/` 创建新的处理函数
2. 更新 `serverless.yml`
3. 在 `lib/api.ts` 添加客户端函数

**修改样式**
1. 优先使用 Tailwind 类
2. 必要时添加自定义 CSS 到 `globals.css`
3. 保持响应式设计

## 🔍 代码审查

提交的 PR 将会被审查：

- 代码质量和规范
- 功能正确性
- 性能影响
- 安全问题
- 文档完整性

请耐心等待审查，并积极回应反馈。

## 📞 获取帮助

如果有任何问题：

- 查看文档
- 搜索现有 Issues
- 在 Issue 中提问
- 加入讨论

## 📄 许可证

通过贡献，您同意您的代码将按照 MIT 许可证发布。

---

再次感谢您的贡献！💖

