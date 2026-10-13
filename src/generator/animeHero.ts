import { ProfileConfig, RenderOptions, ThemeMode } from '../types';
import { THEME_TOKENS } from '../data/defaultConfig';
import { characterColorway } from '../characters/colorways';
import { jersey } from './frame';
import {
  esc,
  glyphDefinitions,
  textBlock,
  textWidth,
  taglineCycle,
  TEXT_REVEAL_STYLES,
  nameRevealOptions,
  textFieldReveal,
  heroTaglines,
} from './text';
import { FONT_LICENSES } from './fonts/licenses';
import { heroBallEffects } from './heroEffects';
import { characterMotifGraphic } from './heroBackground';
import { CharacterId } from '../types';
import { layoutElement } from './layoutElements';
import { compileElementMotion } from '../fx/presets';
import { textElement as editableTextElement } from './textElements';

// Independent poster composition. The original Hero Banner renderer stays unchanged.
export function renderAnimeHeroSvg(
  c: ProfileConfig,
  theme: ThemeMode,
  options: RenderOptions = { layout: 'wide' },
): string {
  const compact = options.layout === 'compact',
    w = compact ? 400 : 800,
    h = 296;
  const colorway = characterColorway(
    c,
    options.context?.character.id ?? c.characterOverrides?.hero ?? c.character,
  );
  const p = `hero-anime${colorway === 'default' ? '' : `-${colorway}`}-${theme}-${options.layout}`,
    t = options.context?.tokens ?? THEME_TOKENS[theme];
  const dark = theme === 'dark',
    ink = t.animeInk;
  const animate = c.animationLevel !== 'none';
  const cycle = options.context?.timeline.cycleSeconds ?? 16;
  const elementMotion = compileElementMotion(c, 'hero', 'poster', options.layout, cycle, t.cyan);
  const typing = options.context?.fx.typing ?? 'sharp';
  const textArea = compact ? 226 : 416;
  const name = c.displayName || 'YOUR NAME';
  const textLayer = (
    element: Parameters<typeof editableTextElement>[4],
    x: number,
    y: number,
    body: string,
  ) => editableTextElement(c, options, 'hero', 'poster', element, x, y, body);
  const taglineValues = heroTaglines(c);
  const numberSize = compact ? 9 : 11;
  const numberLabel = `NO. ${c.jerseyNumber} / `;
  const numberWidth = Math.min(textArea * 0.4, textWidth(numberLabel, numberSize, 'bold'));
  const size = Math.min(
    compact ? 50 : 90,
    Math.max(compact ? 25 : 38, textArea / textWidth(name, 1, 'title')),
  );
  const text =
    textLayer(
      'hero-role',
      24,
      49,
      textBlock(c.role.toUpperCase(), 24, 49, textArea, compact ? 20 : 24, t.cyan, {
        weight: 800,
        maxLines: 1,
        reveal: textFieldReveal(c, 'role', c.role, cycle, { kind: typing, cycleSeconds: cycle }),
      }).svg,
    ) +
    textLayer(
      'hero-name',
      24,
      88 + size * 0.708,
      textBlock(name, 24, 88 + size * 0.708, textArea, size, ink, {
        weight: 900,
        maxLines: 2,
        lineHeight: size * 1.03,
        reveal: nameRevealOptions(c, typing, cycle, 0.2),
      }).svg,
    ) +
    textLayer(
      'hero-tagline',
      24,
      196,
      taglineCycle(taglineValues, 24, 196, textArea, compact ? 13 : 16, t.muted, {
        uid: options.context?.uid ?? `hero-anime-${theme}-${options.layout}`,
        cycleSeconds: cycle,
        typing,
        animate: animate && c.textEffects?.tagline?.effect !== 'none',
        reveal: textFieldReveal(c, 'tagline', taglineValues[0] ?? '', cycle, {
          kind: typing,
          cycleSeconds: cycle,
        }),
      }),
    ) +
    textLayer(
      'hero-jersey',
      24,
      225,
      textBlock(numberLabel, 24, 225, numberWidth, numberSize, t.cyan, {
        weight: 700,
        maxLines: 1,
        reveal: textFieldReveal(c, 'jersey', c.jerseyNumber, cycle),
      }).svg,
    ) +
    textLayer(
      'hero-position',
      24 + numberWidth,
      225,
      textBlock(c.positionName, 24 + numberWidth, 225, textArea - numberWidth, numberSize, t.cyan, {
        weight: 700,
        maxLines: 1,
        reveal: textFieldReveal(c, 'position', c.positionName, cycle),
      }).svg,
    );
  const ghost = textBlock(
    'STRIKER',
    14,
    282,
    compact ? 250 : 410,
    compact ? 68 : 124,
    t.animeGhost,
    { weight: 900, maxLines: 1 },
  ).svg.replace('class="text-line"', 'class="anime-ghost"');
  const cx = compact ? 333 : 643,
    cy = 152,
    artScale = compact ? 0.62 : 1;
  const shirtSize = compact ? 96 : 166;
  const shirt = jersey(
    cx - shirtSize / 2,
    cy - shirtSize / 2,
    shirtSize,
    c.jerseyNumber,
    t.royal,
    c.displayName,
    t,
  );
  const panelTop = w - (compact ? 118 : 310),
    panelBottom = w - (compact ? 146 : 370);
  const panel = `M${panelTop} 0H${w}V${h}H${panelBottom}Z`;
  const motif = characterMotifGraphic(options.context?.character.id ?? 'isagi', t);
  const ball = heroBallEffects(
    p,
    t,
    w,
    h,
    c.animationLevel,
    options.context?.fx,
    options.context?.timeline.cycleSeconds,
  );
  const auraMotion =
    c.animationLevel === 'none'
      ? ''
      : `animation:${p}-pulse ${c.animationLevel === 'full' ? 5 : 9}s ease-in-out infinite;`;
  const characterId = options.context?.character.id ?? 'isagi';
  const auraShapes: Record<CharacterId, string> = {
    isagi:
      'M-86 78C-109 45-76 20-87-9L-64 5C-75-30-48-41-55-84L-32-56C-18-100 7-94 17-120L34-74C62-91 57-48 78-52L69-19C107-34 78 5 104 33L78 33C90 69 57 99 18 104L-10 89C-39 113-68 96-86 78Z',
    bachira:
      'M-86 62C-116 27-69 8-83-26C-51-14-52-58-24-44C-1-85 22-56 31-92C55-55 89-78 80-40C119-19 77 8 104 30C75 40 94 82 59 82C37 115 5 81-16 105C-31 73-65 98-86 62Z',
    rin: 'M-94 67L-80 24L-91-20L-48-44L-33-91L4-64L40-110L49-58L96-44L78-1L105 36L60 53L38 100L-3 78L-44 107L-55 62Z',
    nagi: 'M-98 0A98 48 0 1 0 98 0A98 48 0 1 0-98 0ZM-62 0A62 30 0 1 1 62 0A62 30 0 1 1-62 0ZM-25 0A25 14 0 1 0 25 0A25 14 0 1 0-25 0Z',
    reo: 'M-72-44L-24-93L41-80L92-32L78 36L31 88L-40 74L-91 20Z M-47-34L-18-64L24-58L55-25L46 19L19 52L-27 45L-59 12Z',
    chigiri:
      'M-102 64L-70 35L-45 39L-16 7L15 15L48-20L78-12L105-44M-95 92L-58 59L-35 65L-2 32L28 39L60 5L88 12M-102 28L-80 8L-56 12L-33-14L-6-7L15-31L37-25',
    barou: 'M-92 56H91L78-22L39 8L7-96L-24 8L-64-22Z M-66 57V82H68V57',
    kaiser:
      'M-76 82L-33 21L-65-5L-18-28L-35-84L12-45L52-101L43-38L96-53L56-2L101 23L37 36L14 91L-27 52Z',
  };
  const aura = auraShapes[characterId];
  const textElement = layoutElement(
    c,
    options,
    'hero',
    'poster',
    'hero-identity',
    'Poster identity',
    24,
    49,
    text,
  );
  const shirtElement = layoutElement(
    c,
    options,
    'hero',
    'poster',
    'hero-shirt',
    'Jersey illustration',
    cx - shirtSize / 2,
    cy - shirtSize / 2,
    shirt,
  );
  const auraElement = layoutElement(
    c,
    options,
    'hero',
    'poster',
    'hero-aura',
    `${characterId} aura`,
    cx,
    cy,
    `<g transform="translate(${cx} ${cy}) scale(${artScale})" aria-hidden="true">
        <path d="${aura}" transform="translate(5 6)" fill="${t.animeShadow}" opacity=".72"/>
        <g class="anime-flame"><path d="${aura}" fill="url(#${p}-flame)" stroke="${t.animeFlameEdge}" stroke-width="2.8"/><path d="M-73 60Q-85 25-69 15L-76-16M-44-48L-43-72M18-91L27-62M71 5L84 25M63 76L35 86" stroke="${t.animeContour}" stroke-width="2" fill="none"/><path d="M-77 76L-65 58M-72 82L-60 64M-66 89L-53 68M58-43L47-24M65-37L54-18" stroke="${t.animeDeepAccent}" stroke-width="1.5" fill="none"/></g></g>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="${p}-title ${p}-desc">
    <title id="${p}-title">${esc(name)} — Manga Poster</title><desc id="${p}-desc">${esc(c.role)}. ${esc(c.egoTagline)}. Jersey ${esc(c.jerseyNumber)}. Manga poster with an inked flame aura.</desc>
    <metadata>${esc(FONT_LICENSES)}</metadata>
    <defs>
      ${glyphDefinitions(text + shirt + ghost)}${ball.defs}
      <clipPath id="${p}-frame"><rect width="${w}" height="${h}" rx="16"/></clipPath>
      <clipPath id="${p}-panel"><path d="${panel}"/></clipPath>
      <linearGradient id="${p}-paper" x2="0" y2="1"><stop stop-color="${t.animePaperStart}"/><stop offset="1" stop-color="${t.animePaperEnd}"/></linearGradient>
      <linearGradient id="${p}-blue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${t.animeBlueStart}"/><stop offset=".55" stop-color="${t.animeBlueMiddle}"/><stop offset="1" stop-color="${t.animeBlueEnd}"/></linearGradient>
      <linearGradient id="${p}-flame" x1="0" y1="1" x2=".7" y2="0"><stop stop-color="${t.animeFlameStart}"/><stop offset=".56" stop-color="${t.animeFlameMiddle}"/><stop offset="1" stop-color="${t.animeFlameEnd}"/></linearGradient>
      <pattern id="${p}-screentone" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${t.animePattern}" opacity=".32"/></pattern>
    </defs>
    <style>${TEXT_REVEAL_STYLES}${ball.styles}${elementMotion}
      .anime-flame{${auraMotion}transform-origin:0 0;}
      @keyframes ${p}-pulse{0%,100%{opacity:.82}50%{opacity:1}}
      @media(prefers-reduced-motion:reduce){.anime-flame,.tagline-cycle,.reveal-glyph,.text-reveal-long{animation:none!important}.reveal-glyph{opacity:1!important;filter:none!important}.text-reveal-long{clip-path:none!important}.tagline-cycle{visibility:hidden}.tagline-cycle-0{visibility:visible!important;opacity:1!important}}
    </style>
    <g clip-path="url(#${p}-frame)">
      <rect width="${w}" height="${h}" fill="url(#${p}-paper)"/>
      <g aria-hidden="true" opacity="${dark ? '.22' : '.15'}">${ghost}</g>
      <path d="${panel}" fill="url(#${p}-blue)"/>
      <g clip-path="url(#${p}-panel)" aria-hidden="true">
        <g transform="translate(${panelTop + (compact ? 18 : 42)} 28) scale(${compact ? 0.7 : 1.1})" opacity=".26">${motif}</g>
        <rect width="${w}" height="${h}" fill="url(#${p}-screentone)"/>
        <g stroke="${t.animeEdge}" fill="none" stroke-linecap="square" opacity=".7">
          <path d="M${w - 250} -10L${cx - 45} 99M${w - 210} -10L${cx - 30} 76M${w - 155} -10L${cx - 8} 63" stroke-width="3"/>
          <path d="M${w + 10} 32L${cx + 45} 107M${w + 10} 73L${cx + 72} 125M${w + 10} 245L${cx + 65} 198M${w - 19} 306L${cx + 26} 232" stroke-width="4"/>
        </g>
        <path d="M${panelBottom - 10} 271L${w} 238V${h}H${panelBottom - 18}Z" fill="${t.animePattern}"/>
        <path d="M${panelBottom + 24} 264L${w - 12} 239M${panelBottom + 36} 275L${w - 24} 249" stroke="${t.animeSpeed}" stroke-width="1.4" opacity=".8"/>
      </g>
      <path d="M${panelTop} 0L${panelBottom} ${h}" stroke="${t.animeStroke}" stroke-width="5"/>
      <path d="M${panelTop + 7} 0L${panelBottom + 7} ${h}" stroke="${t.animeHighlight}" stroke-width="1.3" opacity=".65"/>
      ${auraElement}
      ${shirtElement}
      ${ball.svg}
      <path d="M24 64H${compact ? 107 : 128}" stroke="${t.cyan}" stroke-width="2.5"/>
      ${textElement}
    </g>
    <rect x=".75" y=".75" width="${w - 1.5}" height="${h - 1.5}" rx="16" fill="none" stroke="${t.cardBorder}" stroke-width="1.5"/>
  </svg>`;
}
