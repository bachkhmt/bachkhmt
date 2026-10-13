import { CharacterColorway, CharacterId, ColorTokens, ProfileConfig, ThemeMode } from '../types';
import { getCharacterTheme } from './themes';
import { COVER_COLORS } from '../artwork/colors';

export const COLORWAY_LABELS: Record<CharacterColorway, string> = {
  default: 'Default',
  'deep-blue': 'Deep Blue',
};
export function characterColorway(
  config: ProfileConfig,
  character: CharacterId,
): CharacterColorway {
  return character === 'isagi' ? (config.characterColorways?.isagi ?? 'default') : 'default';
}
export const validCharacterColorway = (character: string, colorway: unknown) =>
  colorway === 'default' || (character === 'isagi' && colorway === 'deep-blue');
export const colorwaySuffix = (colorway: CharacterColorway = 'default') =>
  colorway === 'default' ? '' : `.${colorway}`;

export const DEEP_BLUE_CONTRIBUTIONS: Record<ThemeMode, readonly string[]> = {
  dark: ['#1C273B', '#233D72', '#2D5BA8', '#3E83DF', '#83BBFF'],
  light: ['#E8EEF7', '#B9D3F7', '#79A7EA', '#3A70C4', '#1B3C80'],
};
export const contributionLevel = (count: number) =>
  count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4;

/** PNG artwork stays original; only vector palettes change with a colorway. */
export function resolveCharacterPalette(
  config: ProfileConfig,
  character: CharacterId,
  mode: ThemeMode,
) {
  const colorway = characterColorway(config, character);
  const base = getCharacterTheme(character).tokens[mode];
  if (colorway === 'default')
    return { colorway, tokens: base, cover: COVER_COLORS[character], contributions: undefined };
  const dark = mode === 'dark';
  const accent = dark ? '#83BBFF' : '#1B3C80';
  const tokens: ColorTokens = {
    ...base,
    deep: dark ? '#080F24' : '#F4F7FD',
    navy: dark ? '#101C36' : '#E2EAF8',
    cardBg: dark ? '#101C36' : '#FFFFFF',
    cardBorder: dark ? '#29446E' : '#C0CEE5',
    ink: dark ? '#F3F7FF' : '#12203B',
    muted: dark ? '#AABAD5' : '#4C6080',
    royal: dark ? '#83BBFF' : '#1B3C80',
    cyan: accent,
    teal: accent,
    accent2: accent,
    glow: accent,
    pitchGreen: dark ? '#101C36' : '#E8EEF7',
    pitchLine: dark ? '#5075AA' : '#7799C4',
    heroInk: '#1B3C80',
    jerseyBase: '#1A3D9B',
    heroBgStart: dark ? '#142951' : '#DCE7FA',
    heroBgMiddle: dark ? '#080F24' : '#F4F7FD',
    heroBgEnd: dark ? '#040916' : '#E8EEF7',
    heroGridLine: dark ? '#29446E' : '#C0CEE5',
    animeInk: dark ? '#F3F7FF' : '#12203B',
    animeGhost: dark ? '#29446E' : '#7799C4',
    animePaperStart: dark ? '#101C36' : '#FFFFFF',
    animePaperEnd: dark ? '#080F24' : '#E8EEF7',
    animeBlueStart: '#142951',
    animeBlueMiddle: '#1B3C80',
    animeBlueEnd: '#10172B',
    animeFlameStart: '#1B3C80',
    animeFlameMiddle: '#3E83DF',
    animeFlameEnd: '#83BBFF',
    animePattern: '#080F24',
    animeEdge: '#10172B',
    animeFlameEdge: '#10172B',
    animeStroke: '#080F24',
    animeHighlight: '#83BBFF',
    animeShadow: '#080F24',
    animeContour: '#C9E0FF',
    animeDeepAccent: '#1B3C80',
    animeSpeed: '#83BBFF',
    seasonLevel1: DEEP_BLUE_CONTRIBUTIONS[mode][1],
    seasonLevel2: DEEP_BLUE_CONTRIBUTIONS[mode][2],
  };
  return {
    colorway,
    tokens,
    cover: { ...COVER_COLORS[character], accent, shade: '#142951', background: '#1B3C80' },
    contributions: DEEP_BLUE_CONTRIBUTIONS[mode],
  };
}
