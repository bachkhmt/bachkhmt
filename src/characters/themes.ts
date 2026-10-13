import { CharacterId, CharacterTheme, ColorTokens, ThemeMode } from '../types';
import { CHARACTER_SKINS } from './skins';

type AccentPalette = Pick<
  ColorTokens,
  'royal' | 'cyan' | 'teal' | 'crimson' | 'signal' | 'accent2' | 'glow' | 'heroInk' | 'jerseyBase'
>;

const surfaces: Record<ThemeMode, Pick<ColorTokens, 'deep' | 'navy' | 'ink' | 'muted' | 'pitchGreen' | 'pitchLine' | 'cardBg' | 'cardBorder'>> = {
  dark: {
    deep: '#060b18',
    navy: '#0d1933',
    ink: '#f3f6ff',
    muted: '#a7b6cf',
    pitchGreen: '#0a2030',
    pitchLine: '#315467',
    cardBg: '#0f1c34',
    cardBorder: '#283b56',
  },
  light: {
    deep: '#f2f6ff',
    navy: '#dde8fb',
    ink: '#14213d',
    muted: '#4d6080',
    pitchGreen: '#e4f0f2',
    pitchLine: '#9ab7bf',
    cardBg: '#ffffff',
    cardBorder: '#bfcee3',
  },
};

const defaultAccents: Record<ThemeMode, AccentPalette> = {
  dark: {
    royal: '#7187ff',
    cyan: '#5de5ff',
    teal: '#73f5c4',
    crimson: '#ff5677',
    signal: '#ffda76',
    accent2: '#73f5c4',
    glow: '#5de5ff',
    heroInk: '#3154A8',
    jerseyBase: '#536dfe',
  },
  light: {
    royal: '#334dd1',
    cyan: '#00738c',
    teal: '#087858',
    crimson: '#bf2548',
    signal: '#805600',
    accent2: '#087858',
    glow: '#00738c',
    heroInk: '#7C9BCC',
    jerseyBase: '#334dd1',
  },
};

const accents: Record<CharacterId, Record<ThemeMode, AccentPalette>> = {
  isagi: defaultAccents,
  bachira: {
    dark: { royal: '#a66cff', cyan: '#ffd166', teal: '#a9f26c', crimson: '#ff6b35', signal: '#ffe08a', accent2: '#ff9f1c', glow: '#ffd166', heroInk: '#7444c7', jerseyBase: '#7c4dce' },
    light: { royal: '#6f35b5', cyan: '#885000', teal: '#347000', crimson: '#b53b16', signal: '#805600', accent2: '#a64f00', glow: '#8b4a00', heroInk: '#9b78c8', jerseyBase: '#6f35b5' },
  },
  rin: {
    dark: { royal: '#54b8c7', cyan: '#a8f4f5', teal: '#63e1c1', crimson: '#ff6582', signal: '#d7f4ff', accent2: '#b7e6ef', glow: '#9df8ff', heroInk: '#367f96', jerseyBase: '#247b91' },
    light: { royal: '#176d82', cyan: '#146b76', teal: '#087858', crimson: '#bf2548', signal: '#526775', accent2: '#236e81', glow: '#176d82', heroInk: '#79a9b2', jerseyBase: '#176d82' },
  },
  nagi: {
    dark: { royal: '#b4a4d5', cyan: '#d9d0f0', teal: '#a4e6dd', crimson: '#ff7187', signal: '#e2d8ff', accent2: '#c6bddb', glow: '#d9d0f0', heroInk: '#8876aa', jerseyBase: '#77718f' },
    light: { royal: '#665881', cyan: '#5e557e', teal: '#087858', crimson: '#bf2548', signal: '#805600', accent2: '#665881', glow: '#665881', heroInk: '#9b91ad', jerseyBase: '#665881' },
  },
  reo: {
    dark: { royal: '#bd75ff', cyan: '#e5a6ff', teal: '#66e0c2', crimson: '#ff6582', signal: '#f7d07a', accent2: '#83e1f5', glow: '#da85ff', heroInk: '#7947ad', jerseyBase: '#8b4fc2' },
    light: { royal: '#7136a3', cyan: '#792d8a', teal: '#087858', crimson: '#bf2548', signal: '#805600', accent2: '#226d84', glow: '#7136a3', heroInk: '#a781c0', jerseyBase: '#7136a3' },
  },
  chigiri: {
    dark: { royal: '#ff5270', cyan: '#ffb3c1', teal: '#72e9c7', crimson: '#ff4561', signal: '#ffd166', accent2: '#ffd166', glow: '#ff667d', heroInk: '#a83a56', jerseyBase: '#c63355' },
    light: { royal: '#af2948', cyan: '#96324b', teal: '#087858', crimson: '#b31e3d', signal: '#805600', accent2: '#8b5400', glow: '#a62947', heroInk: '#c27c8b', jerseyBase: '#af2948' },
  },
  barou: {
    dark: { royal: '#e6b63d', cyan: '#ffd96b', teal: '#7de4bb', crimson: '#ff5b77', signal: '#ffe19a', accent2: '#b83347', glow: '#ffd96b', heroInk: '#927122', jerseyBase: '#a77b1d' },
    light: { royal: '#7c5700', cyan: '#795300', teal: '#087858', crimson: '#a8233e', signal: '#805600', accent2: '#9f2539', glow: '#805600', heroInk: '#aa914f', jerseyBase: '#7c5700' },
  },
  kaiser: {
    dark: { royal: '#7592ff', cyan: '#78baff', teal: '#72e9c7', crimson: '#ff5b77', signal: '#f6cc55', accent2: '#f6cc55', glow: '#ffd95e', heroInk: '#3154A8', jerseyBase: '#2549ad' },
    light: { royal: '#2549ad', cyan: '#145f9e', teal: '#087858', crimson: '#bf2548', signal: '#805600', accent2: '#805600', glow: '#805600', heroInk: '#7893c9', jerseyBase: '#2549ad' },
  },
};

function tokensFor(id: CharacterId, mode: ThemeMode): ColorTokens {
  const base = surfaces[mode];
  const color = accents[id][mode];
  const isagi = id === 'isagi';
  return {
    ...base,
    ...color,
    jerseyTrim: isagi ? (mode === 'dark' ? '#90c8ff' : '#90c8ff') : color.cyan,
    jerseyShadow: '#020b21',
    jerseyShade: '#06172e',
    jerseyPanel: '#081938',
    jerseyHighlight: isagi ? '#95c9ff' : color.cyan,
    jerseyLine: '#d0e6ff',
    jerseyAccent: isagi ? '#b7eaff' : color.glow,
    jerseyName: isagi ? '#e0f1ff' : color.cyan,
    jerseySeam: '#041c47',
    heroBgStart: isagi ? (mode === 'dark' ? '#070E2D' : '#DCE6FF') : mode === 'dark' ? base.navy : base.deep,
    heroBgMiddle: isagi ? (mode === 'dark' ? '#040716' : '#F1F5FF') : mode === 'dark' ? base.deep : '#ffffff',
    heroBgEnd: isagi ? (mode === 'dark' ? '#02030A' : '#E2E8F0') : mode === 'dark' ? base.deep : base.navy,
    heroGridLine: isagi ? (mode === 'dark' ? '#1E3A8A' : '#CBD5E1') : mode === 'dark' ? color.royal : base.cardBorder,
    heroVignette: '#000',
    animeInk: isagi ? (mode === 'dark' ? '#F7FAFF' : '#0A1736') : base.ink,
    animeGhost: isagi ? (mode === 'dark' ? '#3153A0' : '#6686D3') : color.heroInk,
    animePaperStart: isagi ? (mode === 'dark' ? '#0B1430' : '#FCFDFF') : base.cardBg,
    animePaperEnd: isagi ? (mode === 'dark' ? '#030819' : '#E6ECFC') : base.deep,
    animeBlueStart: isagi ? '#1339BB' : color.royal,
    animeBlueMiddle: isagi ? '#285CF0' : color.cyan,
    animeBlueEnd: isagi ? '#102980' : color.royal,
    animeFlameStart: isagi ? '#1651D8' : color.royal,
    animeFlameMiddle: isagi ? '#1EB8EF' : color.cyan,
    animeFlameEnd: isagi ? '#C0FBFF' : color.glow,
    animePattern: isagi ? '#030B25' : base.deep,
    animeEdge: isagi ? '#061334' : base.navy,
    animeFlameEdge: isagi ? '#061534' : base.navy,
    animeStroke: isagi ? '#020A20' : base.deep,
    animeHighlight: isagi ? '#A1EFFF' : color.glow,
    animeShadow: isagi ? '#020C2B' : base.deep,
    animeContour: isagi ? '#C6FCFF' : color.glow,
    animeDeepAccent: isagi ? '#0A3C96' : color.royal,
    animeSpeed: isagi ? '#6ADFFF' : color.cyan,
    ballLight: '#FFFFFF',
    ballSoft: '#F8FAFC',
    ballMid: '#E2E8F0',
    ballEdge: '#94A3B8',
    ballDark: '#0B132B',
    ballShadowSoft: '#0F172A',
    ballShadow: '#020617',
    ballSeamLight: '#334155',
    ballSeam: '#1E293B',
    ballOutline: '#070D1E',
    ballShadowFill: '#000',
    ballHighlight: '#fff',
    ballOutlineLight: '#132239',
    seasonLevel1: isagi
      ? mode === 'dark' ? '#155064' : '#bedee2'
      : mode === 'dark' ? color.royal : color.cyan,
    seasonLevel2: isagi
      ? mode === 'dark' ? '#197d93' : '#80bfc9'
      : mode === 'dark' ? color.cyan : color.royal,
  };
}

const definitions: Omit<CharacterTheme, 'tokens' | 'skin'>[] = [
  {
    id: 'isagi', name: 'Yoichi Isagi', label: 'ISAGI / METAVISION', motif: 'self-drawn vision grid and target lines',
    fx: { ball: 'drop-bounce-roll', restitution: 0.32, impact: 'ring', intro: 'scan', typing: 'sharp' },
    copy: { positionName: 'METAVISION PLAYMAKER', favoriteClub: 'BASTARD MÜNCHEN', jerseyNumber: '11', egoWeapon: 'Spatial Awareness × Direct Volley', nelRank: 'RANK #1 · S-TIER 98', currentBid: '¥300,000,000' },
  },
  {
    id: 'bachira', name: 'Meguru Bachira', label: 'BACHIRA / FLOW', motif: 'self-drawn ink drops and playful blobs',
    fx: { ball: 'zigzag', restitution: 0.48, impact: 'ink', intro: 'ink', typing: 'stagger' },
    copy: { positionName: 'CREATIVE PLAYMAKER', favoriteClub: 'FC BARCHA', jerseyNumber: '08', egoWeapon: 'Monster Dribble × Ego Dance', nelRank: 'RANK #5 · A-TIER 89', currentBid: '¥140,000,000' },
  },
  {
    id: 'rin', name: 'Rin Itoshi', label: 'RIN / PRECISION', motif: 'self-drawn ice facets and curved shot lines',
    fx: { ball: 'curve', restitution: 0.28, impact: 'shock', intro: 'ice', typing: 'blur-in' },
    copy: { positionName: 'PRECISION STRIKER', favoriteClub: 'PARIS X GEN', jerseyNumber: '10', egoWeapon: 'Curved Trivela × Hideous Instinct', nelRank: 'RANK #2 · S-TIER 98', currentBid: '¥298,000,000' },
  },
  {
    id: 'nagi', name: 'Seishiro Nagi', label: 'NAGI / BLACK HOLE TRAP', motif: 'self-drawn zero-gravity orbit rings',
    fx: { ball: 'trap', restitution: 0.18, impact: 'ring', intro: 'drift', typing: 'lazy' },
    copy: { positionName: 'GENIUS SECOND STRIKER', favoriteClub: 'MANSHINE CITY', jerseyNumber: '07', egoWeapon: 'Five-Stage Fake Volley × Zero Gravity Trap', nelRank: 'RANK #4 · S-TIER 92', currentBid: '¥180,000,000' },
  },
  {
    id: 'reo', name: 'Reo Mikage', label: 'REO / CHAMELEON', motif: 'self-drawn shifting hexagon scales',
    fx: { ball: 'drop-bounce-roll', restitution: 0.36, impact: 'ring', intro: 'chroma', typing: 'hue' },
    copy: { positionName: 'CHAMELEON PLAYMAKER', favoriteClub: 'MANSHINE CITY', jerseyNumber: '14', egoWeapon: 'Chameleon × Copycat Vision', nelRank: 'RANK #7 · A-TIER 90', currentBid: '¥40,000,000' },
  },
  {
    id: 'chigiri', name: 'Hyoma Chigiri', label: 'CHIGIRI / VELOCITY', motif: 'self-drawn speed lines and track marks',
    fx: { ball: 'sprint', restitution: 0.24, impact: 'shock', intro: 'speed', typing: 'instant' },
    copy: { positionName: 'VELOCITY WINGER', favoriteClub: 'MANSHINE CITY', jerseyNumber: '44', egoWeapon: '44m Golden Shot × Mach Sprint', nelRank: 'RANK #6 · A-TIER 88', currentBid: '¥120,000,000' },
  },
  {
    id: 'barou', name: 'Shoei Barou', label: 'BAROU / KING PREDATOR', motif: 'self-drawn crown angles and predator marks',
    fx: { ball: 'drop-bounce-roll', restitution: 0.22, impact: 'shock', intro: 'crown', typing: 'slam' },
    copy: { positionName: 'ABSOLUTE KING', favoriteClub: 'UBERS', jerseyNumber: '13', egoWeapon: 'Predator Eye × 29m Chop Feint', nelRank: 'RANK #3 · S-TIER 95', currentBid: '¥250,000,000' },
  },
  {
    id: 'kaiser', name: 'Michael Kaiser', label: 'KAISER / KAISER IMPACT', motif: 'self-drawn lightning bolts and impact marks',
    fx: { ball: 'volley', restitution: 0.4, impact: 'lightning', intro: 'lightning', typing: 'glitch' },
    copy: { positionName: 'MAIN STRIKER', favoriteClub: 'BASTARD MÜNCHEN', jerseyNumber: '10', egoWeapon: 'Lightning Kaiser Impact × Metavision', nelRank: 'WORLD 11 · S-TIER 99', currentBid: '¥320,000,000' },
  },
];

export const CHARACTER_THEMES: Record<CharacterId, CharacterTheme> = Object.fromEntries(
  definitions.map((character) => [
    character.id,
    { ...character, skin: CHARACTER_SKINS[character.id], tokens: { dark: tokensFor(character.id, 'dark'), light: tokensFor(character.id, 'light') } },
  ]),
) as Record<CharacterId, CharacterTheme>;

export const CHARACTER_IDS = Object.keys(CHARACTER_THEMES) as CharacterId[];
export const getCharacterTheme = (id: CharacterId): CharacterTheme => CHARACTER_THEMES[id];
