/**
 * Generates PWA icons for ProdeMundial.
 * Run once: node scripts/generate-icons.mjs
 * Requires: npm install --save-dev sharp
 *
 * Design matches the favicon (src/app/icon.tsx):
 * dark blue background #0a1628, amber circle #f59e0b, "26" text in dark blue.
 */

import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../public/icons");

const svgIcon = (size, safe = false) => {
  const pad = safe ? Math.round(size * 0.12) : 0; // maskable: 12% safe zone
  const inner = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const circleR = Math.round(inner * 0.37);
  const fontSize = Math.round(circleR * 0.85);
  const cornerR = Math.round(size * 0.18);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#0a1628" rx="${cornerR}"/>
  <!-- Amber circle -->
  <circle cx="${cx}" cy="${cy}" r="${circleR}" fill="#f59e0b"/>
  <!-- "26" text -->
  <text x="${cx}" y="${cy + fontSize * 0.36}"
        font-family="system-ui, -apple-system, Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="900"
        fill="#0a1628"
        text-anchor="middle">${safe ? "26" : "26"}</text>
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
