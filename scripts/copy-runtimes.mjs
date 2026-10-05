import { mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve('public');
await mkdir(root, { recursive: true });
const pyodideSource = resolve('node_modules/pyodide');
const pyodideTarget = resolve(root, 'runtimes/pyodide');
await mkdir(pyodideTarget, { recursive: true });
for (const name of ['pyodide.js', 'pyodide.mjs', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']) {
  await copyFile(resolve(pyodideSource, name), resolve(pyodideTarget, name));
}
console.log('Copied local Python runtime; Runno C/C++ assets are in public/runtimes/runno');
