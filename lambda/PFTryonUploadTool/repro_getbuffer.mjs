import { Jimp } from 'jimp';

async function main() {
    console.log('Testing getBufferAsync...');
    try {
        const image = new Jimp({ width: 100, height: 100, color: 0xffffffff });
        console.log('Image created');

        // Test getBufferAsync
        console.log('Attempting getBufferAsync...');
        try {
            const buffer = await image.getBufferAsync('image/jpeg');
            console.log('getBufferAsync success, buffer length:', buffer.length);
        } catch (e) {
            console.log('getBufferAsync failed:', e.message);
        }

        // Test getBuffer
        console.log('Attempting getBuffer...');
        try {
            const buffer = await image.getBuffer('image/jpeg');
            console.log('getBuffer success, buffer length:', buffer.length);
        } catch (e) {
            console.log('getBuffer failed:', e.message);
        }

        // Check available methods
        console.log('\nAvailable methods containing "buffer":');
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(image))
            .filter(m => m.toLowerCase().includes('buffer'));
        console.log(methods);

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
