/**
 * 多语言翻译配置
 * 支持中文(zh)、英文(en)、日文(ja)
 */

export type Language = 'zh' | 'en' | 'ja'

export interface Translations {
  // 通用
  common: {
    appName: string
    home: string
    upload: string
    gallery: string
    back: string
    cancel: string
    confirm: string
    delete: string
    download: string
    search: string
    filter: string
    loading: string
    success: string
    error: string
    retry: string
  }
  
  // 首页
  home: {
    welcome: string
    subtitle: string
    uploadCard: {
      title: string
      description: string
    }
    galleryCard: {
      title: string
      description: string
    }
    features: {
      design: {
        title: string
        description: string
      }
      upload: {
        title: string
        description: string
      }
      preview: {
        title: string
        description: string
      }
    }
    footer: string
  }
  
  // 上传页面
  upload: {
    title: string
    subtitle: string
    tipTitle: string
    tipContent: string
    brandLabel: string
    brandPlaceholder: string
    required: string
    dragDrop: string
    dragDropFolder: string
    or: string
    selectFiles: string
    selectFolder: string
    supportFormats: string
    selectedFiles: string
    clearAll: string
    fileName: string
    fileSize: string
    startUpload: string
    uploading: string
    uploadComplete: string
    enterBrandName: string
    selectImages: string
    uploadSuccess: string
    uploadFailed: string
  }
  
  // 图片一览页面
  gallery: {
    title: string
    totalCount: string // "共 {count} 张图片" 格式
    searchPlaceholder: string
    allBrands: string
    noImages: string
    noImagesDesc: string
    noImagesYet: string
    noImagesYetDesc: string
    uploadNow: string
    refresh: string
    refreshing: string
    urlExpiresIn: string
    minutes: string
    loadFailed: string
    deleteConfirm: string
    deleteSuccess: string
    deleteFailed: string
    downloadFailed: string
    imageInfo: {
      brand: string
      size: string
      date: string
    }
  }
}

export const translations: Record<Language, Translations> = {
  // 中文
  zh: {
    common: {
      appName: '服装图片管理系统',
      home: '首页',
      upload: '上传图片',
      gallery: '图片一览',
      back: '返回',
      cancel: '取消',
      confirm: '确认',
      delete: '删除',
      download: '下载',
      search: '搜索',
      filter: '筛选',
      loading: '加载中...',
      success: '成功',
      error: '错误',
      retry: '重试',
    },
    home: {
      welcome: '欢迎使用服装图片管理系统',
      subtitle: '上传、管理和预览您的服装图片，支持品牌分类管理',
      uploadCard: {
        title: '上传图片',
        description: '上传新的服装图片，支持批量上传和品牌信息添加',
      },
      galleryCard: {
        title: '图片一览',
        description: '浏览所有已上传的服装图片，支持悬停预览和筛选',
      },
      features: {
        design: {
          title: '现代化设计',
          description: '简洁美观的界面设计，提供良好的用户体验',
        },
        upload: {
          title: '高效上传',
          description: '支持拖放上传和批量处理，快速便捷',
        },
        preview: {
          title: '智能预览',
          description: '鼠标悬停即可预览图片，无需点击打开',
        },
      },
      footer: '© 2025 VRC Tryon Management.',
    },
    upload: {
      title: '上传服装图片',
      subtitle: '请填写品牌名称并选择要上传的图片文件或文件夹',
      tipTitle: '提示：',
      tipContent: '选择文件夹可以一次性上传整个文件夹内的所有图片，系统会自动筛选图片文件。',
      brandLabel: '品牌名称',
      brandPlaceholder: '例如：Nike, Adidas, Uniqlo...',
      required: '*',
      dragDrop: '拖放图片到此处',
      dragDropFolder: '拖放图片或文件夹到此处',
      or: '或者',
      selectFiles: '选择文件',
      selectFolder: '选择文件夹',
      supportFormats: '支持 JPG, PNG, GIF 等图片格式 • 支持批量上传和文件夹上传',
      selectedFiles: '已选择的文件',
      clearAll: '清空全部',
      fileName: '文件名',
      fileSize: '大小',
      startUpload: '开始上传',
      uploading: '上传中...',
      uploadComplete: '上传完成',
      enterBrandName: '请输入品牌名称',
      selectImages: '请选择要上传的图片',
      uploadSuccess: '上传成功',
      uploadFailed: '上传失败',
    },
    gallery: {
      title: '图片一览',
      totalCount: '张图片',
      searchPlaceholder: '搜索图片名称或品牌...',
      allBrands: '全部',
      noImages: '没有找到图片',
      noImagesDesc: '尝试调整搜索条件或上传新的图片',
      noImagesYet: '还没有上传图片',
      noImagesYetDesc: '立即上传您的第一张图片',
      uploadNow: '立即上传',
      refresh: '刷新',
      refreshing: '刷新中',
      urlExpiresIn: '图片链接有效期：',
      minutes: '分钟',
      loadFailed: '加载失败',
      deleteConfirm: '确定要删除这张图片吗？',
      deleteSuccess: '删除成功',
      deleteFailed: '删除失败',
      downloadFailed: '下载失败，请重试',
      imageInfo: {
        brand: '品牌',
        size: '大小',
        date: '上传日期',
      },
    },
  },
  
  // 英文
  en: {
    common: {
      appName: 'Clothing Image Management',
      home: 'Home',
      upload: 'Upload',
      gallery: 'Gallery',
      back: 'Back',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      download: 'Download',
      search: 'Search',
      filter: 'Filter',
      loading: 'Loading...',
      success: 'Success',
      error: 'Error',
      retry: 'Retry',
    },
    home: {
      welcome: 'Welcome to Clothing Image Management System',
      subtitle: 'Upload, manage and preview your clothing images with brand classification',
      uploadCard: {
        title: 'Upload Images',
        description: 'Upload new clothing images with batch upload and brand information',
      },
      galleryCard: {
        title: 'Image Gallery',
        description: 'Browse all uploaded clothing images with hover preview and filtering',
      },
      features: {
        design: {
          title: 'Modern Design',
          description: 'Clean and beautiful interface with excellent user experience',
        },
        upload: {
          title: 'Efficient Upload',
          description: 'Support drag-and-drop and batch processing, fast and convenient',
        },
        preview: {
          title: 'Smart Preview',
          description: 'Preview images on hover without clicking',
        },
      },
      footer: '© 2025 VRC Tryon Management.',
    },
    upload: {
      title: 'Upload Clothing Images',
      subtitle: 'Please enter brand name and select image files or folder to upload',
      tipTitle: 'Tip:',
      tipContent: 'Select a folder to upload all images in it at once. The system will automatically filter image files.',
      brandLabel: 'Brand Name',
      brandPlaceholder: 'e.g., Nike, Adidas, Uniqlo...',
      required: '*',
      dragDrop: 'Drag and drop images here',
      dragDropFolder: 'Drag and drop images or folder here',
      or: 'or',
      selectFiles: 'Select Files',
      selectFolder: 'Select Folder',
      supportFormats: 'Support JPG, PNG, GIF formats • Batch upload and folder upload supported',
      selectedFiles: 'Selected Files',
      clearAll: 'Clear All',
      fileName: 'File Name',
      fileSize: 'Size',
      startUpload: 'Start Upload',
      uploading: 'Uploading...',
      uploadComplete: 'Upload Complete',
      enterBrandName: 'Please enter brand name',
      selectImages: 'Please select images to upload',
      uploadSuccess: 'Upload successful',
      uploadFailed: 'Upload failed',
    },
    gallery: {
      title: 'Image Gallery',
      totalCount: 'images',
      searchPlaceholder: 'Search image name or brand...',
      allBrands: 'All Brands',
      noImages: 'No images found',
      noImagesDesc: 'Try adjusting search criteria or upload new images',
      noImagesYet: 'No images uploaded yet',
      noImagesYetDesc: 'Upload your first image now',
      uploadNow: 'Upload Now',
      refresh: 'Refresh',
      refreshing: 'Refreshing',
      urlExpiresIn: 'Image URL expires in:',
      minutes: 'minutes',
      loadFailed: 'Load Failed',
      deleteConfirm: 'Are you sure you want to delete this image?',
      deleteSuccess: 'Deleted successfully',
      deleteFailed: 'Delete failed',
      downloadFailed: 'Download failed, please try again',
      imageInfo: {
        brand: 'Brand',
        size: 'Size',
        date: 'Upload Date',
      },
    },
  },
  
  // 日文
  ja: {
    common: {
      appName: '衣類画像管理システム',
      home: 'ホーム',
      upload: 'アップロード',
      gallery: 'ギャラリー',
      back: '戻る',
      cancel: 'キャンセル',
      confirm: '確認',
      delete: '削除',
      download: 'ダウンロード',
      search: '検索',
      filter: 'フィルター',
      loading: '読み込み中...',
      success: '成功',
      error: 'エラー',
      retry: '再試行',
    },
    home: {
      welcome: '衣類画像管理システムへようこそ',
      subtitle: 'ブランド分類管理で衣類画像をアップロード、管理、プレビュー',
      uploadCard: {
        title: '画像アップロード',
        description: '新しい衣類画像をアップロード。一括アップロードとブランド情報の追加に対応',
      },
      galleryCard: {
        title: '画像一覧',
        description: 'アップロード済みの全ての衣類画像を閲覧。ホバープレビューとフィルタリングに対応',
      },
      features: {
        design: {
          title: 'モダンデザイン',
          description: 'シンプルで美しいインターフェース、優れたユーザー体験',
        },
        upload: {
          title: '効率的アップロード',
          description: 'ドラッグ&ドロップとバッチ処理に対応、高速で便利',
        },
        preview: {
          title: 'スマートプレビュー',
          description: 'マウスホバーで画像をプレビュー、クリック不要',
        },
      },
      footer: '© 2025 VRC Tryon Management.',
    },
    upload: {
      title: '衣類画像のアップロード',
      subtitle: 'ブランド名を入力し、アップロードする画像ファイルまたはフォルダを選択してください',
      tipTitle: 'ヒント：',
      tipContent: 'フォルダを選択すると、フォルダ内のすべての画像を一度にアップロードできます。システムが自動的に画像ファイルをフィルタリングします。',
      brandLabel: 'ブランド名',
      brandPlaceholder: '例：Nike、Adidas、Uniqlo...',
      required: '*',
      dragDrop: 'ここに画像をドラッグ&ドロップ',
      dragDropFolder: 'ここに画像またはフォルダをドラッグ&ドロップ',
      or: 'または',
      selectFiles: 'ファイル選択',
      selectFolder: 'フォルダ選択',
      supportFormats: 'JPG、PNG、GIF形式対応 • 一括アップロードとフォルダアップロード対応',
      selectedFiles: '選択されたファイル',
      clearAll: 'すべてクリア',
      fileName: 'ファイル名',
      fileSize: 'サイズ',
      startUpload: 'アップロード開始',
      uploading: 'アップロード中...',
      uploadComplete: 'アップロード完了',
      enterBrandName: 'ブランド名を入力してください',
      selectImages: 'アップロードする画像を選択してください',
      uploadSuccess: 'アップロード成功',
      uploadFailed: 'アップロード失敗',
    },
    gallery: {
      title: '画像一覧',
      totalCount: '枚の画像',
      searchPlaceholder: '画像名またはブランドを検索...',
      allBrands: 'すべて',
      noImages: '画像が見つかりません',
      noImagesDesc: '検索条件を調整するか、新しい画像をアップロードしてください',
      noImagesYet: 'まだ画像がアップロードされていません',
      noImagesYetDesc: '最初の画像を今すぐアップロード',
      uploadNow: '今すぐアップロード',
      refresh: '更新',
      refreshing: '更新中',
      urlExpiresIn: '画像URLの有効期限：',
      minutes: '分',
      loadFailed: '読み込み失敗',
      deleteConfirm: 'この画像を削除してもよろしいですか？',
      deleteSuccess: '削除成功',
      deleteFailed: '削除失敗',
      downloadFailed: 'ダウンロード失敗、再試行してください',
      imageInfo: {
        brand: 'ブランド',
        size: 'サイズ',
        date: 'アップロード日',
      },
    },
  },
}

export const languageNames: Record<Language, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
}

