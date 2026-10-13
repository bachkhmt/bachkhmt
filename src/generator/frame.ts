import {
  ProfileConfig,
  ThemeMode,
  RenderOptions,
  ComponentId,
  RenderContext,
  ColorTokens,
} from '../types';
import { THEME_TOKENS } from '../data/defaultConfig';
import { esc, textBlock, glyphDefinitions, TEXT_REVEAL_STYLES, textFieldReveal } from './text';
import { textElement } from './textElements';
import { FONT_LICENSES } from './fonts/licenses';
import { heroBallEffects } from './heroEffects';
import { characterMotifGraphic, heroBackground } from './heroBackground';
import { compileElementMotion } from '../fx/presets';
import { layoutElement } from './layoutElements';
import { DEFAULT_CARD_TEMPLATE } from '../templates/registry';
import { resolveHeroColors } from '../characters/heroColors';
import { characterColorway, colorwaySuffix } from '../characters/colorways';

export const widthFor = (o: RenderOptions, id?: ComponentId) =>
  o.layout === 'compact' ? 400 : id === 'tech-pitch' ? 500 : 800;

export function frame(
  id: ComponentId,
  config: ProfileConfig,
  theme: ThemeMode,
  options: RenderOptions,
  height: number,
  title: string,
  subtitle: string,
  body: string,
  context?: RenderContext,
): string {
  const w = widthFor(options, id),
    t = context?.tokens ?? THEME_TOKENS[theme],
    template =
      context?.template ??
      options.template ??
      config.cardTemplates?.[id] ??
      DEFAULT_CARD_TEMPLATE[id],
    prefix = `${id}${colorwaySuffix(characterColorway(config, context?.character.id ?? config.characterOverrides?.[id] ?? config.character)).replace('.', '-')}-${theme}-${options.layout}`,
    hero = id === 'hero';
  const motion = config.animationLevel;
  const customBackground =
    hero &&
    resolveHeroColors(
      config,
      template,
      context?.character.id ?? config.characterOverrides?.hero ?? config.character,
      theme,
    ).overrides.background;
  const animate = motion !== 'none';
  const cycle = context?.timeline.cycleSeconds ?? 16;
  const heading = textBlock(
    hero ? config.role : title,
    24,
    hero ? 54 : 38,
    w - 48,
    hero ? (options.layout === 'compact' ? 22 : 26) : options.layout === 'compact' ? 19 : 21,
    hero ? t.cyan : t.ink,
    {
      weight: 800,
      maxLines: 1,
      reveal: hero
        ? textFieldReveal(config, 'role', config.role, cycle, {
            kind: context?.fx.typing ?? 'sharp',
            delay: 0.12,
            cycleSeconds: cycle,
          })
        : animate
          ? { kind: context?.fx.typing ?? 'sharp', delay: 0.12, cycleSeconds: cycle }
          : undefined,
    },
  );
  const sub = textBlock(hero ? '' : subtitle, 24, 60, w - 48, 11, t.muted, { maxLines: 1 });
  const full = motion === 'full' || motion === 'cinematic';
  const introPercent = ((context?.timeline.introSeconds ?? 2) / cycle) * 100;
  const holdPercent =
    context?.timeline.keyTimes[2] !== undefined ? context.timeline.keyTimes[2] * 100 : 92;
  const intro = context?.fx.intro ?? 'scan';
  const introRules: Record<string, string> = {
    scan: `@keyframes motif-scan{0%{transform:translateX(-18px);opacity:0} ${introPercent}%{transform:translateX(0);opacity:.22} ${holdPercent}%,100%{transform:translateX(0);opacity:.22}}`,
    ink: `@keyframes motif-ink{0%{transform:scale(.25);opacity:0} ${introPercent}%{transform:scale(1.08);opacity:.26} ${introPercent + 2}%{transform:scale(1);opacity:.22} ${holdPercent}%,100%{transform:scale(1);opacity:.22}}`,
    ice: `@keyframes motif-ice{0%{opacity:0;filter:blur(5px)} ${introPercent}%{opacity:.22;filter:blur(0)} ${holdPercent}%,100%{opacity:.22;filter:blur(0)}}`,
    drift: `@keyframes motif-drift{0%{transform:translateY(-8px);opacity:0} ${introPercent}%{transform:translateY(0);opacity:.22} ${holdPercent}%,100%{transform:translateY(0);opacity:.22}}`,
    chroma: `@keyframes motif-chroma{0%{opacity:0;filter:hue-rotate(0deg)} ${introPercent}%{opacity:.24;filter:hue-rotate(110deg)} ${introPercent + 3}%{opacity:.22;filter:hue-rotate(0deg)} ${holdPercent}%,100%{opacity:.22;filter:hue-rotate(0deg)}}`,
    speed: `@keyframes motif-speed{0%{transform:translateX(24px) skewX(-12deg);opacity:0} ${introPercent}%{transform:translateX(0) skewX(0);opacity:.22} ${holdPercent}%,100%{transform:translateX(0);opacity:.22}}`,
    crown: `@keyframes motif-crown{0%{transform:translateY(-18px);opacity:0} ${introPercent}%{transform:translateY(0);opacity:.22} ${holdPercent}%,100%{transform:translateY(0);opacity:.22}}`,
    lightning: `@keyframes motif-lightning{0%{opacity:0} ${introPercent}%{opacity:.7} ${introPercent + 1}%{opacity:.12} ${introPercent + 3}%{opacity:.22} ${holdPercent}%,100%{opacity:.22}}`,
  };
  const ball = hero
    ? heroBallEffects(prefix, t, w, height, motion, context?.fx, context?.timeline.cycleSeconds)
    : undefined;
  const anime = hero ? heroBackground(config, theme, w, height, t, context?.character) : undefined;
  const skinMotif =
    !hero && context?.character
      ? (() => {
          const placement = context.character.skin.motifPlacement;
          const x = placement === 'watermark' ? w * 0.62 : placement === 'edge' ? 8 : w - 72;
          const y =
            placement === 'watermark' ? height * 0.55 : placement === 'edge' ? height * 0.42 : 9;
          const scale = placement === 'watermark' ? 2.2 : placement === 'edge' ? 0.9 : 0.82;
          const motif = `<g transform="translate(${x} ${y}) scale(${scale})"><g data-component-motif="${context.character.id}" class="character-motif skin-motif-${placement}">${characterMotifGraphic(context.character.id, t)}</g></g>`;
          return layoutElement(
            config,
            options,
            id,
            template,
            'character-motif',
            `${context.character.name} motif`,
            x,
            y,
            motif,
          );
        })()
      : '';
  const headingGroup = layoutElement(
    config,
    options,
    id,
    template,
    `${id}-heading`,
    'Card heading and subtitle',
    24,
    hero ? 54 : 38,
    (hero
      ? textElement(config, options, id, template, 'hero-role', 24, 54, heading.svg)
      : heading.svg) + sub.svg,
  );
  const ballGroup = ball?.svg
    ? layoutElement(
        config,
        options,
        id,
        template,
        `${id}-ball-stage`,
        'Football animation stage',
        0,
        0,
        ball.svg,
      )
    : '';
  const elementMotion = context
    ? compileElementMotion(config, id, context.template, options.layout, cycle, t.cyan)
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${height}" width="${w}" height="${height}" role="img" aria-labelledby="${prefix}-title ${prefix}-desc">
  <title id="${prefix}-title">${esc(title)}</title><desc id="${prefix}-desc">${esc(subtitle)}. ${Array.from(body.matchAll(/data-text="([^"]*)"/g), (m) => m[1]).join('. ')}</desc>
  <metadata>${esc(FONT_LICENSES)}</metadata>
  <defs>
    ${glyphDefinitions(heading.svg + sub.svg + body + (anime?.svg ?? ''))}
    ${
      hero
        ? `<linearGradient id="${prefix}-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop stop-color="${t.heroBgStart}"/><stop offset="45%" stop-color="${t.heroBgMiddle}"/><stop offset="100%" stop-color="${t.heroBgEnd}"/></linearGradient>
    <pattern id="${prefix}-halftone" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${t.cyan}" fill-opacity=".055"/><circle cx="8" cy="8" r="1.1" fill="${t.cyan}" fill-opacity=".055"/></pattern>
    <radialGradient id="${prefix}-vignette" cx="50%" cy="50%" r="70%"><stop stop-color="${t.cyan}" stop-opacity=".22"/><stop offset="60%" stop-color="${t.cyan}" stop-opacity=".04"/><stop offset="100%" stop-color="${t.heroVignette}" stop-opacity="${theme === 'dark' ? '.85' : '.2'}"/></radialGradient>`
        : `<linearGradient id="${prefix}-bg" x2="1" y2="1"><stop stop-color="${t.deep}"/><stop offset="1" stop-color="${t.navy}"/></linearGradient>`
    }
    ${ball?.defs ?? ''}
    <pattern id="${prefix}-grid" width="${hero ? 20 : 32}" height="${hero ? 20 : 32}" patternUnits="userSpaceOnUse"><path d="M${hero ? 20 : 32} 0H0V${hero ? 20 : 32}" fill="none" stroke="${hero ? t.heroGridLine : t.pitchLine}" stroke-width="${hero ? '.75' : '.5'}" opacity="${hero ? '.22' : '.35'}"/></pattern>
    <radialGradient id="${prefix}-aura"><stop stop-color="${t.cyan}" stop-opacity=".2"/><stop offset="1" stop-color="${t.cyan}" stop-opacity="0"/></radialGradient>
    <clipPath id="${prefix}-clip"><rect width="${w}" height="${height}" rx="16"/></clipPath>
  </defs>
  <style>
    ${TEXT_REVEAL_STYLES}
    .aura{${animate && !hero ? 'animation:breathe 7s ease-in-out infinite;' : ''}}
    .puzzle{${full && !hero ? 'animation:float 12s ease-in-out infinite;' : ''}}
    .sweep{${full && !hero ? 'animation:sweep 9s ease-in-out infinite;' : ''}}
    ${ball?.styles ?? ''}
    .reveal{transform-box:fill-box;transform-origin:left;${animate ? `animation:reveal ${cycle}s linear infinite;` : ''}}
    .runner{${full ? 'display:inline;' : 'display:none;'}}
    .character-motif{opacity:.22;${animate ? `animation:motif-${intro} ${cycle}s ease-out infinite;` : ''}}
    .skin-motif-watermark{opacity:.055!important}.skin-motif-edge{opacity:.18!important}
    .skin-bar-segmented{stroke-dasharray:8 3;stroke-linecap:butt}
    .skin-bar-speed{stroke-dasharray:14 2;stroke-linecap:square}
    .skin-bar-crack{stroke-dasharray:9 2 3 2;stroke-linecap:square}
    .skin-bar-ink{stroke-dasharray:5 2;stroke-linecap:round}
    .goal-flash{transform-box:fill-box;transform-origin:center;${full ? `animation:goal-flash ${cycle}s ease-in-out infinite;` : ''}}
    .mini-ball{transform-box:fill-box;transform-origin:center;${full ? `animation:mini-ball-bounce ${cycle}s ease-in-out infinite;` : ''}}
    @keyframes breathe{50%{opacity:.55}}
    @keyframes float{50%{transform:translateY(-4px)}}
    @keyframes sweep{0%,70%,100%{opacity:.12}80%{opacity:.5}}
    @keyframes reveal{0%{transform:scaleX(.08)}${introPercent}%{transform:scaleX(1)}${holdPercent}%,100%{transform:scaleX(1)}}
    ${introRules[intro]}
    @keyframes mini-ball-bounce{0%,78%,100%{transform:translateY(0) scale(1,1)}80%{transform:translateY(-5px) scale(.92,1.12)}82%{transform:translateY(0) scale(1.15,.82)}86%{transform:translateY(-1px) scale(1,1)}}
    @keyframes goal-flash{0%,84%,100%{opacity:.4;transform:scale(.86)}86%{opacity:.9;transform:scale(1.12)}88%{opacity:.5;transform:scale(1)}}
    ${elementMotion}
    @media(prefers-reduced-motion:reduce){.aura,.puzzle,.sweep,.reveal,.runner,.character-motif,.mini-ball,.goal-flash,.text-reveal-typewriter .reveal-glyph,.text-reveal-sharp .reveal-glyph,.text-reveal-stagger .reveal-glyph,.text-reveal-lazy .reveal-glyph,.text-reveal-blur-in .reveal-glyph,.text-reveal-slam .reveal-glyph,.text-reveal-glitch .reveal-glyph,.text-reveal-slide .reveal-glyph,.text-reveal-hue .reveal-glyph,.text-reveal-long{animation:none!important}.runner{display:none}.reveal{transform:none}.character-motif{opacity:.22;transform:none;filter:none}.reveal-glyph{opacity:1!important;filter:none!important}.text-reveal-long{clip-path:none!important}}
  </style>
  <g clip-path="url(#${prefix}-clip)">
    <rect width="${w}" height="${height}" rx="16" fill="url(#${prefix}-bg)"/>
    <rect width="${w}" height="${height}" fill="url(#${prefix}-grid)"/>
    ${
      hero
        ? `<rect width="${w}" height="${height}" fill="url(#${prefix}-halftone)"/>${customBackground ? '' : `<rect width="${w}" height="${height}" fill="url(#${prefix}-vignette)"/>`}${anime?.svg ?? ''}`
        : ''
    }
    ${skinMotif}
    <path d="M${w - 125} 0L${w - 50} 0L${w - 125} 76H${w - 200}Z" fill="${t.royal}" opacity=".12"/>
    ${ballGroup}
    ${headingGroup}
    <path d="M24 73H${w - 24}" stroke="${t.cardBorder}"/><path d="M24 73H84" stroke="${t.cyan}" stroke-width="3"/>
    ${body}
  </g>
  <rect x=".75" y=".75" width="${w - 1.5}" height="${height - 1.5}" rx="16" fill="none" stroke="${t.cardBorder}" stroke-width="1.5"/>
  </svg>`;
}

export function jersey(
  x: number,
  y: number,
  size: number,
  number: string,
  color: string,
  name: string,
  tokens: ColorTokens = THEME_TOKENS.dark,
): string {
  const shape = 'M25 8L38 0Q50 10 62 0L75 8L100 27L84 48L75 42V97Q50 103 25 97V42L16 48L0 27Z';
  return `<g transform="translate(${x} ${y}) scale(${size / 100})">
    <path d="${shape}" fill="${tokens.jerseyShadow}" transform="translate(2 3)" opacity=".4"/>
    <path d="${shape}" fill="${color}" stroke="${tokens.jerseyTrim}" stroke-width=".6"/>
    <path d="M38 1L42 12H58L62 1L57 5H43Z" fill="${tokens.jerseyShade}"/>
    <path d="M25 9L35 13L32 95H25V42L16 48L11 40Z M75 9L65 13L68 95H75V42L84 48L89 40Z" fill="${tokens.jerseyPanel}" opacity=".9"/>
    <path d="M35 15L47 27L43 97H32Z M65 15L53 27L57 97H68Z" fill="${tokens.jerseyHighlight}" opacity=".13"/>
    <path d="M6 25L21 36M79 36L94 25M27 20L30 42M73 20L70 42M30 92Q50 97 70 92" fill="none" stroke="${tokens.jerseyLine}" stroke-width="1" opacity=".55"/>
    <path d="M42 17H58L55 23H45Z" fill="${tokens.jerseyAccent}"/>
    ${textBlock(name.toLocaleUpperCase(), 50, 34, 44, 5.8, tokens.jerseyName, { anchor: 'middle', weight: 800, maxLines: 1 }).svg}
    ${textBlock(number, 50, 75, 46, 42, tokens.ballLight, { anchor: 'middle', weight: 900, maxLines: 1 }).svg}
    <path d="M38 82L34 91M62 82L66 91" stroke="${tokens.jerseySeam}" opacity=".5" stroke-width="1.4"/>
  </g>`;
}
