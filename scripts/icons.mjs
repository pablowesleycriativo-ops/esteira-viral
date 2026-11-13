import { readFileSync } from 'node:fs'
import sharp from 'sharp'

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url))
const mask = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#F7F5F0"/>
  <g transform="translate(76 76) scale(5.6)">
    <rect x="8" y="8" width="48" height="48" rx="8" fill="none" stroke="#1C1B19" stroke-width="3"/>
    <path d="M18 26h16M18 34h28M18 42h12" stroke="#1C1B19" stroke-width="3" stroke-linecap="round"/>
    <rect x="40" y="22" width="10" height="6" rx="2" fill="#1E7A45"/>
  </g>
</svg>`

await sharp(svg).resize(180, 180).png().toFile('public/apple-touch-icon.png')
await sharp(svg).resize(192, 192).png().toFile('public/pwa-192.png')
await sharp(svg).resize(512, 512).png().toFile('public/pwa-512.png')
await sharp(Buffer.from(mask)).resize(512, 512).png().toFile('public/pwa-512-maskable.png')
