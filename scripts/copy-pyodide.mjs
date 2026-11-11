// Copies the pinned Pyodide runtime from node_modules into public/pyodide so the
// static site (GitHub Pages) self-hosts the interpreter instead of relying on a CDN.
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'pyodide');
const dest = join(root, 'public', 'pyodide');
if (!existsSync(src)) {
  console.warn('[copy-pyodide] pyodide package not installed yet; skipping');
  process.exit(0);
}
const files = [
  'pyodide.mjs',
  'pyodide.asm.js',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
  'package.json',
];
mkdirSync(dest, { recursive: true });
for (const f of files) {
  if (existsSync(join(src, f))) cpSync(join(src, f), join(dest, f));
  
}
const { version } = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8'));
console.log(`[copy-pyodide] Pyodide ${version} copied to public/pyodide`);
