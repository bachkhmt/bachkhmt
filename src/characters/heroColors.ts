import {
  CharacterId,
  ColorTokens,
  HeroColorField,
  HeroColors,
  ProfileConfig,
  ThemeMode,
} from '../types';
import { resolveCharacterPalette } from './colorways';

export const HERO_COLOR_FIELDS: Record<string, readonly HeroColorField[]> = {
  classic: ['background', 'accent', 'text'],
  poster: ['background', 'surface', 'accent', 'text'],
  'volume-cover': ['background', 'surface', 'accent', 'text'],
  'egoist-poster': ['background', 'surface', 'accent', 'text'],
};
export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
export const heroColorKey = (
  template: string,
  character: CharacterId,
  mode: ThemeMode,
  colorway = 'default',
) => `${template}:${character}:${mode}${colorway === 'default' ? '' : `:${colorway}`}`;

/** Resolve a scoped palette without changing shared character tokens or PNG artwork. */
export function resolveHeroColors(
  config: ProfileConfig,
  template: string,
  character: CharacterId,
  mode: ThemeMode,
) {
  const palette = resolveCharacterPalette(config, character, mode);
  const base = palette.tokens;
  const cover = template === 'volume-cover' || template === 'egoist-poster';
  const defaults: HeroColors = {
    background: cover
      ? 'background' in palette.cover
        ? (palette.cover.background as string)
        : palette.cover.accent
      : template === 'poster'
        ? base.animeBlueMiddle
        : base.heroBgMiddle,
    surface:
      cover && palette.colorway === 'deep-blue'
        ? base.cardBg
        : cover
          ? mode === 'dark'
            ? '#141820'
            : '#fffaf2'
          : template === 'poster'
            ? base.animePaperStart
            : base.heroBgMiddle,
    accent: cover && mode === 'dark' ? palette.cover.accent : base.cyan,
    text:
      cover && palette.colorway === 'deep-blue'
        ? base.ink
        : cover
          ? mode === 'dark'
            ? '#f8f6ef'
            : '#17212d'
          : template === 'poster'
            ? base.animeInk
            : base.ink,
  };
  const key = heroColorKey(template, character, mode, palette.colorway);
  const fields = Object.hasOwn(HERO_COLOR_FIELDS, template) ? HERO_COLOR_FIELDS[template] : [];
  const overrides: Partial<HeroColors> = {};
  for (const field of fields) {
    const value = config.heroColorOverrides?.[key]?.[field];
    if (isHexColor(value)) overrides[field] = value.toUpperCase();
  }
  const colors = { ...defaults, ...overrides };
  const muted =
    overrides.text ??
    (cover && palette.colorway === 'default'
      ? mode === 'dark'
        ? '#b9c3d0'
        : '#4d5968'
      : base.muted);
  const tokens: ColorTokens = { ...base };
  if (overrides.background) {
    if (template === 'classic')
      tokens.heroBgStart = tokens.heroBgMiddle = tokens.heroBgEnd = overrides.background;
    if (template === 'poster')
      tokens.animeBlueStart = tokens.animeBlueMiddle = tokens.animeBlueEnd = overrides.background;
  }
  if (overrides.surface && template === 'poster')
    tokens.animePaperStart = tokens.animePaperEnd = overrides.surface;
  if (overrides.accent) {
    tokens.cyan = tokens.teal = tokens.accent2 = tokens.glow = overrides.accent;
    if (template === 'poster')
      tokens.animeFlameStart = tokens.animeFlameMiddle = tokens.animeFlameEnd = overrides.accent;
  }
  if (overrides.text) tokens.ink = tokens.animeInk = tokens.muted = overrides.text;
  const textBackgrounds = cover
    ? [colors.surface]
    : template === 'poster'
      ? [tokens.animePaperStart, tokens.animePaperEnd]
      : [tokens.heroBgStart, tokens.heroBgMiddle, tokens.heroBgEnd];
  return { key, fields, defaults, overrides, colors, muted, tokens, textBackgrounds };
}

export function contrastRatio(first: string, second: string): number {
  const luminance = (hex: string) =>
    hex
      .slice(1)
      .match(/../g)!
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
export function readableHeroText(backgrounds: string[]): string {
  const score = (color: string) => Math.min(...backgrounds.map((bg) => contrastRatio(color, bg)));
  return score('#000000') >= score('#FFFFFF') ? '#000000' : '#FFFFFF';
}
