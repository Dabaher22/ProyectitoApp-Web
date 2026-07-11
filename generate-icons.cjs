const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svg = fs.readFileSync(path.join(__dirname, 'public/icon.svg'));

async function generate() {
  // apple-touch-icon — 180x180 (iOS)
  await sharp(svg).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  console.log('✓ apple-touch-icon.png (180x180)');

  // manifest icon — 192x192
  await sharp(svg).resize(192, 192).png().toFile('public/icon-192.png');
  console.log('✓ icon-192.png (192x192)');

  // manifest icon — 512x512
  await sharp(svg).resize(512, 512).png().toFile('public/icon-512.png');
  console.log('✓ icon-512.png (512x512)');

  // favicon — 32x32
  await sharp(svg).resize(32, 32).png().toFile('public/favicon-32.png');
  console.log('✓ favicon-32.png (32x32)');
}

generate().catch(console.error);
