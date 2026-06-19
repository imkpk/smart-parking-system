/**
 * Copy a locally downloaded Vecteezy SVG into frontend/src/assets/illustrations/.
 *
 * Usage:
 *   node scripts/import-vecteezy-local.mjs <source.svg> [target-filename.svg]
 *
 * Example:
 *   node scripts/import-vecteezy-local.mjs "C:/Users/you/Downloads/vecteezy_admin_12345.svg" admin-support-chat.svg
 */
import { copyFileSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../src/assets/illustrations');

const [sourcePath, targetNameArg] = process.argv.slice(2);

if (!sourcePath) {
  console.error('Usage: node scripts/import-vecteezy-local.mjs <source.svg> [target-filename.svg]');
  process.exit(1);
}

const content = readFileSync(sourcePath, 'utf8');
if (!content.includes('<svg')) {
  console.error('Source file does not look like an SVG.');
  process.exit(1);
}

const targetName = targetNameArg ?? basename(sourcePath);
const targetPath = join(outDir, targetName);
copyFileSync(sourcePath, targetPath);
console.log(`imported ${targetName} (${content.length} bytes)`);