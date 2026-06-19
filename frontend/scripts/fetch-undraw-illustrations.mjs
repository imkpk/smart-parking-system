/**
 * Downloads curated unDraw SVGs (MIT) and normalizes primary accent to --primary-svg-color.
 * Run: node scripts/fetch-undraw-illustrations.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../src/assets/illustrations');

/** @type {Array<{ file: string; slug: string; title: string }>} */
const picks = [
  { file: 'security-check.svg', slug: 'security-on_3ykb', title: 'Security check' },
  { file: 'security-alert.svg', slug: 'motion-alert_pr1a', title: 'Security alert' },
  { file: 'gate-entrance.svg', slug: 'knocking-on-the-door_vgly', title: 'Gate entrance' },
  { file: 'chat-support.svg', slug: 'work-chat_kw8x', title: 'Work chat' },
  { file: 'customer-care.svg', slug: 'contact-us_s4jn', title: 'Customer care' },
  { file: 'messaging.svg', slug: 'respond_o54z', title: 'Messaging reply' },
  { file: 'parking-logistics.svg', slug: 'logistics_8vri', title: 'Parking logistics' },
];

function normalizeSvg(svg) {
  return svg
    .replace(/#6c63ff/gi, 'var(--primary-svg-color)')
    .replace(/#6C63FF/g, 'var(--primary-svg-color)');
}

for (const { file, slug, title } of picks) {
  const url = `https://cdn.undraw.co/illustration/${slug}.svg`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${title} (${url}): ${response.status}`);
  }
  const raw = await response.text();
  if (!raw.includes('<svg')) {
    throw new Error(`Invalid SVG for ${title}`);
  }
  writeFileSync(join(outDir, file), normalizeSvg(raw), 'utf8');
  console.log(`saved ${file} <- ${slug}`);
}