import { ComponentId, ProfileConfig } from '../types';
import { itemsPerPage } from '../templates/registry';

export function safeHttpUrl(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export interface ProfileLink {
  label: string;
  url: string;
}
export function profileLinks(
  config: ProfileConfig,
  id: ComponentId,
  page = 0,
  template?: string,
): ProfileLink[] {
  if (id === 'projects') {
    const size = itemsPerPage(id, template ?? config.cardTemplates?.[id]) ?? 3;
    return config.projects.slice(page * size, (page + 1) * size).flatMap((p) => {
      const url = safeHttpUrl(p.url);
      return url ? [{ label: p.name, url }] : [];
    });
  }
  if (id !== 'footer') return [];
  const s = config.socials;
  const links: ProfileLink[] = [];
  if (s.github.trim())
    links.push({
      label: 'GitHub',
      url: `https://github.com/${encodeURIComponent(s.github.trim())}`,
    });
  if (s.email && /^[^\s@<>]+@[^\s@<>]+$/.test(s.email.trim()))
    links.push({ label: 'Email', url: `mailto:${encodeURIComponent(s.email.trim())}` });
  for (const [label, value, base] of [
    ['LinkedIn', s.linkedin, 'https://www.linkedin.com/in/'],
    ['X / Twitter', s.twitter, 'https://x.com/'],
    ['Portfolio', s.portfolio, ''],
  ]) {
    if (!value?.trim()) continue;
    const input = value.trim();
    const url = safeHttpUrl(
      /^https?:/i.test(input)
        ? input
        : base
          ? base + encodeURIComponent(input.replace(/^@/, ''))
          : input,
    );
    if (url) links.push({ label: label!, url });
  }
  return links;
}

export const markdownText = (value: string) =>
  value.replace(/\r?\n/g, ' ').replace(/[\\`*_[\]<>#|]/g, '\\$&');
export const markdownCode = (value: string) => {
  const clean = value.replace(/\r?\n/g, ' ');
  const length = Math.max(0, ...Array.from(clean.matchAll(/`+/g), (m) => m[0].length)) + 1;
  const fence = '`'.repeat(length);
  return `${fence} ${clean} ${fence}`;
};
export const markdownLink = ({ label, url }: ProfileLink) =>
  `[${markdownText(label)}](<${url.replaceAll('>', '%3E').replaceAll('<', '%3C')}>)`;
