import type JSZip from 'jszip';
import { preloadArtwork } from '../artwork/library';
import { CharacterId, ComponentId, LayoutMode, ProfileConfig, ThemeMode } from '../types';
import { COMPONENT_REGISTRY, pageCount } from './svgGenerators';
import { parseConfig, serializeConfig } from '../data/configStore';
import { esc } from './text';
import { FONT_LICENSES } from './fonts/licenses';
import { generateFullReadme } from '../readme/readmeBuilder';
import { resolveReadmeSettings } from '../readme/settings';
import { profileLinks, markdownLink, safeHttpUrl } from '../readme/links';
import { svgFilename } from './filenames';
import { buildExportManifest, assertAssetReferences, ExportOptions } from './exportManifest';
export { svgFilename, safeHttpUrl, buildExportManifest };
export type { ExportOptions };
import { CarouselComponentId, carouselFilename, renderCarouselSvg } from './carousel';
import { DEFAULT_CARD_TEMPLATE, getCardTemplate, itemsPerPage } from '../templates/registry';
import { CHARACTER_IDS } from '../characters/themes';
import { characterColorway, COLORWAY_LABELS } from '../characters/colorways';

export function generateEmbedSnippet(
  config: ProfileConfig,
  id: ComponentId,
  basePath = 'assets/ego-striker',
  page?: number,
  template?: string,
): string {
  const component = COMPONENT_REGISTRY.find((c) => c.id === id);
  if (!component) throw new Error('Unknown component.');
  const templateId = getCardTemplate(id, template ?? config.cardTemplates?.[id]).id;
  if (page === undefined)
    return Array.from({ length: pageCount(id, config, templateId) }, (_, i) =>
      generateEmbedSnippet(config, id, basePath, i, templateId),
    ).join('\n\n');
  if (!Number.isInteger(page) || page < 0 || page >= pageCount(id, config, templateId))
    throw new Error('Invalid component page.');
  const path = basePath.replace(/\/$/, '');
  const character = config.characterOverrides?.[id] ?? config.character;
  const asset = (theme: ThemeMode, layout: LayoutMode) =>
    esc(
      `${path}/${svgFilename(id, theme, layout, page, character, templateId, characterColorway(config, character))}`,
    );
  const image = `<!-- ${component.name}: compact sources must come before wide sources. -->
<picture>
  <source media="(max-width: 480px) and (prefers-color-scheme: dark)" srcset="${asset('dark', 'compact')}">
  <source media="(max-width: 480px)" srcset="${asset('light', 'compact')}">
  <source media="(prefers-color-scheme: dark)" srcset="${asset('dark', 'wide')}">
  <img src="${asset('light', 'wide')}" alt="${esc(component.name + ' — ' + getCardTemplate(id, templateId).name + '. ' + component.description)}" width="${component.baseSize?.wide[0] ?? 800}">
</picture>`;
  const links = profileLinks(config, id, page, templateId).map(markdownLink);
  return image + (links.length ? `\n\n${links.join(' · ')}` : '');
}

export function generateCarouselEmbedSnippet(
  config: ProfileConfig,
  id: CarouselComponentId,
  basePath = 'assets/ego-striker',
): string {
  const component = COMPONENT_REGISTRY.find((entry) => entry.id === id)!;
  if (pageCount(id, config) < 2) throw new Error('A carousel requires at least two pages.');
  const character = config.characterOverrides?.[id] ?? config.character;
  const template = getCardTemplate(id, config.cardTemplates?.[id]).id;
  const path = basePath.replace(/\/$/, '');
  const asset = (theme: ThemeMode, layout: LayoutMode) =>
    esc(
      `${path}/${carouselFilename(id, character, theme, layout, template, characterColorway(config, character))}`,
    );
  const image = `<picture>\n  <source media="(max-width: 480px) and (prefers-color-scheme: dark)" srcset="${asset('dark', 'compact')}">\n  <source media="(max-width: 480px)" srcset="${asset('light', 'compact')}">\n  <source media="(prefers-color-scheme: dark)" srcset="${asset('dark', 'wide')}">\n  <img src="${asset('light', 'wide')}" alt="${esc(component.name + ' — animated page carousel')}" width="${component.baseSize?.wide[0] ?? 800}">\n</picture>`;
  const links =
    id === 'projects'
      ? config.projects
          .flatMap((project) => {
            const url = safeHttpUrl(project.url);
            return url ? [markdownLink({ label: project.name, url })] : [];
          })
          .filter(Boolean)
      : [];
  return image + (links.length ? `\n\n${links.join(' · ')}` : '');
}

export async function createExportZip(
  config: ProfileConfig,
  ids: ComponentId[],
  options: ExportOptions = {},
): Promise<JSZip> {
  if (!ids.length) throw new Error('Select at least one component to export.');
  const manifest = buildExportManifest(config, ids, options);
  config = manifest.config;
  await preloadArtwork(
    manifest.variants
      .filter((v) => getCardTemplate(v.id, v.template).collection)
      .map((v) => v.character),
  );
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const selected = ids.map((id) => COMPONENT_REGISTRY.find((c) => c.id === id)!);
  const characters = options.characters?.length ? options.characters : undefined;
  const variantSnippets: string[] = [];
  for (let index = 0; index < manifest.assets.length; index++) {
    const asset = manifest.assets[index];
    const variant = manifest.variants.find(
      (v) =>
        v.id === asset.id &&
        v.template === asset.template &&
        v.character === asset.character &&
        v.colorway === asset.colorway,
    )!;
    const svg =
      asset.kind === 'carousel'
        ? renderCarouselSvg(variant.config, asset.id as CarouselComponentId, asset.theme, {
            layout: asset.layout,
            template: asset.template,
          })
        : COMPONENT_REGISTRY.find((c) => c.id === asset.id)!.render(variant.config, asset.theme, {
            layout: asset.layout,
            page: asset.page,
            template: asset.template,
          });
    zip.file(asset.path, svg);
    options.onProgress?.(((index + 1) / manifest.assets.length) * 70);
    if (index % 8 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  for (const variant of manifest.variants) {
    variantSnippets.push(
      `## ${variant.id} / ${getCardTemplate(variant.id, variant.template).name} / ${variant.character} / ${COLORWAY_LABELS[variant.colorway]}\n\n${generateEmbedSnippet(variant.config, variant.id)}`,
    );
    if (
      ['projects', 'player-card', 'league-table'].includes(variant.id) &&
      pageCount(variant.id, variant.config) > 1
    )
      variantSnippets.push(
        generateCarouselEmbedSnippet(variant.config, variant.id as CarouselComponentId),
      );
  }
  zip.file('profile.config.json', serializeConfig(config));
  zip.file('FONT-LICENSES.txt', FONT_LICENSES);
  if (
    options.allTemplates ||
    selected.some((c) => getCardTemplate(c.id, config.cardTemplates?.[c.id]).collection)
  )
    zip.file(
      'ARTWORK-NOTES.txt',
      'The Blue Lock cover collection uses 24 original AI fan illustrations generated with the built-in ImageGen tool. Artwork is embedded in the SVGs; no remote image loading is required. Text, numbers and data are separate SVG layers.\nSelected original PNGs: assets/artwork/source/ in the Studio source project. Prompts: assets/artwork/prompts.json. Pipeline: npm run artwork:build. References and design mapping: docs/BLUE-LOCK-DESIGN-RESEARCH.md. This is an independent fan project, not an official Blue Lock product.\n',
    );
  zip.file(
    'profile.config.ts',
    `// Import profile.config.json in the studio to edit this configuration.\nexport const profileConfig = ${JSON.stringify(config, null, 2)};\nexport default profileConfig;\n`,
  );
  zip.file(
    'embed-snippets.md',
    selected.map((c) => `## ${c.name}\n\n${generateEmbedSnippet(config, c.id)}`).join('\n\n'),
  );
  zip.file(
    'carousel-snippets.md',
    selected
      .filter(
        (component) =>
          ['projects', 'player-card', 'league-table'].includes(component.id) &&
          pageCount(component.id, config) > 1,
      )
      .map(
        (component) =>
          `## ${component.name} carousel\n\n${generateCarouselEmbedSnippet(config, component.id as CarouselComponentId)}`,
      )
      .join('\n\n') ||
      '# Optional page carousels\n\nThis profile has no cards with multiple pages.',
  );
  if (options.allTemplates || characters || options.allIsagiColorways)
    zip.file('variant-snippets.md', variantSnippets.join('\n\n'));
  zip.file(
    'INSTALL.md',
    `# Install Ego Striker components\n\n1. Copy the assets/ego-striker folder into the root of your GitHub profile repository.\n2. Commit the SVGs on the same branch as your existing README.md.\n3. Copy the snippets you want from embed-snippets.md, variant-snippets.md or carousel-snippets.md into your README.\n4. Keep project and contact links outside the SVG image so visitors can click them.\n5. To update, import profile.config.json in the Studio, edit the profile, and export again.\n\nAdditional character selections retain the active profile assets and per-card overrides. Every generated README reference is checked against the export manifest.\n\nEach card has four responsive variants: dark/light × wide/compact. Items per page follow the selected design: Project Squad shows three projects, Compact Project List shows four, and language/player designs show up to six. Page one keeps the default filename; non-default designs add their design ID, and later pages add .p02, .p03, etc. The snippets include the corresponding fallback images. Carousel snippets are optional and use one animated SVG for all pages. FONT-LICENSES.txt accompanies the self-contained vector typography.\nThe snippets use relative paths from a README at the repository root. Adjust paths if it is elsewhere.\nAnimation preferences are included inside each SVG. GitHub rendering and caching can differ from the local preview; check your committed README. See the Studio compatibility notes before relying on animation in an external host. Reduced-motion styles keep carousel page one visible when the host honors the preference.\n\nThe profile kit contains generated assets and embed instructions. Poster exports retain hero-anime.*.svg aliases temporarily; new snippets use hero.poster.*.svg. For automatic contribution sync, install the workflow from the Studio repository in a profile repository that also contains the Ego Striker source and package scripts, then grant the workflow Contents write permission. The workflow needs GITHUB_TOKEN; the profile kit alone does not include the generator source. Without a token, local generation uses the configured season data. Demo labels describe sample data. Change them to your own information before publishing. Skill ratings are self-assessments, not verified qualifications.\n`,
  );
  for (const file of ['embed-snippets.md', 'carousel-snippets.md', 'variant-snippets.md']) {
    const entry = zip.file(file);
    if (entry) assertAssetReferences(await entry.async('string'), Object.keys(zip.files));
  }
  return zip;
}

export async function createProfileKitZip(
  config: ProfileConfig,
  settings?: Parameters<typeof generateFullReadme>[1],
  options: ExportOptions = {},
): Promise<JSZip> {
  config = parseConfig(config);
  const resolved = resolveReadmeSettings(config, settings);
  const ids = resolved.selectedCards;
  const zip = await createExportZip(config, ids, options);
  const readme = generateFullReadme(config, resolved);
  assertAssetReferences(readme, Object.keys(zip.files));
  zip.file('README.md', readme);
  return zip;
}

export async function createFullExportZip(
  config: ProfileConfig,
  ids: ComponentId[] = COMPONENT_REGISTRY.map((c) => c.id),
  options: ExportOptions = {},
): Promise<Blob> {
  return (await createExportZip(config, ids, options)).generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
    },
    (metadata) => options.onProgress?.(70 + metadata.percent * 0.3),
  );
}
