import { ComponentId, LayoutMode, ProfileConfig } from '../types';
import { transferWindowHeight } from '../data/transferWindow';

export const DESIGN_REFERENCE_SOURCES: Record<string, { title: string; url: string }> = {
  covers: { title: 'Official manga covers', url: 'https://tv.bluelock-pr.com/tv1st/comics/' },
  egoist: { title: 'Visual of Egoist', url: 'https://tv.bluelock-pr.com/tv1st/news/235/' },
  gallery: { title: 'Official anime gallery', url: 'https://bluelock-anime-en.com/gallery/' },
  'episode-nagi': {
    title: 'Episode Nagi film posters',
    url: 'https://movie.bluelock-pr.com/news/244/',
  },
  exhibition: { title: 'Egoist Exhibition', url: 'https://www.bluelockegoistexhibition.com/' },
  goods: { title: 'Manga exhibition collectibles', url: 'https://bluelock-exhibition.com/goods/' },
};

export interface CardTemplateDefinition {
  id: string;
  component: ComponentId;
  name: string;
  description: string;
  itemsPerPage?: number;
  collection?: 'Manga' | 'Anime' | 'Exhibition';
  references?: string[];
  height?: { wide: number; compact: number };
}

/** Display and validation metadata. Renderer functions stay in svgGenerators. */
export const CARD_TEMPLATES: Record<ComponentId, CardTemplateDefinition[]> = {
  hero: [
    {
      id: 'classic',
      component: 'hero',
      name: 'Classic Banner',
      description: 'Identity banner with jersey and ball motion.',
    },
    {
      id: 'poster',
      component: 'hero',
      name: 'Manga Poster',
      description: 'High contrast manga panel with flame aura.',
    },
  ],
  'player-card': [
    {
      id: 'bars',
      component: 'player-card',
      name: 'Attribute Card',
      description: 'Player identity and skill ratings.',
      itemsPerPage: 6,
    },
    {
      id: 'radar',
      component: 'player-card',
      name: 'Radar Profile',
      height: { wide: 300, compact: 300 },
      description: 'A player identity beside a polygon rating profile.',
      itemsPerPage: 6,
    },
  ],
  'tech-pitch': [
    {
      id: 'pitch',
      component: 'tech-pitch',
      name: 'Tactical Pitch',
      description: 'Technologies arranged by formation.',
    },
    {
      id: 'formation-list',
      component: 'tech-pitch',
      name: 'Formation List',
      description: 'A grouped list of technologies by playing role.',
    },
  ],
  'match-stats': [
    {
      id: 'scoreboard',
      component: 'match-stats',
      name: 'Match Scoreboard',
      description: 'Profile statistics and data sources.',
    },
    {
      id: 'ticker',
      component: 'match-stats',
      name: 'Performance Ticker',
      height: { wide: 236, compact: 252 },
      description: 'Compare profile metrics with horizontal scales.',
    },
  ],
  'league-table': [
    {
      id: 'table',
      component: 'league-table',
      name: 'Language League',
      description: 'Languages ranked by share.',
      itemsPerPage: 6,
    },
    {
      id: 'podium',
      component: 'league-table',
      name: 'Language Podium',
      description: 'A top-three podium with ranked follow-up rows.',
      itemsPerPage: 6,
    },
  ],
  projects: [
    {
      id: 'squad-cards',
      component: 'projects',
      name: 'Project Squad',
      description: 'Featured projects grouped in cards.',
      itemsPerPage: 3,
    },
    {
      id: 'compact-list',
      component: 'projects',
      name: 'Compact Project List',
      description: 'A scouting list focused on ratings and stack.',
      itemsPerPage: 4,
    },
  ],
  season: [
    {
      id: 'turf',
      component: 'season',
      name: 'Season Heatmap',
      description: 'Contribution activity over time.',
    },
    {
      id: 'calendar-grid',
      component: 'season',
      name: 'Calendar Grid',
      description: 'Twelve mini calendars for the recent contribution year.',
    },
  ],
  footer: [
    {
      id: 'transfer-window',
      component: 'footer',
      name: 'Transfer Window',
      description: 'Collaboration status and contact details.',
    },
    {
      id: 'full-time-strip',
      component: 'footer',
      name: 'Full-time Strip',
      description: 'A compact closing line with contact links.',
    },
  ],
};

const additions: Record<
  ComponentId,
  [string, string, string, 'Manga' | 'Anime' | 'Exhibition', string[]][]
> = {
  hero: [
    [
      'volume-cover',
      'Volume Cover',
      'A vivid manga cover with chains and oversized identity.',
      'Manga',
      ['covers'],
    ],
    [
      'egoist-poster',
      'Egoist Poster',
      'An action portrait in a diagonal character poster.',
      'Anime',
      ['egoist'],
    ],
  ],
  'player-card': [
    [
      'collector-cover',
      'Collector Cover',
      'A collectible portrait card with a skill inventory.',
      'Manga',
      ['covers', 'goods'],
    ],
    [
      'egoist-portrait',
      'Egoist Portrait',
      'A cinematic close-up beside six skill ratings.',
      'Anime',
      ['episode-nagi'],
    ],
  ],
  'tech-pitch': [
    [
      'chain-tactics',
      'Chain Tactics',
      'An inked tactical pitch framed by chains.',
      'Manga',
      ['covers'],
    ],
    [
      'puzzle-field',
      'Puzzle Field',
      'Puzzle zones, formation positions and technology connections.',
      'Anime',
      ['gallery'],
    ],
  ],
  'match-stats': [
    [
      'issue-score',
      'Issue Score',
      'Profile metrics as oversized manga issue numbers.',
      'Manga',
      ['covers'],
    ],
    [
      'impact-panel',
      'Impact Panel',
      'Five metrics inside inked action panels.',
      'Manga',
      ['goods'],
    ],
  ],
  'league-table': [
    [
      'ranking-volume',
      'Ranking Volume',
      'A volume contents page ranking language shares.',
      'Manga',
      ['covers'],
    ],
    [
      'egoist-awards',
      'Egoist Awards',
      'An exhibition award board for language shares.',
      'Exhibition',
      ['exhibition'],
    ],
  ],
  projects: [
    [
      'volume-shelf',
      'Volume Shelf',
      'Three original project covers with stack and project details.',
      'Manga',
      ['covers'],
    ],
    [
      'rival-panels',
      'Rival Panels',
      'Three diagonal project panels inspired by anime key visuals.',
      'Anime',
      ['gallery'],
    ],
  ],
  season: [
    ['chapter-log', 'Chapter Log', 'Daily contributions over 52 weeks.', 'Manga', []],
    [
      'training-panels',
      'Training Panels',
      'Twelve month panels with daily activity and monthly totals.',
      'Manga',
      ['goods'],
    ],
  ],
  footer: [
    [
      'chain-ticket',
      'Chain Ticket',
      'A torn manga ticket for collaboration and contacts.',
      'Manga',
      ['covers', 'goods'],
    ],
    [
      'exhibition-pass',
      'Exhibition Pass',
      'An elegant portrait pass with collaboration details.',
      'Exhibition',
      ['exhibition'],
    ],
  ],
};
for (const component of Object.keys(additions) as ComponentId[]) {
  const heights: Record<ComponentId, [number, number]> = {
    hero: [360, 440],
    'player-card': [340, 380],
    'tech-pitch': [580, 480],
    'match-stats': [240, 280],
    'league-table': [300, 340],
    projects: [380, 440],
    season: [260, 320],
    footer: [220, 260],
  };
  CARD_TEMPLATES[component].push(
    ...additions[component].map(([id, name, description, collection, references]) => ({
      id,
      component,
      name,
      description,
      collection,
      references,
      height:
        id === 'impact-panel'
          ? { wide: 280, compact: 360 }
          : { wide: heights[component][0], compact: heights[component][1] },
      ...(['player-card', 'league-table'].includes(component)
        ? { itemsPerPage: 6 }
        : component === 'projects'
          ? { itemsPerPage: 3 }
          : {}),
    })),
  );
}

export const DEFAULT_CARD_TEMPLATE: Record<ComponentId, string> = Object.fromEntries(
  Object.entries(CARD_TEMPLATES).map(([component, templates]) => [component, templates[0].id]),
) as Record<ComponentId, string>;

export function getCardTemplate(component: ComponentId, id?: string): CardTemplateDefinition {
  const templates = CARD_TEMPLATES[component];
  return (
    templates.find((template) => template.id === (id ?? DEFAULT_CARD_TEMPLATE[component])) ??
    templates[0]
  );
}

export function isCardTemplate(component: ComponentId, id: unknown): id is string {
  return typeof id === 'string' && CARD_TEMPLATES[component].some((template) => template.id === id);
}

export function itemsPerPage(component: ComponentId, templateId?: string): number | undefined {
  return getCardTemplate(component, templateId).itemsPerPage;
}

const BASE_CARD_SIZES: Record<ComponentId, [number, number]> = {
  hero: [296, 296],
  'player-card': [280, 300],
  'tech-pitch': [580, 480],
  'match-stats': [190, 220],
  'league-table': [236, 240],
  projects: [320, 320],
  season: [220, 280],
  footer: [184, 244],
};
export function cardSize(
  id: ComponentId,
  layout: LayoutMode,
  template?: string,
  config?: ProfileConfig,
): [number, number] {
  const definition = getCardTemplate(id, template ?? config?.cardTemplates?.[id]);
  const width = layout === 'compact' ? 400 : id === 'tech-pitch' ? 500 : 800;
  let height = definition.height?.[layout] ?? BASE_CARD_SIZES[id][layout === 'compact' ? 1 : 0];
  if (id === 'footer' && definition.id === 'transfer-window')
    return [width, transferWindowHeight(layout, config)];
  if (config && !definition.collection) {
    if (
      (id === 'projects' && !config.projects.length) ||
      (id === 'tech-pitch' && !config.pitchTechs.length) ||
      (id === 'league-table' && !config.languages.length) ||
      (id === 'season' && config.seasonSource !== 'demo' && !config.seasonDays.length)
    )
      height = 170;
    if (id === 'player-card' && layout === 'compact' && !config.skills.length) height = 200;
    if (
      id === 'footer' &&
      layout === 'compact' &&
      !config.socials.github &&
      !config.socials.email &&
      !config.socials.portfolio
    )
      height = definition.id === 'full-time-strip' ? 244 : 160;
  }
  return [width, height];
}
