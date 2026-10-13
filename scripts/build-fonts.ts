import opentype from 'opentype.js';
import { writeFileSync, readFileSync } from 'node:fs';

// Reproducible, offline glyph outlines. Only glyphs used by an image are exported.
const chars = Array.from(
  new Set([
    ...Array.from({ length: 560 }, (_, i) => String.fromCodePoint(i + 32)),
    ...Array.from({ length: 256 }, (_, i) => String.fromCodePoint(i + 0x1e00)),
    ...Array.from('–—‘’“”…•→←↑↓★☆×□✓'),
  ]),
);
const result: Record<string, Record<string, { w: number; d: string }>> = {};
const notices: string[] = [];
for (const [key, file] of Object.entries({
  title: 'BarlowCondensed-Bold',
  body: 'NotoSans-Regular',
  bold: 'NotoSans-Bold',
})) {
  const bytes = readFileSync(`src/generator/fonts/${file}.ttf`);
  const font = opentype.parse(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
  const names = font.names as unknown as { windows?: { copyright?: { en?: string } } };
  notices.push(`${file}: ${names.windows?.copyright?.en ?? ''}`);
  result[key] = Object.fromEntries(
    chars.map((char) => {
      const glyph = font.charToGlyph(char);
      const path = glyph.getPath(0, 0, 1000).toPathData(1);
      return [
        char.codePointAt(0)!,
        { w: Math.round(((glyph.advanceWidth ?? 600) / font.unitsPerEm) * 1000), d: path },
      ];
    }),
  );
  // These symbols are outside Noto Sans's text coverage. Keep them as real vectors.
  result[key]['8594'] = {
    w: 950,
    d: 'M20-370H730L540-560L600-620L900-320L600-20L540-80L730-270H20Z',
  };
  result[key]['8592'] = {
    w: 950,
    d: 'M930-370H220L410-560L350-620L50-320L350-20L410-80L220-270H930Z',
  };
  result[key]['9733'] = {
    w: 900,
    d: 'M450-760L551-453L875-453L613-263L714 45L450-145L186 45L287-263L25-453L349-453Z',
  };
}
writeFileSync('src/generator/fonts/glyphs.json', JSON.stringify(result));
writeFileSync(
  'src/generator/fonts/licenses.ts',
  `// SIL Open Font License accompanying the exported outlines.\nexport const FONT_LICENSES = ${JSON.stringify(notices.join('\n') + '\n\n' + ['Barlow-OFL.txt', 'Noto-OFL.txt'].map((file) => readFileSync('src/generator/fonts/' + file, 'utf8')).join('\n\n'))};\n`,
);
