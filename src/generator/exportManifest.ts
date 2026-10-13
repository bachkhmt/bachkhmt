import {
  CharacterColorway,
  CharacterId,
  ComponentId,
  LayoutMode,
  ProfileConfig,
  ThemeMode,
} from '../types';
import { characterColorway, colorwaySuffix } from '../characters/colorways';
import { parseConfig } from '../data/configStore';
import { CHARACTER_IDS } from '../characters/themes';
import { COMPONENT_REGISTRY, pageCount } from './svgGenerators';
import { getCardTemplate } from '../templates/registry';
import { svgFilename } from './filenames';
import { carouselFilename, CarouselComponentId } from './carousel';

export interface ExportOptions {
  characters?: CharacterId[];
  allTemplates?: boolean;
  allIsagiColorways?: boolean;
  onProgress?: (percent: number) => void;
}
export interface ExportAsset {
  path: string;
  id: ComponentId;
  template: string;
  character: CharacterId;
  colorway: CharacterColorway;
  theme: ThemeMode;
  layout: LayoutMode;
  page: number;
  kind: 'card' | 'alias' | 'carousel';
}
export interface ExportVariant {
  id: ComponentId;
  template: string;
  character: CharacterId;
  colorway: CharacterColorway;
  config: ProfileConfig;
}

/** Always retain the active profile; requested characters are additional variants. */
export function buildExportManifest(
  input: ProfileConfig,
  cards: ComponentId[],
  options: ExportOptions = {},
) {
  const config = parseConfig(input);
  if (
    new Set(cards).size !== cards.length ||
    cards.some((id) => !COMPONENT_REGISTRY.some((c) => c.id === id))
  )
    throw new Error('Choose unique supported components to export.');
  if (
    options.characters &&
    (new Set(options.characters).size !== options.characters.length ||
      options.characters.some((id) => !CHARACTER_IDS.includes(id)))
  )
    throw new Error('Character export selection must contain unique supported characters.');
  const assets: ExportAsset[] = [],
    variants: ExportVariant[] = [];
  for (const id of cards) {
    const component = COMPONENT_REGISTRY.find((c) => c.id === id)!;
    const templates = options.allTemplates
      ? component.templates
      : [getCardTemplate(id, config.cardTemplates?.[id]).id];
    const characters = [
      ...new Set([
        config.characterOverrides?.[id] ?? config.character,
        ...(options.characters ?? []),
      ]),
    ];
    for (const template of templates)
      for (const character of characters) {
        const colorways: CharacterColorway[] =
          character === 'isagi' && options.allIsagiColorways
            ? ['default', 'deep-blue']
            : [characterColorway(config, character)];
        for (const colorway of colorways) {
          const variantConfig = {
            ...config,
            cardTemplates: { ...config.cardTemplates, [id]: template },
            characterOverrides: { ...config.characterOverrides, [id]: character },
            ...(character === 'isagi'
              ? { characterColorways: { ...config.characterColorways, isagi: colorway } }
              : {}),
          };
          variants.push({ id, template, character, colorway, config: variantConfig });
          const pages = pageCount(id, variantConfig, template);
          for (let page = 0; page < pages; page++)
            for (const theme of ['dark', 'light'] as const)
              for (const layout of ['wide', 'compact'] as const) {
                const entry = { id, template, character, colorway, theme, layout, page };
                assets.push({
                  ...entry,
                  kind: 'card',
                  path: `assets/ego-striker/${svgFilename(id, theme, layout, page, character, template, colorway)}`,
                });
                if (id === 'hero' && template === 'poster' && page === 0)
                  assets.push({
                    ...entry,
                    kind: 'alias',
                    path: `assets/ego-striker/hero-anime.${character}${colorwaySuffix(colorway)}.${theme}.${layout}.svg`,
                  });
              }
          if (pages > 1 && ['projects', 'player-card', 'league-table'].includes(id))
            for (const theme of ['dark', 'light'] as const)
              for (const layout of ['wide', 'compact'] as const)
                assets.push({
                  id,
                  template,
                  character,
                  colorway,
                  theme,
                  layout,
                  page: 0,
                  kind: 'carousel',
                  path: `assets/ego-striker/${carouselFilename(id as CarouselComponentId, character, theme, layout, template, colorway)}`,
                });
        }
      }
  }
  return { config, cards: [...cards], assets, variants };
}

export function assertAssetReferences(text: string, paths: Iterable<string>) {
  const available = new Set(paths);
  for (const match of text.matchAll(/assets\/ego-striker\/([a-z\d.-]+\.svg)/gi))
    if (!available.has(`assets/ego-striker/${match[1]}`))
      throw new Error(`Missing exported asset: ${match[1]}`);
}
