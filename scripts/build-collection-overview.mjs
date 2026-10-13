import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';

// Assemble browser-verified screenshots for visual review; no artwork is edited.
const order = [
  'volume-cover',
  'egoist-poster',
  'collector-cover',
  'egoist-portrait',
  'chain-tactics',
  'puzzle-field',
  'issue-score',
  'impact-panel',
  'ranking-volume',
  'egoist-awards',
  'volume-shelf',
  'rival-panels',
  'chapter-log',
  'training-panels',
  'chain-ticket',
  'exhibition-pass',
];
const files = await readdir('artifacts/collection');
await mkdir('docs/gallery', { recursive: true });
for (const theme of ['dark', 'light'])
  for (const layout of ['wide', 'compact']) {
    const composites = [];
    for (const [i, design] of order.entries()) {
      const file = files.find(
        (f) => f.startsWith(`${design}.`) && f.endsWith(`.${theme}.${layout}.png`),
      );
      if (!file) throw new Error(`Run browser tests first: missing ${design}/${theme}/${layout}`);
      const tile = await sharp(`artifacts/collection/${file}`)
        .resize(376, 326, { fit: 'inside' })
        .png()
        .toBuffer({ resolveWithObject: true });
      const left = (i % 4) * 400,
        top = Math.floor(i / 4) * 380;
      composites.push({
        input: tile.data,
        left: left + Math.floor((400 - tile.info.width) / 2),
        top: top + 39 + Math.floor((326 - tile.info.height) / 2),
      });
      const label = `<svg width="400" height="32"><text x="14" y="23" fill="${theme === 'dark' ? '#f4f5f7' : '#17212d'}" font-family="sans-serif" font-size="17" font-weight="bold">${String(i + 1).padStart(2, '0')} / ${design}</text></svg>`;
      composites.push({ input: Buffer.from(label), left, top: top + 3 });
    }
    await sharp({
      create: {
        width: 1600,
        height: 1520,
        channels: 3,
        background: theme === 'dark' ? '#0b111c' : '#e4e7eb',
      },
    })
      .composite(composites)
      .png()
      .toFile(`docs/gallery/cover-collection-${theme}-${layout}.png`);
  }
console.log('Created four overview PNGs from all 64 browser screenshots.');
