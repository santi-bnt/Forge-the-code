import { readdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
const root = resolve('dist');
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(async entry => entry.isDirectory() ? files(resolve(dir, entry.name)) : [resolve(dir, entry.name)]))).flat();
}
const assets = (await files(root)).map(path => '/' + relative(root, path).replaceAll('\\', '/')).filter(path => path !== '/sw.js' && path !== '/offline-assets.json');
await writeFile(resolve(root, 'offline-assets.json'), JSON.stringify(assets));
const swPath = resolve(root, 'sw.js');
const hash = createHash('sha256').update(assets.join('|')).digest('hex').slice(0, 12);
await writeFile(swPath, (await readFile(swPath, 'utf8')).replace('codebook-v1', `codebook-${hash}`));
console.log(`Offline manifest: ${assets.length} assets`);
