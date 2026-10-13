import { ProfileConfig } from '../types';
import { ProfileReadmeSettings } from './types';
import { CHARACTER_THEMES } from '../characters/themes';
import { resolveCharacterPalette } from '../characters/colorways';
import { profileLinks, markdownLink } from './links';

const encodeBadge = (str: string) =>
  encodeURIComponent(str.replace(/-/g, '--').replace(/_/g, '__').replace(/ /g, '_')).replace(
    /[()]/g,
    (c) => '%' + c.charCodeAt(0).toString(16),
  );

export function generateBlueLockBadges(
  config: ProfileConfig,
  settings: ProfileReadmeSettings,
): string[] {
  const badges: string[] = [];
  const tokens = resolveCharacterPalette(config, config.character, 'dark').tokens;
  const hex = (value: string) => value.replace(/^#/, '');
  const club = config.favoriteClub || 'YOUR CLUB';
  const rank = settings.nelRank || config.nelRank || 'ADD YOUR RANK';
  const bid = settings.currentBid || config.currentBid || 'NOT SET';
  const role = config.role || 'YOUR ROLE';
  const jersey = config.jerseyNumber ? `NO.${config.jerseyNumber}` : 'NO. —';

  badges.push(
    `![Neo Egoist League](https://img.shields.io/badge/NEO_EGOIST_LEAGUE-${encodeBadge(club)}-${hex(tokens.royal)}?style=for-the-badge&labelColor=${hex(tokens.deep)})`,
  );
  badges.push(
    `![Egoist Rank](https://img.shields.io/badge/EGO_RANK-${encodeBadge(rank)}-${hex(tokens.cyan)}?style=for-the-badge&labelColor=${hex(tokens.deep)})`,
  );
  badges.push(
    `![Jersey](https://img.shields.io/badge/JERSEY-${encodeBadge(jersey)}-${hex(tokens.crimson)}?style=for-the-badge&labelColor=${hex(tokens.deep)})`,
  );
  badges.push(
    `![NEL Bid](https://img.shields.io/badge/NEL_BID-${encodeBadge(bid)}-${hex(tokens.signal)}?style=for-the-badge&labelColor=${hex(tokens.deep)})`,
  );
  badges.push(
    `![Position](https://img.shields.io/badge/ROLE-${encodeBadge(role)}-${hex(tokens.teal)}?style=for-the-badge&labelColor=${hex(tokens.deep)})`,
  );

  return badges;
}

export function generateSocialBadges(config: ProfileConfig): string[] {
  const styles: Record<string, [string, string, string]> = {
    GitHub: ['GitHub', '181717', 'github'],
    Email: ['Email', 'D14836', 'gmail'],
    LinkedIn: ['LinkedIn', '0A66C2', 'linkedin'],
    'X / Twitter': ['X', '000000', 'x'],
    Portfolio: ['Portfolio', '08778e', 'safari'],
  };
  return profileLinks(config, 'footer').map((link) => {
    const [label, color, logo] = styles[link.label];
    const image = `![${label}](https://img.shields.io/badge/${label}-Connect-${color}?style=for-the-badge&logo=${logo}&logoColor=white)`;
    return `[${image}](<${link.url}>)`;
  });
}
