import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { DEFAULT_CONFIG } from '../src/data/defaultConfig';
import { COMPONENT_REGISTRY, svgDataUrl } from '../src/generator/svgGenerators';

await mkdir('artifacts/review', { recursive: true });
const browser = await chromium.launch();
try {
  for (const theme of ['dark', 'light'] as const)
    for (const layout of ['wide', 'compact'] as const) {
      const width = layout === 'wide' ? 800 : 400;
      const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Landscape component review</title><style>body{margin:0;padding:16px;background:${theme === 'dark' ? '#070d1b' : '#e9eef7'};font:14px Arial;color:${theme === 'dark' ? '#b5c6e1' : '#223957'}}main{display:grid;grid-template-columns:repeat(2,${width}px);gap:16px}figure{margin:0}img{display:block;max-width:100%;margin-inline:auto}figcaption{padding:8px 0 12px}</style><main>${COMPONENT_REGISTRY.map((c) => `<figure><img alt="${c.name}" src="${svgDataUrl(c.render({ ...DEFAULT_CONFIG, animationLevel: 'none' }, theme, { layout }))}"><figcaption>${c.name} / ${theme} / ${layout}</figcaption></figure>`).join('')}</main></html>`;
      await writeFile(`artifacts/review/${theme}.${layout}.html`, html);
      const page = await browser.newPage({ viewport: { width: width * 2 + 48, height: 1000 } });
      await page.setContent(html);
      await page.screenshot({ path: `artifacts/review/${theme}.${layout}.png`, fullPage: true });
      await page.close();
    }
} finally {
  await browser.close();
}
console.log('Review sheets saved to artifacts/review.');
