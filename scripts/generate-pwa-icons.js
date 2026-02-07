import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

const svgPath = join(process.cwd(), 'public', 'daldiz-logo.svg');
const iconsDir = join(process.cwd(), 'public', 'icons');

const svgBuffer = readFileSync(svgPath);

// Generate 192x192 icon
await sharp(svgBuffer)
  .resize(192, 192, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png()
  .toFile(join(iconsDir, 'daldiz-192.png'));

console.log('✓ Generated daldiz-192.png');

// Generate 512x512 icon
await sharp(svgBuffer)
  .resize(512, 512, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png()
  .toFile(join(iconsDir, 'daldiz-512.png'));

console.log('✓ Generated daldiz-512.png');

console.log('PWA icons generated successfully!');
