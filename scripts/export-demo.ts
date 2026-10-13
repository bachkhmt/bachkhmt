import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_CONFIG } from '../src/data/defaultConfig';
import { COMPONENT_REGISTRY } from '../src/generator/svgGenerators';
import { createExportZip } from '../src/generator/exportZip';

const out = join(process.cwd(), 'artifacts', 'demo');
await mkdir(out, { recursive: true });
const zip = await createExportZip(
  DEFAULT_CONFIG,
  COMPONENT_REGISTRY.map((c) => c.id),
);
for (const entry of Object.values(zip.files)) {
  if (entry.dir) {
    await mkdir(join(out, entry.name), { recursive: true });
    continue;
  }
  const target = join(out, entry.name);
  await mkdir(join(target, '..'), { recursive: true });
  await writeFile(target, await entry.async('nodebuffer'));
}
await writeFile(
  join(out, 'ego-striker-demo.zip'),
  await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
);
console.log(
  `Exported ${COMPONENT_REGISTRY.length * 4} demo SVGs, configuration and snippets to ${out}`,
);
