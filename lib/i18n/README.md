# 多语言系统 (i18n)

本项目支持中文、英文、日文三种语言。

## 🌍 支持的语言

- 🇨🇳 **中文** (zh) - 默认语言
- 🇺🇸 **英文** (en)  
- 🇯🇵 **日文** (ja)

## 📂 文件结构

```
lib/i18n/
├── translations.ts      # 所有语言的翻译文本
├── LanguageContext.tsx  # React Context 提供语言状态
└── README.md           # 本文件
```

## 🚀 使用方法

### 1. 在组件中使用翻译

```typescript
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function MyComponent() {
  const { t, language, setLanguage } = useLanguage()
  
  return (
    <div>
      <h1>{t.common.appName}</h1>
      <p>{t.home.welcome}</p>
    </div>
  )
}
```

### 2. 获取当前语言

```typescript
const { language } = useLanguage()  // 'zh' | 'en' | 'ja'
```

### 3. 切换语言

```typescript
const { setLanguage } = useLanguage()

// 切换到英文
setLanguage('en')

// 切换到日文
setLanguage('ja')
```

### 4. 使用语言切换器组件

```typescript
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function Nav() {
  return (
    <nav>
      <LanguageSwitcher />
    </nav>
  )
}
```

## 📝 添加新翻译

### 1. 在 translations.ts 中添加新字段

```typescript
export interface Translations {
  // ... 现有字段
  
  myNewSection: {
    title: string
    description: string
  }
}

export const translations: Record<Language, Translations> = {
  zh: {
    // ... 现有翻译
    myNewSection: {
      title: '我的新标题',
      description: '我的新描述',
    }
  },
  en: {
    // ... 现有翻译
    myNewSection: {
      title: 'My New Title',
      description: 'My New Description',
    }
  },
  ja: {
    // ... 现有翻译
    myNewSection: {
      title: '私の新しいタイトル',
      description: '私の新しい説明',
    }
  }
}
```

### 2. 在组件中使用

```typescript
const { t } = useLanguage()

<h1>{t.myNewSection.title}</h1>
<p>{t.myNewSection.description}</p>
```

## 🔧 特性

### 自动检测浏览器语言

系统会在首次访问时检测浏览器语言：
- 浏览器语言为日文 → 使用日文
- 浏览器语言为英文 → 使用英文  
- 其他情况 → 使用中文（默认）

### 持久化

语言选择会保存在 localStorage 中，下次访问时自动恢复。

### TypeScript 支持

所有翻译都有完整的 TypeScript 类型定义，IDE 会提供自动完成。

## 📋 翻译清单

### common (通用)
- appName, home, upload, gallery
- back, cancel, confirm, delete, download
- search, filter, loading
- success, error, retry

### home (首页)
- welcome, subtitle
- uploadCard, galleryCard
- features (design, upload, preview)
- footer

### upload (上传页面)
- title, subtitle, tipContent
- brandLabel, brandPlaceholder
- dragDrop, selectFiles, selectFolder
- selectedFiles, startUpload, uploading
- enterBrandName, selectImages

### gallery (图片一览)
- title, totalImages
- searchPlaceholder, allBrands
- noImages, noImagesDesc, uploadNow
- imageInfo (brand, size, date)

## 🎨 样式注意事项

不同语言的文本长度可能差异很大：
- 英文通常比中文长
- 日文可能需要更多垂直空间

建议：
- 使用 `truncate` 或 `line-clamp` 处理长文本
- 为按钮提供足够空间
- 测试所有语言的显示效果

## 🌏 添加新语言

1. 在 `translations.ts` 中添加语言类型：
```typescript
export type Language = 'zh' | 'en' | 'ja' | 'ko'  // 添加韩文
```

2. 添加语言名称：
```typescript
export const languageNames: Record<Language, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',  // 新增
}
```

3. 添加翻译内容：
```typescript
export const translations: Record<Language, Translations> = {
  // ... zh, en, ja
  ko: {
    common: { ... },
    home: { ... },
    // ... 所有翻译
  }
}
```

4. 更新 LanguageContext.tsx 中的语言检测逻辑

## 📞 注意事项

- 所有文本都应该通过翻译系统，避免硬编码
- 保持三种语言的翻译同步更新
- 翻译应该简洁、准确、符合当地习惯
- 数字、日期格式需要根据语言进行本地化

---

**让网站支持多语言，服务全球用户！** 🌍

