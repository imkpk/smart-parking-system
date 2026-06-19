/**
 * Attempts to download a free Vecteezy SVG by page URL.
 * Vecteezy often blocks automated downloads (Cloudflare) — use import-vecteezy-local.mjs
 * after downloading in your browser instead.
 *
 * Usage:
 *   node scripts/download-vecteezy.mjs <vecteezy-page-url> <output-filename.svg>
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../src/assets/illustrations');

const [pageUrl, outputName] = process.argv.slice(2);

if (!pageUrl || !outputName) {
  console.error('Usage: node scripts/download-vecteezy.mjs <page-url> <output-filename.svg>');
  process.exit(1);
}

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://www.vecteezy.com/',
};

const pageResponse = await fetch(pageUrl, { headers });
const html = await pageResponse.text();
const rawPath = html.match(/data-download-download-path-value="([^"]+)"/)?.[1];
const license = html.match(/data-download-license-type-value="([^"]+)"/)?.[1];

if (!rawPath) {
  throw new Error('No download path found on page.');
}

if (license !== 'free') {
  throw new Error(`Vector is not free to download (license=${license}).`);
}

const path = rawPath.replaceAll('&amp;', '&');
const metaResponse = await fetch(`https://www.vecteezy.com${path}`, { headers });
const body = await metaResponse.text();

if (!metaResponse.ok) {
  throw new Error(`Download blocked (${metaResponse.status}). Download in browser and run import-vecteezy-local.mjs.`);
}

const payload = JSON.parse(body);
const fileResponse = await fetch(payload.url, { headers });
const content = await fileResponse.text();

if (!content.includes('<svg')) {
  throw new Error('Downloaded file is not SVG.');
}

writeFileSync(join(outDir, outputName), content, 'utf8');
console.log(`saved ${outputName} (${content.length} bytes)`);