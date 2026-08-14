// Generate PNG icons from icon.svg for PWA manifest.
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join } from 'path';

const SRC = join(process.cwd(), 'apps/web/public/icon.svg');
const OUT = join(process.cwd(), 'apps/web/public/icons');
mkdirSync(OUT, { recursive: true });

const sizes = [
  { size: 64, file: 'icon-64.png' },
  { size: 96, file: 'icon-96.png' },
  { size: 128, file: 'icon-128.png' },
  { size: 192, file: 'icon-192.png' },
  { size: 256, file: 'icon-256.png' },
  { size: 384, file: 'icon-384.png' },
  { size: 512, file: 'icon-512.png' },
  { size: 1024, file: 'icon-1024.png' },
];

const svg = await import('fs').then((fs) => fs.readFileSync(SRC));

for (const { size, file } of sizes) {
  await sharp(svg)
    .resize(size, size, { fit: 'contain', background: { r: 16, g: 185, b: 129, alpha: 1 } })
    .png()
    .toFile(join(OUT, file));
  console.log(`✓ ${file}`);
}

// Maskable icon (with safe zone padding per spec)
const maskable = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#10b981"/>
  <g transform="translate(128, 128) scale(0.5)">
    <g fill="none" stroke="#ffffff" stroke-width="56" stroke-linecap="round" stroke-linejoin="round">
      <path d="M148 96 H364 V396 L328 372 L292 396 L256 372 L220 396 L184 372 L148 396 Z"/>
      <line x1="192" y1="172" x2="320" y2="172"/>
      <line x1="192" y1="226" x2="320" y2="226"/>
      <line x1="192" y1="280" x2="280" y2="280"/>
    </g>
    <circle cx="256" cy="346" r="44" fill="#ffffff"/>
  </g>
</svg>
`);

await sharp(maskable)
  .resize(512, 512)
  .png()
  .toFile(join(OUT, 'icon-maskable-512.png'));
console.log('✓ icon-maskable-512.png');

console.log('Icons generated.');
