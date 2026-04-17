/**
 * Generates PWA icons for ProdeMundial.
 * Run once: node scripts/generate-icons.mjs
 * Requires: npm install --save-dev sharp
 */

import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../public/icons");

// App colors: dark blue bg (#0a1628), gold accent (#f59e0b), white text
const svgIcon = (size, safe = false) => {
  const pad = safe ? Math.round(size * 0.1) : 0; // maskable: 10% safe zone padding
  const inner = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = inner / 2;
  const fontSize = Math.round(inner * 0.35);
  const ballR = Math.round(inner * 0.12);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#0f2347"/>
      <stop offset="100%" stop-color="#0a1628"/>
    </radialGradient>
  </defs>
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bg)" rx="${Math.round(size * 0.18)}"/>
  <!-- Soccer ball circle top-right accent -->
  <circle cx="${cx + r * 0.55}" cy="${cy - r * 0.5}" r="${ballR}" fill="none" stroke="#f59e0b" stroke-width="${Math.round(size * 0.025)}" opacity="0.6"/>
  <!-- "PM" text -->
  <text x="${cx}" y="${cy + fontSize * 0.35}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${fontSize}"
        font-weight="800"
        fill="#ffffff"
        text-anchor="middle"
        letter-spacing="-1">PM</text>
  <!-- Gold underline -->
  <rect x="${cx - fontSize * 0.75}" y="${cy + fontSize * 0.55}" width="${fontSize * 1.5}" height="${Math.round(size * 0.025)}" fill="#f59e0b" rx="${Math.round(size * 0.012)}"/>
</svg>`;
};

async function generate(svgStr, filename) {
  const buf = Buffer.from(svgStr);
  await sharp(buf).png().toFile(join(OUT, filename));
  console.log(`✓ ${filename}`);
}

await generate(svgIcon(192), "icon-192.png");
await generate(svgIcon(512), "icon-512.png");
await generate(svgIcon(512, true), "icon-maskable-512.png");

console.log("Icons generated in public/icons/");
