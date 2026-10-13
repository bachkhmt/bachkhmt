export type ThemeMode = 'dark' | 'light';
export type CharacterColorway = 'default' | 'deep-blue';
export type LayoutMode = 'wide' | 'compact';
export type DataSource = 'demo' | 'manual' | 'github';
export type CharacterId =
  'isagi' | 'bachira' | 'rin' | 'nagi' | 'reo' | 'chigiri' | 'barou' | 'kaiser';
export type ComponentId =
  | 'hero'
  | 'player-card'
  | 'tech-pitch'
  | 'match-stats'
  | 'league-table'
  | 'projects'
  | 'season'
  | 'footer';
export interface RenderOptions {
  layout: LayoutMode;
  template?: string;
  page?: number; // zero-based; page 0 keeps the original filenames
  context?: RenderContext;
}

export interface LayoutTransform {
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
}

export interface SkillRating {
  id?: string;
  name: string;
  value: number; // 0 - 99
  description: string;
}

export interface TacticalPitchPosition {
  id: string;
  role: 'FW' | 'MF' | 'DF' | 'GK';
  positionName: string; // e.g. "Left Winger", "Center Striker", "Sweeper GK"
  tech: string;
  iconName?: string;
  subTech?: string;
  x: number; // Percentage on pitch 0-100
  y: number; // Percentage on pitch 0-100
}

export interface MatchStats {
  goals: number; // Commits
  assists: number; // Pull Requests
  mvpVotes: number; // Stars
  matches: number; // Repos
  winStreak: number; // Commit Streak
  goalThreshold: number; // Threshold to flash "GOAL!"
}

export interface LanguageStat {
  id?: string;
  name: string;
  percent: number;
  color: string;
  trend: 'up' | 'down' | 'same';
  rank: number;
}

export interface FeaturedProject {
  id: string;
  number: string;
  name: string;
  description: string;
  primaryTech: string;
  stars: number;
  forks: number;
  rating: string; // e.g. "9.8 MOTM"
  url: string;
  status: 'ACTIVE' | 'CHAMPION' | 'EVOLVING';
}

export interface ProfileConfig {
  character: CharacterId;
  characterColorways?: Partial<Record<CharacterId, CharacterColorway>>;
  characterOverrides?: Partial<Record<ComponentId, CharacterId>>;
  cardTemplates?: Partial<Record<ComponentId, string>>;
  heroColorOverrides?: Record<string, Partial<HeroColors>>;
  layoutOverrides?: Record<string, Record<string, LayoutTransform>>;
  motionCycleSeconds?: number;
  motionOverrides?: Record<string, Record<string, AnimationSpec[]>>;
  taglines?: string[];
  presentation?: {
    shortTagline?: string;
    techLabels?: Record<string, string>;
    projectSummaries?: Record<string, { wide?: string; compact?: string }>;
  };
  displayName: string;
  nameAnimation?: 'theme' | 'typewriter' | 'pop-up' | 'none';
  textEffects?: Partial<Record<EditableTextField, TextEffectSettings>>;
  editionNotes?: Record<string, string>;
  egoTagline: string;
  role: string;
  jerseyNumber: string;
  positionName: string; // e.g. "SHADOW STRIKER", "PURE EGOIST", "PLAYMAKER"
  philosophy: string;
  favoriteClub: string;
  avatarSeed: string;
  transferStatus: 'OPEN' | 'CLOSED' | 'NEGOTIATING';

  skills: SkillRating[];
  pitchFormation: '4-3-3' | '4-4-2';
  pitchTechs: TacticalPitchPosition[];
  matchStats: MatchStats;
  languages: LanguageStat[];
  projects: FeaturedProject[];

  socials: {
    github: string;
    twitter?: string;
    linkedin?: string;
    email?: string;
    portfolio?: string;
  };

  animationLevel: 'none' | 'subtle' | 'full' | 'cinematic';
  presetLabel: string;
  skillSource: 'demo' | 'manual';
  languageSource: DataSource;
  projectSource: 'demo' | 'manual';
  statSources: Record<keyof MatchStats, DataSource>;
  seasonSource: DataSource;
  seasonDays: { date: string; count: number }[];
  seasonSync?: {
    username: string;
    at: string;
    method: 'public-calendar' | 'github-graphql';
  };

  egoWeapon?: string;
  nelRank?: string;
  currentBid?: string;
  readmeSettings?: {
    template?: 'striker' | 'playmaker' | 'all-star' | 'minimal';
    embedMode?: 'relative' | 'raw' | 'jsdelivr';
    repoPath?: string;
    branch?: string;
    selectedCards?: ComponentId[];
    showBadges?: boolean;
    showQuote?: boolean;
    showBio?: boolean;
    showTactics?: boolean;
    egoWeapon?: string;
    nelRank?: string;
    currentBid?: string;
    align?: 'center' | 'left';
  };
}

export type EditableTextField = 'role' | 'tagline' | 'position' | 'jersey' | 'edition';
export interface TextEffectSettings {
  effect: 'theme' | 'none' | 'typewriter' | 'pop-up' | 'blur-in' | 'slide' | 'glitch';
  delaySeconds?: number;
  letterSeconds?: number;
}

export type HeroColorField = 'background' | 'surface' | 'accent' | 'text';
export interface HeroColors {
  background: string;
  surface: string;
  accent: string;
  text: string;
}

export type AnimationPresetId =
  | 'fade-up'
  | 'fade-out'
  | 'rise'
  | 'pop'
  | 'wipe'
  | 'draw-stroke'
  | 'pulse'
  | 'shake'
  | 'glow'
  | 'spin'
  | 'sweep'
  | 'zoom'
  | 'rotate'
  | 'wobble'
  | 'shine'
  | 'orbit'
  | 'bounce'
  | 'flip'
  | 'glitch'
  | 'flash'
  | 'blur-in'
  | 'slide-left'
  | 'slide-right'
  | 'squash'
  | 'tilt';
export type AnimationPhase = 'entrance' | 'emphasis' | 'exit' | 'path';
export type EasingId = 'linear' | 'ease-out' | 'ease-in-out' | 'back-out';
export interface AnimationSpec {
  id: string;
  preset: AnimationPresetId;
  phase: AnimationPhase;
  startSeconds: number;
  durationSeconds: number;
  easing: EasingId;
}

export interface ColorTokens {
  deep: string;
  navy: string;
  royal: string;
  cyan: string;
  teal: string;
  crimson: string;
  signal: string;
  ink: string;
  muted: string;
  pitchGreen: string;
  pitchLine: string;
  cardBg: string;
  cardBorder: string;
  accent2: string;
  glow: string;
  jerseyBase: string;
  jerseyTrim: string;
  jerseyShadow: string;
  jerseyShade: string;
  jerseyPanel: string;
  jerseyHighlight: string;
  jerseyLine: string;
  jerseyAccent: string;
  jerseyName: string;
  jerseySeam: string;
  heroInk: string;
  heroBgStart: string;
  heroBgMiddle: string;
  heroBgEnd: string;
  heroGridLine: string;
  heroVignette: string;
  animeInk: string;
  animeGhost: string;
  animePaperStart: string;
  animePaperEnd: string;
  animeBlueStart: string;
  animeBlueMiddle: string;
  animeBlueEnd: string;
  animeFlameStart: string;
  animeFlameMiddle: string;
  animeFlameEnd: string;
  animePattern: string;
  animeEdge: string;
  animeFlameEdge: string;
  animeStroke: string;
  animeHighlight: string;
  animeShadow: string;
  animeContour: string;
  animeDeepAccent: string;
  animeSpeed: string;
  ballLight: string;
  ballSoft: string;
  ballMid: string;
  ballEdge: string;
  ballDark: string;
  ballShadowSoft: string;
  ballShadow: string;
  ballSeamLight: string;
  ballSeam: string;
  ballOutline: string;
  ballShadowFill: string;
  ballHighlight: string;
  ballOutlineLight: string;
  seasonLevel1: string;
  seasonLevel2: string;
}

export type BallPathKind = 'drop-bounce-roll' | 'zigzag' | 'curve' | 'volley' | 'trap' | 'sprint';
export type ImpactKind = 'ring' | 'shock' | 'lightning' | 'ink' | 'none';
export type IntroKind =
  'scan' | 'ink' | 'ice' | 'drift' | 'chroma' | 'speed' | 'crown' | 'lightning';
export type TypingKind =
  | 'sharp'
  | 'stagger'
  | 'blur-in'
  | 'lazy'
  | 'hue'
  | 'instant'
  | 'slam'
  | 'glitch'
  | 'typewriter'
  | 'pop-up'
  | 'slide';

export interface CharacterFx {
  ball: BallPathKind;
  restitution: number;
  impact: ImpactKind;
  intro: IntroKind;
  typing: TypingKind;
}

export interface FxPlan {
  cycleSeconds: number;
  introSeconds: number;
  idleSeconds: number;
  keyTimes: number[];
  keyTimesPercent: string;
}

export interface CharacterTheme {
  id: CharacterId;
  name: string;
  label: string;
  motif: string;
  tokens: Record<ThemeMode, ColorTokens>;
  fx: CharacterFx;
  skin: SkinParams;
  copy: {
    positionName: string;
    favoriteClub: string;
    jerseyNumber: string;
    egoWeapon?: string;
    nelRank?: string;
    currentBid?: string;
  };
}

export interface SkinParams {
  corner: 'cut' | 'round' | 'crown' | 'ice' | 'ink';
  cell: 'square' | 'hex' | 'round' | 'diamond';
  bar: 'solid' | 'segmented' | 'ink' | 'speed' | 'crack';
  link: 'straight' | 'curve' | 'zigzag' | 'dash' | 'bolt';
  flash: ImpactKind;
  motifPlacement: 'corner' | 'watermark' | 'edge';
}

export interface RenderContext {
  config: ProfileConfig;
  component: ComponentId;
  template: string;
  mode: ThemeMode;
  layout: LayoutMode;
  page: number;
  character: CharacterTheme;
  tokens: ColorTokens;
  fx: CharacterFx;
  timeline: FxPlan;
  uid: string;
}
