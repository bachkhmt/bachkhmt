import { preloadArtwork } from '../src/artwork/library';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CHARACTER_IDS, CHARACTER_THEMES } from '../src/characters/themes';
import { DEFAULT_CONFIG } from '../src/data/defaultConfig';
import { COMPONENT_REGISTRY } from '../src/generator/svgGenerators';
import { CARD_TEMPLATES } from '../src/templates/registry';

export async function generateCharacterGallery(root = process.cwd()) {
  await preloadArtwork(CHARACTER_IDS);
  const outputDir = join(root, 'docs', 'gallery');
  await mkdir(outputDir, { recursive: true });
  for (const character of CHARACTER_IDS) {
    const config = structuredClone(DEFAULT_CONFIG);
    config.character = character;
    config.animationLevel = 'none';
    await writeFile(
      join(outputDir, `${character}.svg`),
      COMPONENT_REGISTRY[0].render(config, 'dark', { layout: 'wide' }),
      'utf8',
    );
  }

  const sections = [
    '# Character and card design gallery',
    '',
    'Static dark / wide samples use the default profile data. The Studio provides light and compact layouts.',
    '',
  ];
  for (const component of COMPONENT_REGISTRY) {
    for (const templateId of component.templates) {
      const templateDir = join(outputDir, 'cards', component.id, templateId);
      await mkdir(templateDir, { recursive: true });
      const images: string[] = [];
      for (const character of CHARACTER_IDS) {
        const characterConfig = structuredClone(DEFAULT_CONFIG);
        characterConfig.character = character;
        characterConfig.animationLevel = 'none';
        characterConfig.cardTemplates = {
          ...characterConfig.cardTemplates,
          [component.id]: templateId,
        };
        const svg = component.render(characterConfig, 'dark', {
          layout: 'wide',
          template: templateId,
        });
        await writeFile(join(templateDir, `${character}.svg`), svg, 'utf8');
        if (CARD_TEMPLATES[component.id].find((t) => t.id === templateId)?.collection)
          for (const theme of ['dark', 'light'] as const)
            for (const layout of ['wide', 'compact'] as const)
              await writeFile(
                join(templateDir, `${character}.${theme}.${layout}.svg`),
                component.render(characterConfig, theme, { layout, template: templateId }),
                'utf8',
              );
        images.push(
          `| **${CHARACTER_THEMES[character].name}** | ![${component.name} · ${templateId} · ${CHARACTER_THEMES[character].name}](gallery/cards/${component.id}/${templateId}/${character}.svg) |`,
        );
      }
      sections.push(
        `## ${component.name} · ${templateId}`,
        '',
        '| Character | Preview |',
        '|---|---|',
        ...images,
        '',
      );
    }
  }
  await writeFile(join(root, 'docs', 'CHARACTER-CARD-GALLERY.md'), sections.join('\n'), 'utf8');
  const designs = COMPONENT_REGISTRY.flatMap((component) =>
    CARD_TEMPLATES[component.id]
      .filter((t) => t.collection)
      .map((t) => ({ ...t, componentName: component.name })),
  );
  const escape = (value: string) =>
    value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  const cards = designs
    .map(
      (t) =>
        `<figure data-component="${t.component}"><figcaption><span>${escape(t.componentName)} / ${t.collection}</span><strong>${escape(t.name)}</strong></figcaption><img loading="lazy" data-design="${t.id}" data-component="${t.component}" src="cards/${t.component}/${t.id}/isagi.dark.wide.svg" alt="${escape(t.name)}"><p>${escape(t.description)}</p></figure>`,
    )
    .join('');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ego Striker — Blue Lock Cover Collection</title>
  <style>*{box-sizing:border-box}body{margin:0;background:#0b111c;color:#f4f5f7;font-family:system-ui,sans-serif}header{padding:36px 4vw 24px;position:sticky;top:0;z-index:1;background:#0b111cf2;border-bottom:1px solid #334158}h1{margin:5px 0 12px;font-size:clamp(24px,4vw,38px)}p{color:#abb9cd;font-size:13px;line-height:1.6}label{display:inline-block;margin-right:16px;font-size:12px}select{display:block;margin-top:6px;padding:9px 16px;background:#1a283c;color:white;border:1px solid #425675;border-radius:4px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;padding:24px 4vw}figure{margin:0;border:1px solid #334158;background:#101b2a;padding:15px;align-self:start;border-radius:6px}figure[hidden]{display:none}figcaption{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}figcaption span{color:#9fb4ce;font-size:10px;letter-spacing:2px;text-transform:uppercase}figcaption strong{font-size:19px}img{width:100%;height:auto;display:block}figure p{margin-bottom:0}a{color:#b4dbff}@media(max-width:750px){main{grid-template-columns:1fr}}</style>
  <header><p>BLUE LOCK INSPIRED / ORIGINAL AI ARTWORK</p><h1>16 new designs · 8 characters</h1><p>Manga covers, anime posters and exhibition cards for your entire profile. Original AI artwork with separate SVG text and data. Open Studio to edit layers and motion.</p><label>Character<select id="character">${CHARACTER_IDS.map((id) => `<option value="${id}">${CHARACTER_THEMES[id].name}</option>`).join('')}</select></label><label>Category<select id="component"><option value="all">All 8 categories</option>${COMPONENT_REGISTRY.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}</select></label><label>Theme<select id="theme"><option value="dark">Dark</option><option value="light">Light</option></select></label><label>Layout<select id="layout"><option value="wide">Wide</option><option value="compact">Compact</option></select></label><a href="../../">Open Studio</a></header><main>${cards}</main>
  <script>const character=document.getElementById('character'),component=document.getElementById('component'),theme=document.getElementById('theme'),layout=document.getElementById('layout');[character,theme,layout].forEach(control=>control.addEventListener('change',()=>document.querySelectorAll('img').forEach(img=>{img.src='cards/'+img.dataset.component+'/'+img.dataset.design+'/'+character.value+'.'+theme.value+'.'+layout.value+'.svg'})));component.addEventListener('change',()=>document.querySelectorAll('figure').forEach(card=>{card.hidden=component.value!=='all'&&card.dataset.component!==component.value}));</script></html>`;
  await writeFile(join(outputDir, 'cover-collection.html'), html, 'utf8');
  console.log(
    `Generated ${CHARACTER_IDS.length * COMPONENT_REGISTRY.reduce((total, component) => total + component.templates.length, 0)} dark/wide previews and all 512 cover variants in docs/gallery/cards/.`,
  );
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/generate-gallery.ts'))
  generateCharacterGallery().catch((error) => {
    console.error('Character gallery generation failed:', error);
    process.exitCode = 1;
  });

export const characterGalleryLabels = CHARACTER_IDS.map((id) => ({
  id,
  name: CHARACTER_THEMES[id].name,
  theme: CHARACTER_THEMES[id].label,
  motif: CHARACTER_THEMES[id].motif,
}));
