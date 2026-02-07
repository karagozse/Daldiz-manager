import sharp from 'sharp';
import { statSync } from 'fs';
import { join } from 'path';

const files = [
  'public/icons/daldiz-192.png',
  'public/icons/daldiz-512.png',
  'public/apple-touch-icon.png',
  'public/pwa-192x192.png',
  'public/pwa-512x512.png'
];

for (const file of files) {
  const fullPath = join(process.cwd(), file);
  const meta = await sharp(fullPath).metadata();
  const size = statSync(fullPath).size;
  console.log(`${file}: ${meta.width}x${meta.height} (${Math.round(size/1024)} KB)`);
}

console.log('\n✅ All icons verified!');
