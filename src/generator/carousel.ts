import {
  CharacterColorway,
  CharacterId,
  ComponentId,
  LayoutMode,
  ProfileConfig,
  ThemeMode,
} from '../types';
import { colorwaySuffix } from '../characters/colorways';
import { createRenderContext } from './renderContext';
import { COMPONENT_REGISTRY, pageCount } from './svgGenerators';
import { DEFAULT_CARD_TEMPLATE, getCardTemplate, cardSize } from '../templates/registry';

export type CarouselComponentId = Extract<ComponentId, 'projects' | 'league-table' | 'player-card'>;
const carouselComponents: CarouselComponentId[] = ['projects', 'league-table', 'player-card'];

export const carouselFilename = (
  id: CarouselComponentId,
  character: CharacterId,
  theme: ThemeMode,
  layout: LayoutMode,
  template?: string,
  colorway: CharacterColorway = 'default',
) =>
  `${id}${template && template !== DEFAULT_CARD_TEMPLATE[id] ? `.${template}` : ''}.${character}${colorwaySuffix(colorway)}.carousel.${theme}.${layout}.svg`;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function namespacePage(svg: string, namespace: string): string {
  const ids = new Map(
    Array.from(svg.matchAll(/\bid="([^"]+)"/g), ([, id]) => [
      id,
      /^(font-(title|body|bold)-\d+|art-[a-z]+-(action|portrait|exhibition))$/.test(id)
        ? id
        : `${id}-${namespace}`,
    ]),
  );
  let output = svg.replace(/\bid="([^"]+)"/g, (_, id: string) => `id="${ids.get(id)}"`);
  for (const [id, unique] of ids) {
    output = output
      .replaceAll(`href="#${id}"`, `href="#${unique}"`)
      .replaceAll(`url(#${id})`, `url(#${unique})`)
      .replaceAll(`${id}.begin`, `${unique}.begin`)
      .replaceAll(`${id}.end`, `${unique}.end`);
  }
  output = output.replace(
    /(aria-labelledby|aria-describedby)="([^"]+)"/g,
    (_, attr, refs: string) =>
      `${attr}="${refs
        .split(/\s+/)
        .map((id) => ids.get(id) ?? id)
        .join(' ')}"`,
  );

  const keyframes = Array.from(output.matchAll(/@keyframes\s+([\w-]+)/g), ([, name]) => name);
  for (const name of new Set(keyframes))
    output = output.replace(
      new RegExp(`(?<![\\w-])${escapeRegExp(name)}(?![\\w-])`, 'g'),
      `${name}-${namespace}`,
    );
  return output;
}

/** Combines all pages of a paginated card into a self-contained animated SVG. */
export function renderCarouselSvg(
  config: ProfileConfig,
  id: CarouselComponentId,
  theme: ThemeMode,
  options: { layout: LayoutMode; template?: string },
): string {
  if (!carouselComponents.includes(id)) throw new Error('This component does not have a carousel.');
  const component = COMPONENT_REGISTRY.find((entry) => entry.id === id)!;
  const character = config.characterOverrides?.[id] ?? config.character;
  const template = getCardTemplate(id, options.template ?? config.cardTemplates?.[id]).id;
  const count = pageCount(id, config, template);
  if (count < 2) throw new Error('A carousel requires at least two pages.');
  const context = createRenderContext(config, id, theme, { layout: options.layout, template });
  const width = component.baseSize![options.layout][0];
  const height = cardSize(id, options.layout, template, config)[1];
  const cycleSeconds = context.timeline.cycleSeconds;
  const active = config.animationLevel !== 'none';
  const fade = Math.min(2.5, 100 / count / 8);

  const styles = active
    ? Array.from({ length: count }, (_, page) => {
        const start = (page * 100) / count;
        const end = ((page + 1) * 100) / count;
        const enter = page === 0 ? 0 : start + fade;
        const leave = end - fade;
        const frames =
          page === 0
            ? `0%,${leave.toFixed(3)}%{opacity:1}${end.toFixed(3)}%,100%{opacity:0}`
            : `0%,${start.toFixed(3)}%{opacity:0}${enter.toFixed(3)}%,${leave.toFixed(3)}%{opacity:1}${end.toFixed(3)}%,100%{opacity:0}`;
        return `@keyframes carousel-page-${page}{${frames}}.carousel-page-${page}{animation:carousel-page-${page} ${cycleSeconds}s linear infinite}`;
      }).join('')
    : '';

  const sharedGlyphs = new Map<string, string>();
  const sharedArt = new Map<string, string>();
  let sharedMetadata = '';
  const pages = Array.from({ length: count }, (_, page) => {
    const svg = namespacePage(
      component.render(config, theme, {
        layout: options.layout,
        template,
        page,
        context: { ...context, page, uid: `${context.uid}-page-${page}` },
      }),
      `page-${page}`,
    );
    let body = svg.replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    body = body.replace(/<metadata>[\s\S]*?<\/metadata>/g, (metadata) => {
      if (!sharedMetadata) sharedMetadata = metadata;
      return '';
    });
    body = body.replace(
      /<path id="(font-(?:title|body|bold)-\d+)" d="([^"]*)"\s*\/>/g,
      (_, id: string, path: string) => {
        const existing = sharedGlyphs.get(id);
        if (existing && existing !== path) throw new Error(`Conflicting glyph path for ${id}.`);
        sharedGlyphs.set(id, path);
        return '';
      },
    );
    body = body.replace(
      /<image id="(art-[a-z]+-(?:action|portrait|exhibition))"[^>]*\/>/g,
      (image, id: string) => {
        if (sharedArt.has(id) && sharedArt.get(id) !== image)
          throw new Error(`Conflicting artwork for ${id}.`);
        sharedArt.set(id, image);
        return '';
      },
    );
    const initialOpacity = page === 0 ? 1 : 0;
    return `<g class="carousel-page carousel-page-${page}" opacity="${initialOpacity}" aria-hidden="true"><svg x="0" y="0" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="presentation">${body}</svg></g>`;
  }).join('');
  const glyphDefinitions = [...sharedGlyphs]
    .map(([id, path]) => `<path id="${id}" d="${path}"/>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="carousel-title carousel-desc">
  <title id="carousel-title">${component.name} carousel</title>
  <desc id="carousel-desc">${count} pages cycle through this ${component.name.toLowerCase()} card. The first page remains visible when motion is reduced or disabled.</desc>
  ${sharedMetadata}
  <defs>${glyphDefinitions}${[...sharedArt.values()].join('')}</defs>
  <style>${styles}@media(prefers-reduced-motion:reduce){.carousel-page{animation:none!important;opacity:0!important}.carousel-page-0{opacity:1!important}}</style>
  ${pages}
</svg>`;
}
