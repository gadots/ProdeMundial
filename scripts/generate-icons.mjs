/**
 * Genera los íconos PNG estáticos para la PWA.
 * Ejecutar con: node scripts/generate-icons.mjs
 */

import sharp from "sharp";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "icons");

mkdirSync(OUT, { recursive: true });

// SVG base: fondo oscuro con pelota verde y texto "26"
function makeSvg(size, borderRadius, ballScale = 0.75) {
  const ball = Math.round(size * ballScale);
  const fontSize = Math.round(ball * 0.45);
  const offset = Math.round((size - ball) / 2);
  const br = Math.round(size * (borderRadius / 512));
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#0a1628" rx="${br}" ry="${br}"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${ball / 2}" fill="#22c55e"/>
  <text
    x="${size / 2}"
    y="${size / 2 + fontSize * 0.36}"
    text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    font-size="${fontSize}"
    fill="#0a1628"
    letter-spacing="-1"
  >26</text>
</svg>`;
}

// Para maskable: contenido dentro del 80% central (safe zone)
function makeMaskableSvg(size) {
  // Fondo que cubre todo, contenido al 72% del centro
  const ball = Math.round(size * 0.60);
  const fontSize = Math.round(ball * 0.45);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#0a1628"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${ball / 2}" fill="#22c55e"/>
  <text
    x="${size / 2}"
    y="${size / 2 + fontSize * 0.36}"
    text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    font-size="${fontSize}"
    fill="#0a1628"
    letter-spacing="-1"
  >26</text>
</svg>`;
}

const icons = [
  { name: "icon-192.png",          size: 192, svg: makeSvg(192, 40) },
  { name: "icon-512.png",          size: 512, svg: makeSvg(512, 110) },
  { name: "icon-maskable-512.png", size: 512, svg: makeMaskableSvg(512) },
];

for (const { name, size, svg } of icons) {
  const out = join(OUT, name);
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(out);
  console.log(`✓ ${name}`);
}

console.log("Íconos generados en public/icons/");
