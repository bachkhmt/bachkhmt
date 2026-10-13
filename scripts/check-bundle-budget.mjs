import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'));
const visited = new Set();
const visit = (key) => {
  if (visited.has(key)) return;
  visited.add(key);
  (manifest[key].imports ?? []).forEach(visit);
};
Object.entries(manifest)
  .filter(([, chunk]) => chunk.isEntry)
  .forEach(([key]) => visit(key));
let bytes = 0;
for (const key of visited) {
  const chunk = manifest[key];
  assert.ok(
    !/assets\/(?:isagi|rin|bachira|nagi|reo|chigiri|barou|kaiser)-/.test(chunk.file),
    'Artwork must be loaded on demand',
  );
  bytes += gzipSync(await readFile('dist/' + chunk.file)).byteLength;
}
assert.ok(bytes <= 1024 * 1024, `Initial JavaScript exceeds 1 MiB gzip: ${bytes}`);
console.log(
  `Initial JavaScript: ${(bytes / 1024).toFixed(1)} KiB gzip; budget 1024 KiB; no character artwork in initial imports.`,
);
