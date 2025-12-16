
import { Jimp } from 'jimp';

function coverCenter(img, targetW, targetH) {
    // 优先使用 cover（如果版本支持）
    if (typeof img.cover === 'function') {
        try {
            // Jimp v1 requires object argument: { w, h }
            img.cover({ w: targetW, h: targetH })
            return img
        } catch (e) {
            // 如果对象参数失败，尝试旧版参数（兼容性）
            try {
                img.cover(targetW, targetH)
                return img
            } catch {
                // fallback below
            }
        }
    }

    const w = img.bitmap?.width || 1
    const h = img.bitmap?.height || 1
    const scale = Math.max(targetW / w, targetH / h)
    const rw = Math.max(targetW, Math.round(w * scale))
    const rh = Math.max(targetH, Math.round(h * scale))

    // Jimp v1 requires object argument
    try {
        img.resize({ w: rw, h: rh })
    } catch {
        img.resize(rw, rh)
    }

    const x = Math.max(0, Math.floor((rw - targetW) / 2))
    const y = Math.max(0, Math.floor((rh - targetH) / 2))

    try {
        img.crop({ x, y, w: targetW, h: targetH })
    } catch {
        img.crop(x, y, targetW, targetH)
    }

    return img
}

async function main() {
    console.log('Starting verification script...');
    try {
        // Create a new image 100x100
        const image = new Jimp({ width: 100, height: 100 });
        console.log('Image created:', image.bitmap.width, image.bitmap.height);

        console.log('Testing coverCenter(image, 50, 50)...');
        const result = coverCenter(image, 50, 50);
        console.log('Result dimensions:', result.bitmap.width, result.bitmap.height);

        if (result.bitmap.width === 50 && result.bitmap.height === 50) {
            console.log('VERIFICATION PASSED');
        } else {
            console.log('VERIFICATION FAILED: Dimensions mismatch');
        }

    } catch (error) {
        console.error('VERIFICATION FAILED with error:', error);
    }
}

main();
