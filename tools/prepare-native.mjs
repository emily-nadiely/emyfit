import { cp, mkdir, readdir, rm, copyFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = process.cwd();
const out = join(root, 'dist');
const allowed = new Set(['.html','.css','.js','.json','.webmanifest','.png','.ico','.svg','.webp','.gif','.jpg','.jpeg']);
const skip = new Set(['node_modules','dist','android','ios','.git','.github','tools','supabase']);

await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});

for (const entry of await readdir(root,{withFileTypes:true})) {
  if (skip.has(entry.name)) continue;
  const src=join(root,entry.name), dst=join(out,entry.name);
  if (entry.isDirectory()) {
    if (entry.name==='assets') await cp(src,dst,{recursive:true});
    continue;
  }
  if (allowed.has(extname(entry.name).toLowerCase())) await copyFile(src,dst);
}
console.log('Progressa native web bundle preparado em dist/');
