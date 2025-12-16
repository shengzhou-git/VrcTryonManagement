
import { Jimp } from 'jimp';

async function main() {
    console.log('Starting reproduction script...');
    try {
        // Create a new image 100x100
        const image = new Jimp({ width: 100, height: 100 });
        console.log('Image created:', image.bitmap.width, image.bitmap.height);

        // Test cover
        console.log('Attempting cover({ w: 50, h: 50 })...');
        try {
            image.cover({ w: 50, h: 50 });
            console.log('Cover({ w, h }) success');
        } catch (e) {
            console.log('Cover({ w, h }) failed:', e.message);
        }

        // Test cover with numbers
        console.log('Attempting cover(50, 50)...');
        try {
            image.cover(50, 50);
            console.log('Cover(w, h) success');
        } catch (e) {
            console.log('Cover(w, h) failed:', e.message);
        }

    } catch (error) {
        console.error('Error caught:', error);
    }
}

main();
