import { ProfileConfig } from '../types';
import { DEFAULT_README_SETTINGS, ProfileReadmeSettings } from './types';

/** Resolve settings once for the builder, Markdown, ZIP and command line. */
export function resolveReadmeSettings(
  config: ProfileConfig,
  overrides: Partial<ProfileReadmeSettings> = {},
): ProfileReadmeSettings {
  const { egoWeapon, nelRank, currentBid, ...saved } = config.readmeSettings ?? {};
  return {
    ...DEFAULT_README_SETTINGS,
    repoPath: config.socials.github
      ? `${config.socials.github.trim()}/${config.socials.github.trim()}`
      : '',
    ...saved,
    egoWeapon: egoWeapon ?? config.egoWeapon ?? '',
    nelRank: nelRank ?? config.nelRank ?? '',
    currentBid: currentBid ?? config.currentBid ?? '',
    ...overrides,
  };
}

export function readmePathError(settings: ProfileReadmeSettings): string | undefined {
  if (settings.embedMode === 'relative') return;
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?\/[a-z\d_.-]+$/i.test(settings.repoPath.trim()))
    return 'Repository path must be owner/repository for raw GitHub or CDN assets.';
  if (
    !settings.branch.trim() ||
    /[\s~^:?*\[\\]|\.\.|@\{|\/$|^\//.test(settings.branch) ||
    settings.branch.endsWith('.lock')
  )
    return 'Branch must be a valid, non-empty Git ref.';
}
