import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Source logo file - try PNG first, then SVG
const sourcePng = join(process.cwd(), 'public', 'daldiz-logo.png');
const sourceSvg = join(process.cwd(), 'public', 'daldiz-logo.svg');

let sourcePath;
let sourceBuffer;

if (existsSync(sourcePng)) {
  sourcePath = sourcePng;
  sourceBuffer = readFileSync(sourcePng);
  console.log('Using source: daldiz-logo.png');
} else if (existsSync(sourceSvg)) {
  sourcePath = sourceSvg;
  sourceBuffer = readFileSync(sourceSvg);
  console.log('Using source: daldiz-logo.svg');
} else {
  console.error('Error: Neither daldiz-logo.png nor daldiz-logo.svg found in public/');
  process.exit(1);
}

const iconsDir = join(process.cwd(), 'public', 'icons');
const publicDir = join(process.cwd(), 'public');

// Function to generate icon
async function generateIcon(outputPath, size) {
  await sharp(sourceBuffer)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(outputPath);
  console.log(`✓ Generated ${outputPath} (${size}x${size})`);
}

try {
  // 1. public/icons/daldiz-192.png
  await generateIcon(join(iconsDir, 'daldiz-192.png'), 192);

  // 2. public/icons/daldiz-512.png
  await generateIcon(join(iconsDir, 'daldiz-512.png'), 512);

  // 3. public/apple-touch-icon.png (180x180)
  await generateIcon(join(publicDir, 'apple-touch-icon.png'), 180);

  // 4. public/pwa-192x192.png
  await generateIcon(join(publicDir, 'pwa-192x192.png'), 192);

  // 5. public/pwa-512x512.png
  await generateIcon(join(publicDir, 'pwa-512x512.png'), 512);

  console.log('\n✅ All icons generated successfully!');
} catch (error) {
  console.error('Error generating icons:', error);
  process.exit(1);
}
