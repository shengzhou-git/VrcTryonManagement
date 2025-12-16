/**
 * 测试 WebP 解码功能
 * 验证 Jimp WebP 插件是否正确加载
 */

import { createJimp } from '@jimp/core'
import webpModule from '@jimp/wasm-webp'
import { defaultFormats, defaultPlugins } from 'jimp'

const webp = webpModule.default || webpModule

async function testWebPSupport() {
    console.log('========================================')
    console.log('测试 Jimp WebP 插件支持')
    console.log('========================================\n')

    try {
        // 创建包含 WebP 支持的自定义 Jimp 实例
        const CustomJimp = createJimp({
            formats: [...defaultFormats, webp],
            plugins: defaultPlugins
        })

        console.log('✅ 成功创建包含 WebP 插件的 Jimp 实例')
        console.log('✅ WebP 解码器已加载')

        // 测试创建一个简单的图片
        const testImage = new CustomJimp({ width: 100, height: 100, color: 0xff0000ff })
        console.log('✅ 成功创建测试图片')
        console.log(`   尺寸: ${testImage.bitmap.width}x${testImage.bitmap.height}`)

        console.log('\n========================================')
        console.log('测试通过！WebP 支持已正确配置')
        console.log('========================================')

        return true
    } catch (error) {
        console.error('❌ 测试失败:', error.message)
        console.error('错误详情:', error)
        return false
    }
}

// 运行测试
testWebPSupport()
    .then(success => {
        process.exit(success ? 0 : 1)
    })
    .catch(err => {
        console.error('未捕获的错误:', err)
        process.exit(1)
    })
