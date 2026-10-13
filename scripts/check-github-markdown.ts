import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { DEFAULT_CONFIG } from '../src/data/defaultConfig';
import { COMPONENT_REGISTRY } from '../src/generator/svgGenerators';
import { generateFullReadme } from '../src/readme';
import { generateEmbedSnippet } from '../src/generator/exportZip';
import { CARD_TEMPLATES } from '../src/templates/registry';

// GitHub's Markdown API renders HTML without publishing a repository, gist or README.
const snippets = COMPONENT_REGISTRY.flatMap((c) =>
  CARD_TEMPLATES[c.id].map((t) =>
    generateEmbedSnippet({ ...DEFAULT_CONFIG, cardTemplates: { [c.id]: t.id } }, c.id),
  ),
);
const fullReadme = generateFullReadme(DEFAULT_CONFIG, {
  selectedCards: COMPONENT_REGISTRY.map((c) => c.id),
});
const fullPictures = (fullReadme.match(/<picture>/g) ?? []).length;
const text = snippets.join('\n\n') + '\n\n' + fullReadme;
const response = await fetch('https://api.github.com/markdown', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ego-striker-component-check',
  },
  body: JSON.stringify({ text, mode: 'gfm' }),
  signal: AbortSignal.timeout(20000),
});
if (!response.ok)
  throw new Error(`GitHub Markdown check failed (${response.status}). No files were published.`);
const html = await response.text();
assert.equal(
  (html.match(/<picture>/g) ?? []).length,
  snippets.length + fullPictures,
  'GitHub should preserve every picture element.',
);
assert.equal(
  (html.match(/<source /g) ?? []).length,
  (snippets.length + fullPictures) * 3,
  'GitHub should preserve all responsive sources.',
);
assert.match(html, /prefers-color-scheme/);
assert.match(html, /max-width/);
assert.match(html, /hero\.isagi\.light\.wide\.svg/);
assert.match(html, /hero\.volume-cover\.isagi\.light\.wide\.svg/);
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/github-rendered-snippets.html', html);
console.log(
  `GitHub Markdown API preserved all ${snippets.length + fullPictures} pictures, including a complete README, responsive sources, themes and asset paths. Nothing published.`,
);
