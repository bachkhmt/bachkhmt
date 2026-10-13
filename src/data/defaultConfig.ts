import { CharacterId, ColorTokens, ProfileConfig, TacticalPitchPosition } from '../types';
import { CHARACTER_IDS, CHARACTER_THEMES } from '../characters/themes';

export const THEME_TOKENS: Record<'dark' | 'light', ColorTokens> = CHARACTER_THEMES.isagi.tokens;

const TECHS = [
  ['Streamlit', 'AI applications'],
  ['Gradio', 'Model interfaces'],
  ['TypeScript', 'Product experience'],
  ['Python', 'Data pipelines'],
  ['PyTorch', 'Deep learning'],
  ['Transformers', 'LLM foundations'],
  ['scikit-learn', 'ML baselines'],
  ['RAG / FAISS', 'Retrieval'],
  ['MLflow', 'Evaluation & tracking'],
  ['FastAPI', 'Model serving'],
  ['Docker', 'Reproducible runtime'],
];

/** Coordinates are percentages in a vertical pitch. Re-forming keeps each tech's identity. */
export function arrangeFormation(
  nodes: TacticalPitchPosition[],
  formation: ProfileConfig['pitchFormation'],
): TacticalPitchPosition[] {
  const groups: [TacticalPitchPosition['role'], number, number][] =
    formation === '4-3-3'
      ? [
          ['FW', 3, 15],
          ['MF', 3, 39],
          ['DF', 4, 65],
          ['GK', 1, 87],
        ]
      : [
          ['FW', 2, 15],
          ['MF', 4, 39],
          ['DF', 4, 65],
          ['GK', 1, 87],
        ];
  let index = 0;
  return groups.flatMap(([role, count, y]) =>
    Array.from({ length: count }, (_, i) => {
      const original = nodes[index];
      const n = index++;
      return {
        ...original,
        id: original?.id ?? `tech-${n}`,
        role,
        positionName: role,
        tech: original?.tech ?? '',
        subTech: original?.subTech ?? '',
        x: count === 1 ? 50 : 12 + (i * 76) / (count - 1),
        y,
      };
    }),
  );
}

export const AI_PITCH = arrangeFormation(
  TECHS.map(([tech, subTech], i) => ({
    id: `tech-${i}`,
    role: 'MF',
    positionName: 'MF',
    tech,
    subTech,
    x: 50,
    y: 50,
  })),
  '4-3-3',
);

export const DEFAULT_CONFIG: ProfileConfig = {
  character: 'isagi',
  characterOverrides: {},
  taglines: [],
  displayName: 'YOUR NAME',
  egoTagline: 'Data → Models → Impact.',
  role: 'AI ENGINEER',
  jerseyNumber: '7',
  positionName: 'STRIKER',
  philosophy: 'Experiments into impact.',
  favoriteClub: 'YOUR CLUB',
  avatarSeed: 'striker-7',
  transferStatus: 'OPEN',
  animationLevel: 'full',
  presetLabel: 'AI Engineer Demo',
  skillSource: 'demo',
  languageSource: 'demo',
  projectSource: 'demo',
  skills: [
    { id: 'skill-data', name: 'DATA', value: 85, description: 'Data preparation & pipelines' },
    { id: 'skill-ml', name: 'ML', value: 82, description: 'Baselines & feature engineering' },
    { id: 'skill-deep-learning', name: 'DEEP LEARNING', value: 80, description: 'Training & fine-tuning' },
    { id: 'skill-llm', name: 'LLM', value: 88, description: 'Retrieval & applications' },
    { id: 'skill-evaluation', name: 'EVALUATION', value: 84, description: 'Quality & experiment design' },
    { id: 'skill-mlops', name: 'MLOPS', value: 78, description: 'Serving & reproducibility' },
  ],
  pitchFormation: '4-3-3',
  pitchTechs: AI_PITCH,
  matchStats: {
    goals: 120,
    assists: 18,
    mvpVotes: 42,
    matches: 12,
    winStreak: 7,
    goalThreshold: 100,
  },
  statSources: {
    goals: 'demo',
    assists: 'demo',
    mvpVotes: 'demo',
    matches: 'demo',
    winStreak: 'demo',
    goalThreshold: 'manual',
  },
  languages: [
    { id: 'language-python', name: 'Python', percent: 58, color: '#4ba2df', trend: 'same', rank: 1 },
    { id: 'language-typescript', name: 'TypeScript', percent: 26, color: '#608bff', trend: 'same', rank: 2 },
    { id: 'language-jupyter', name: 'Jupyter Notebook', percent: 12, color: '#ef9452', trend: 'same', rank: 3 },
    { id: 'language-shell', name: 'Shell', percent: 4, color: '#74d9a6', trend: 'same', rank: 4 },
  ],
  projects: [
    {
      id: 'project-1',
      number: '01',
      name: 'metavision-rag',
      description: 'Document retrieval with grounded answers.',
      primaryTech: 'Python · FAISS · Transformers',
      stars: 0,
      forks: 0,
      rating: 'DEMO',
      url: '',
      status: 'ACTIVE',
    },
    {
      id: 'project-2',
      number: '02',
      name: 'vision-scout',
      description: 'Image classification, tracked experiments.',
      primaryTech: 'PyTorch · MLflow · Gradio',
      stars: 0,
      forks: 0,
      rating: 'DEMO',
      url: '',
      status: 'EVOLVING',
    },
    {
      id: 'project-3',
      number: '03',
      name: 'model-serving-arena',
      description: 'Model APIs with reproducible deployment.',
      primaryTech: 'scikit-learn · FastAPI · Docker',
      stars: 0,
      forks: 0,
      rating: 'DEMO',
      url: '',
      status: 'ACTIVE',
    },
  ],
  socials: {
    github: '',
    email: '',
    linkedin: '',
    twitter: '',
    portfolio: '',
  },
  seasonSource: 'demo',
  seasonDays: [],
  egoWeapon: 'Metavision Spatial Awareness × Direct Volley Execution',
  nelRank: 'RANK #1 · S-TIER 98',
  currentBid: '¥300,000,000',
};

export const CHARACTER_PRESETS = Object.fromEntries(
  CHARACTER_IDS.map((id) => {
    const character = CHARACTER_THEMES[id];
    return [id, { label: character.label, ...character.copy }];
  }),
) as Record<
  CharacterId,
  {
    label: string;
    positionName: string;
    favoriteClub: string;
    jerseyNumber: string;
    egoWeapon?: string;
    nelRank?: string;
    currentBid?: string;
  }
>;

export function applyPreset(config: ProfileConfig, key: string): ProfileConfig {
  if (key === 'ai')
    return {
      ...config,
      presetLabel: 'AI Engineer Demo',
      pitchFormation: '4-3-3',
      pitchTechs: AI_PITCH.map((n) => ({ ...n })),
      skills: DEFAULT_CONFIG.skills.map((s) => ({ ...s })),
      skillSource: 'demo',
    };
  const id = CHARACTER_IDS.find((characterId) => characterId === key);
  if (!id) return config;
  const character = CHARACTER_THEMES[id];
  return {
    ...config,
    character: id,
    characterOverrides: {},
    presetLabel: character.label,
    ...character.copy,
  };
}
