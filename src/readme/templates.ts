import { ComponentId } from '../types';
import { ProfileReadmeTemplate } from './types';

export interface TemplateDefinition {
  id: ProfileReadmeTemplate;
  name: string;
  tagline: string;
  description: string;
  defaultCards: ComponentId[];
}

export const TEMPLATE_DEFINITIONS: Record<ProfileReadmeTemplate, TemplateDefinition> = {
  striker: {
    id: 'striker',
    name: 'The Pure Egoist (Striker)',
    tagline: 'OFFENSIVE FORMATION // DIRECT IMPACT',
    description:
      'High-impact profile focusing on player spec, tactical field formation, and key project fixtures.',
    defaultCards: ['hero', 'player-card', 'tech-pitch', 'match-stats', 'projects', 'footer'],
  },
  playmaker: {
    id: 'playmaker',
    name: 'Metavision Playmaker',
    tagline: 'TACTICAL ARCHITECT // FIELD VISION',
    description:
      'Engineered for full-stack and ML architects highlighting tactical tech stack, language league table, and scoreboards.',
    defaultCards: [
      'hero',
      'player-card',
      'tech-pitch',
      'league-table',
      'match-stats',
      'projects',
      'footer',
    ],
  },
  'all-star': {
    id: 'all-star',
    name: 'Neo Egoist League All-Star',
    tagline: 'COMPLETE 8-CARD KIT // FULL MATRIX',
    description:
      'The definitive full profile kit featuring all eight components including season activity heatmap and transfer window.',
    defaultCards: [
      'hero',
      'player-card',
      'tech-pitch',
      'match-stats',
      'league-table',
      'projects',
      'season',
      'footer',
    ],
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Ace',
    tagline: 'LEAN & LETHAL // FAST LOADING',
    description:
      'Minimalist, sleek, and compact layout focusing strictly on identity, core ratings, top repositories, and contact info.',
    defaultCards: ['hero', 'player-card', 'projects', 'footer'],
  },
};
