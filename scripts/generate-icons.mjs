/**
 * One-off script: regenerate public/icons/* from the inline design below.
 * Run with `node scripts/generate-icons.mjs`. Re-run after design changes.
 *
 * Placeholder for M6 — a "PR" monogram on the brand-accent (#3D8055) square.
 * Swap the entire script when a real launch icon lands; output paths must
 * stay the same so manifest.json doesn't change.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ICONS_DIR = resolve(__dirname, '..', 'public', 'icons')

const ACCENT = '#3D8055'

function buildSvg({ size, brandSize }) {
  // brandSize = the width/height of the "PR" content area. For full-bleed icons
  // it's the full canvas; for maskable it's smaller so the brand sits in the
  // inner safe zone (per Android adaptive-icon spec — content radius ~40%).
  const fontPx = Math.round(brandSize * 0.55)
  const cx = size / 2
  // Slight nudge down — visual centre for caps sits a touch below geometric.
  const cy = size / 2 + fontPx * 0.05
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${ACCENT}"/>
    <text x="${cx}" y="${cy}"
          font-family="-apple-system, system-ui, 'Helvetica Neue', Arial, sans-serif"
          font-weight="800"
          font-size="${fontPx}"
          fill="#ffffff"
          text-anchor="middle"
          dominant-baseline="central"
          letter-spacing="-0.04em">PR</text>
  </svg>`
}

async function renderMonogram({ size, brandSize }) {
  const svg = Buffer.from(buildSvg({ size, brandSize }))
  return sharp(svg).png({ compressionLevel: 9 }).toBuffer()
}

async function main() {
  await mkdir(ICONS_DIR, { recursive: true })

  const variants = [
    { name: 'icon-192.png', size: 192, brandSize: 192 },
    { name: 'icon-512.png', size: 512, brandSize: 512 },
    // Maskable: brand content must fit the inner ~80% safe zone so launcher
    // masks (circle, squircle, rounded square) don't crop the monogram.
    { name: 'icon-512-maskable.png', size: 512, brandSize: 410 },
    { name: 'apple-touch-icon.png', size: 180, brandSize: 180 },
    { name: 'favicon-32.png', size: 32, brandSize: 32 },
  ]

  for (const v of variants) {
    const buf = await renderMonogram(v)
    await writeFile(resolve(ICONS_DIR, v.name), buf)
    console.log(`wrote ${v.name} (${v.size}x${v.size})`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
