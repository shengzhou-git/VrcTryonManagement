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

  // 登录页面
  login: {
    title: string
    subtitle: string
    emailLabel: string
    emailPlaceholder: string
    passwordLabel: string
    passwordPlaceholder: string
    showPassword: string
    hidePassword: string
    signIn: string
    signingIn: string
    signInFailed: string
    backHome: string
    changePassword: string
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
    noImagesFound: string
    imagesAdded: string
    brandRequired: string
    filesRequired: string
    unknownError: string
    description: string
    hint: string
    folderHint: string
    brandName: string
    dragDropHint: string
    dropToUpload: string
    cancel: string
    genderLabel: string
    genderFemale: string
    genderMale: string
    genderRequired: string
    brandModeExisting: string
    brandModeNew: string
    brandSelectLabel: string
    brandSelectPlaceholder: string
    brandSelectHint: string
    brandNewHint: string
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
    deleteBrandAll: string
    deleteBrandConfirm: string
    deleteBrandDeleting: string
    deleteBrandSuccess: string
    deleteBrandFailed: string
    downloadBrandAll: string
    downloadBrandDownloading: string
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
    login: {
      title: '登录',
      subtitle: '如需账号或登录方式，请联系管理员。',
      emailLabel: '邮箱',
      emailPlaceholder: '请输入邮箱',
      passwordLabel: '密码',
      passwordPlaceholder: '请输入密码',
      showPassword: '显示密码',
      hidePassword: '隐藏密码',
      signIn: '登录',
      signingIn: '登录中...',
      signInFailed: '登录失败',
      backHome: '返回首页',
      changePassword: '修改密码',
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
        description: '浏览所有已上传的服装图片，支持预览和筛选',
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
      supportFormats: '支持 JPG, PNG, WebP 等图片格式 • 支持批量上传和文件夹上传',
      selectedFiles: '已选择的文件',
      clearAll: '清空全部',
      fileName: '文件名',
      fileSize: '大小',
      startUpload: '开始上传',
      uploading: '上传中...',
      uploadComplete: '上传完成',
      enterBrandName: '请输入品牌名称',
      selectImages: '请选择要上传的图片',
      uploadSuccess: '上传完成！成功：{success}，失败：{failed}',
      uploadFailed: '上传失败',
      noImagesFound: '未找到可上传的图片文件（仅支持 JPG/PNG/WebP，不支持 GIF）',
      imagesAdded: '已添加 {count} 张图片',
      brandRequired: '请输入品牌名称',
      filesRequired: '请选择要上传的图片',
      unknownError: '未知错误',
      description: '请填写品牌名称并选择要上传的图片文件或文件夹',
      hint: '提示',
      folderHint: '选择文件夹可以一次性上传整个文件夹内的所有图片，系统会自动筛选图片文件。',
      brandName: '品牌名称',
      dragDropHint: '支持拖放文件或文件夹',
      dropToUpload: '释放以上传文件',
      cancel: '取消',
      genderLabel: '性别',
      genderFemale: '女',
      genderMale: '男',
      genderRequired: '请选择性别（女/男）',
      brandModeExisting: '选择已有品牌',
      brandModeNew: '新建品牌',
      brandSelectLabel: '选择品牌',
      brandSelectPlaceholder: '请选择已有品牌…',
      brandSelectHint: '若品牌已存在，直接选择即可，无需重复输入。',
      brandNewHint: '新建品牌会生成新的 BrandId（首次上传该品牌时创建）。',
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
      deleteBrandAll: '删除该品牌全部',
      deleteBrandConfirm: '确定要删除该品牌下所有图片吗？',
      deleteBrandDeleting: '批量删除中...',
      deleteBrandSuccess: '品牌图片已全部删除',
      deleteBrandFailed: '品牌批量删除失败',
      downloadBrandAll: '一键下载该品牌全部',
      downloadBrandDownloading: '打包下载中...',
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
    login: {
      title: 'Login',
      subtitle: 'Please contact the administrator to obtain an account or login method.',
      emailLabel: 'Email',
      emailPlaceholder: 'Enter your email',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      signIn: 'Sign In',
      signingIn: 'Signing In...',
      signInFailed: 'Login failed',
      backHome: 'Back to Home',
      changePassword: 'Change Password',
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
        description: 'Browse all uploaded clothing images with preview and filtering',
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
      supportFormats: 'Support JPG, PNG, WebP formats • Batch upload and folder upload supported',
      selectedFiles: 'Selected Files',
      clearAll: 'Clear All',
      fileName: 'File Name',
      fileSize: 'Size',
      startUpload: 'Start Upload',
      uploading: 'Uploading...',
      uploadComplete: 'Upload Complete',
      enterBrandName: 'Please enter brand name',
      selectImages: 'Please select images to upload',
      uploadSuccess: 'Upload complete! Success: {success}, Failed: {failed}',
      uploadFailed: 'Upload failed',
      noImagesFound: 'No uploadable image files found (only JPG/PNG/WebP supported, GIF not supported)',
      imagesAdded: 'Added {count} images',
      brandRequired: 'Please enter brand name',
      filesRequired: 'Please select images to upload',
      unknownError: 'Unknown error',
      description: 'Please enter brand name and select image files or folder to upload',
      hint: 'Tip',
      folderHint: 'Select a folder to upload all images in it at once. The system will automatically filter image files.',
      brandName: 'Brand Name',
      dragDropHint: 'Support drag and drop files or folder',
      dropToUpload: 'Drop to upload files',
      cancel: 'Cancel',
      genderLabel: 'Gender',
      genderFemale: 'Female',
      genderMale: 'Male',
      genderRequired: 'Please select gender (Female/Male)',
      brandModeExisting: 'Use existing brand',
      brandModeNew: 'Create new brand',
      brandSelectLabel: 'Select brand',
      brandSelectPlaceholder: 'Select an existing brand…',
      brandSelectHint: 'If the brand already exists, just select it—no need to type again.',
      brandNewHint: 'Creating a new brand will generate a new BrandId (created on first upload).',
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
      deleteBrandAll: 'Delete all in brand',
      deleteBrandConfirm: 'Are you sure you want to delete all images under this brand?',
      deleteBrandDeleting: 'Deleting...',
      deleteBrandSuccess: 'All images under this brand have been deleted',
      deleteBrandFailed: 'Failed to delete brand images',
      downloadBrandAll: 'Download all in brand',
      downloadBrandDownloading: 'Downloading...',
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
    login: {
      title: 'ログイン',
      subtitle: 'アカウントやログイン方法については管理者にお問い合わせください。',
      emailLabel: 'メールアドレス',
      emailPlaceholder: 'メールアドレスを入力してください',
      passwordLabel: 'パスワード',
      passwordPlaceholder: 'パスワードを入力してください',
      showPassword: 'パスワードを表示',
      hidePassword: 'パスワードを非表示',
      signIn: 'ログイン',
      signingIn: 'ログイン中...',
      signInFailed: 'ログインに失敗しました',
      backHome: 'ホームへ戻る',
      changePassword: 'パスワード変更',
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
        description: 'アップロード済みの全ての衣類画像を閲覧。プレビューとフィルタリングに対応',
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
      supportFormats: 'JPG、PNG、WebP形式対応 • 一括アップロードとフォルダアップロード対応',
      selectedFiles: '選択されたファイル',
      clearAll: 'すべてクリア',
      fileName: 'ファイル名',
      fileSize: 'サイズ',
      startUpload: 'アップロード開始',
      uploading: 'アップロード中...',
      uploadComplete: 'アップロード完了',
      enterBrandName: 'ブランド名を入力してください',
      selectImages: 'アップロードする画像を選択してください',
      uploadSuccess: 'アップロード完了！成功：{success}、失敗：{failed}',
      uploadFailed: 'アップロード失敗',
      noImagesFound: 'アップロード可能な画像ファイルが見つかりません（JPG/PNG/WebPのみ対応、GIF非対応）',
      imagesAdded: '{count}枚の画像を追加しました',
      brandRequired: 'ブランド名を入力してください',
      filesRequired: 'アップロードする画像を選択してください',
      unknownError: '不明なエラー',
      description: 'ブランド名を入力し、アップロードする画像ファイルまたはフォルダを選択してください',
      hint: 'ヒント',
      folderHint: 'フォルダを選択すると、フォルダ内のすべての画像を一度にアップロードできます。システムが自動的に画像ファイルをフィルタリングします。',
      brandName: 'ブランド名',
      dragDropHint: 'ファイルまたはフォルダのドラッグ＆ドロップに対応',
      dropToUpload: 'ドロップしてアップロード',
      cancel: 'キャンセル',
      genderLabel: '性別',
      genderFemale: '女',
      genderMale: '男',
      genderRequired: '性別（女/男）を選択してください',
      brandModeExisting: '既存ブランドを選択',
      brandModeNew: '新規ブランド',
      brandSelectLabel: 'ブランド選択',
      brandSelectPlaceholder: '既存ブランドを選択…',
      brandSelectHint: '既に存在するブランドは選ぶだけでOK（再入力不要）。',
      brandNewHint: '新規ブランドは新しい BrandId を生成します（初回アップロード時に作成）。',
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
      deleteBrandAll: 'このブランドを一括削除',
      deleteBrandConfirm: 'このブランド内の画像をすべて削除しますか？',
      deleteBrandDeleting: '削除中...',
      deleteBrandSuccess: 'ブランド内の画像をすべて削除しました',
      deleteBrandFailed: 'ブランドの一括削除に失敗しました',
      downloadBrandAll: 'このブランドを一括ダウンロード',
      downloadBrandDownloading: 'ダウンロード中...',
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

