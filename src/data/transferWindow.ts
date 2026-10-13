import { LayoutMode, ProfileConfig } from '../types';

export function transferContacts(config: ProfileConfig) {
  const s = config.socials;
  return [
    { id: 'github', label: 'GITHUB', value: s.github.trim() ? `@${s.github.trim()}` : '' },
    { id: 'email', label: 'EMAIL', value: s.email?.trim() ?? '' },
    {
      id: 'web',
      label: 'PORTFOLIO',
      value: s.portfolio?.trim().replace(/^https?:\/\//i, '') ?? '',
    },
    {
      id: 'linkedin',
      label: 'LINKEDIN',
      value: s.linkedin?.trim().replace(/^https?:\/\//i, '') ?? '',
    },
    {
      id: 'twitter',
      label: 'X / TWITTER',
      value: s.twitter?.trim().replace(/^https?:\/\//i, '') ?? '',
    },
  ].filter((contact) => contact.value);
}

export function transferWindowHeight(layout: LayoutMode, config?: ProfileConfig) {
  const count = config ? Math.max(1, transferContacts(config).length) : 3;
  return layout === 'compact' ? 300 + count * 60 : Math.max(186, 82 + (count - 1) * 62 + 54) + 154;
}
