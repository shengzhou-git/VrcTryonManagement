
import { Jimp } from 'jimp';

async function main() {
    console.log('Starting reproduction script for constructor...');
    try {
        const width = 768;
        const height = 1024;
        const color = 0xffffffff;

        console.log(`Attempting new Jimp(${width}, ${height}, ${color})...`);
        try {
            const image = new Jimp(width, height, color);
            console.log('Constructor success');
        } catch (e) {
            console.log('Constructor failed:', e.message);
            console.log('Error details:', e);
        }

        console.log(`Attempting new Jimp({ width: ${width}, height: ${height}, color: ${color} })...`);
        try {
            const image = new Jimp({ width, height, color });
            console.log('Object Constructor success');
        } catch (e) {
            console.log('Object Constructor failed:', e.message);
        }

    } catch (error) {
        console.error('Error caught:', error);
    }
}

main();
