import { ComponentId } from '../types';

export type ProfileReadmeTemplate = 'striker' | 'playmaker' | 'all-star' | 'minimal';
export type EmbedMode = 'relative' | 'raw' | 'jsdelivr';

export interface ProfileReadmeSettings {
  template: ProfileReadmeTemplate;
  embedMode: EmbedMode;
  repoPath: string; // GitHub profile repository path, e.g. "username/username"
  branch: string; // default "main"
  selectedCards: ComponentId[];
  showBadges: boolean;
  showQuote: boolean;
  /** @deprecated Reserved legacy flag; card selection controls content. */
  showBio: boolean;
  /** @deprecated Reserved legacy flag; card selection controls content. */
  showTactics: boolean;
  egoWeapon?: string;
  nelRank?: string;
  currentBid?: string;
  align: 'center' | 'left';
}

export const DEFAULT_README_SETTINGS: ProfileReadmeSettings = {
  template: 'striker',
  embedMode: 'relative',
  repoPath: '',
  branch: 'main',
  selectedCards: ['hero', 'player-card', 'tech-pitch', 'match-stats', 'projects', 'footer'],
  showBadges: true,
  showQuote: true,
  showBio: true,
  showTactics: true,
  egoWeapon: '',
  nelRank: '',
  currentBid: '',
  align: 'center',
};
