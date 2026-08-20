// Generates the default social-share card (public/og-default.png, 1200x630).
//
// Why a build script instead of a committed binary: the card is text/brand-driven,
// so regenerating it after a copy or color change is a one-liner, not a design task.
//
//   npm run gen:og
//
// The PNG is committed to the repo so the live site can serve it statically without a
// build-time image step. Re-run this and commit the result whenever the brand copy changes.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'og-default.png');

const BRAND = 'paulo testes';
const KICKER = 'CONTENT PLATFORM';
const TAGLINE = 'Producing, publishing &amp; distributing content at scale';

// 1200x630 is the canonical Open Graph / Twitter summary_large_image size.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="50%" cy="-10%" r="90%">
      <stop offset="0%" stop-color="#1a1d26"/>
      <stop offset="60%" stop-color="#0b0c10"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="0" y="0" width="1200" height="8" fill="#35d07f"/>

  <g font-family="Segoe UI, Helvetica, Arial, sans-serif">
    <circle cx="92" cy="150" r="9" fill="#35d07f"/>
    <text x="118" y="160" font-size="30" font-weight="600" letter-spacing="4" fill="#35d07f">${KICKER}</text>

    <text x="88" y="330" font-size="128" font-weight="700" letter-spacing="-3" fill="#e8eaed">${BRAND}</text>

    <text x="92" y="430" font-size="40" font-weight="400" fill="#9aa0a6">${TAGLINE}</text>

    <text x="92" y="565" font-size="26" font-weight="500" fill="#9aa0a6">paulorwm.github.io/content-platform</text>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(OUT);
console.log(`Wrote ${OUT} (1200x630)`);
