import { ComponentId, ProfileConfig, ThemeMode, LayoutMode } from '../types';
import { COMPONENT_REGISTRY, pageCount } from '../generator/svgGenerators';
import { svgFilename } from '../generator/filenames';
import { characterColorway } from '../characters/colorways';
import { resolveReadmeSettings, readmePathError } from './settings';
import { profileLinks, markdownLink, markdownText, markdownCode } from './links';
import { esc } from '../generator/text';
import { ProfileReadmeSettings, DEFAULT_README_SETTINGS } from './types';
import { generateBlueLockBadges, generateSocialBadges } from './badges';
import { getCardTemplate, itemsPerPage } from '../templates/registry';

export function getBaseAssetUrl(settings: ProfileReadmeSettings): string {
  const error = readmePathError(settings);
  if (error) throw new Error(error);
  const repo = settings.repoPath.trim().split('/').map(encodeURIComponent).join('/');
  const branch = encodeURIComponent(settings.branch || 'main');

  switch (settings.embedMode) {
    case 'raw':
      return repo
        ? `https://raw.githubusercontent.com/${repo}/${branch}/assets/ego-striker`
        : 'assets/ego-striker';
    case 'jsdelivr':
      return repo
        ? `https://cdn.jsdelivr.net/gh/${repo}@${branch}/assets/ego-striker`
        : 'assets/ego-striker';
    case 'relative':
    default:
      return 'assets/ego-striker';
  }
}

export function renderCardMarkdown(
  config: ProfileConfig,
  id: ComponentId,
  basePath: string,
  align: 'center' | 'left' = 'center',
): string {
  const component = COMPONENT_REGISTRY.find((c) => c.id === id);
  if (!component) return '';

  const pages = pageCount(id, config);
  const character = config.characterOverrides?.[id] ?? config.character;
  const template = getCardTemplate(id, config.cardTemplates?.[id]);
  const sections: string[] = [];

  for (let page = 0; page < pages; page++) {
    const asset = (theme: ThemeMode, layout: LayoutMode) =>
      esc(
        `${basePath}/${svgFilename(id, theme, layout, page, character, template.id, characterColorway(config, character))}`,
      );

    const imageTag = `<picture>
  <source media="(max-width: 480px) and (prefers-color-scheme: dark)" srcset="${asset('dark', 'compact')}">
  <source media="(max-width: 480px)" srcset="${asset('light', 'compact')}">
  <source media="(prefers-color-scheme: dark)" srcset="${asset('dark', 'wide')}">
  <img src="${asset('light', 'wide')}" alt="${esc(component.name + ' — ' + template.name + '. ' + component.description)}" width="${component.baseSize?.wide[0] ?? 800}">
</picture>`;

    const links = profileLinks(config, id, page, template.id).map(markdownLink);

    const linksMarkup = links.length ? `\n\n${links.join(' · ')}` : '';

    if (align === 'center') {
      sections.push(
        `<div align="center">\n\n${imageTag}${linksMarkup ? '\n\n' + linksMarkup : ''}\n\n</div>`,
      );
    } else {
      sections.push(`${imageTag}${linksMarkup}`);
    }
  }

  return sections.join('\n\n');
}

export function generateFullReadme(
  config: ProfileConfig,
  customSettings?: Partial<ProfileReadmeSettings>,
): string {
  const settings = resolveReadmeSettings(config, customSettings);

  const basePath = getBaseAssetUrl(settings);
  const badges = settings.showBadges ? generateBlueLockBadges(config, settings) : [];
  const socialBadges = settings.showBadges ? generateSocialBadges(config) : [];
  const parts: string[] = [];

  // 1. Header Badges & Title
  const headerLines: string[] = [];
  if (settings.showBadges && badges.length > 0) {
    headerLines.push(badges.join(' '));
  }
  if (settings.showBadges && socialBadges.length > 0) {
    headerLines.push(socialBadges.join(' '));
  }

  if (headerLines.length > 0) {
    if (settings.align === 'center') {
      parts.push(`<div align="center">\n\n${headerLines.join('\n\n')}\n\n</div>`);
    } else {
      parts.push(headerLines.join('\n\n'));
    }
  }

  // 2. Ego Philosophy & Weapon Quote
  if (settings.showQuote) {
    const { philosophy, weapon, club, jersey, bid } = buildReadmeQuote(config, settings);
    const quoteBlock = [
      `> ### ⚽ EGO PROTOCOL // THE WINNING FORMULA`,
      `> *"In the realm of engineering, only the striker with clear vision and relentless execution devours the opposition."*`,
      `>`,
      `> **PHILOSOPHY:** ${markdownText(philosophy)}`,
      `>`,
      `> ⚡ **WEAPON FORMULA:** ${markdownCode(weapon)}`,
      `> 🏆 **CLUB:** ${markdownCode(club)} | **JERSEY:** ${markdownCode(jersey)} | **BID:** ${markdownCode(bid)}`,
    ].join('\n');

    parts.push(quoteBlock);
  }

  // 3. Render Cards in configured order
  for (const section of buildReadmeSections(config, settings)) {
    parts.push(
      `### ⚡ ${section.title}\n\n${renderCardMarkdown(config, section.id, basePath, settings.align)}`,
    );
  }

  // 4. Footer credits
  const footerNote = [
    `---`,
    `<div align="center">`,
    `<sub>Generated with ⚽ <b>Ego Striker Component Studio</b> — a fan-made Blue Lock inspired profile kit. No official assets.</sub>`,
    `</div>`,
  ].join('\n');

  parts.push(footerNote);

  return parts.join('\n\n') + '\n';
}

export function buildReadmeSections(
  config: ProfileConfig,
  settings = resolveReadmeSettings(config),
) {
  const cardNames: Record<ComponentId, { title: string; desc: string }> = {
    hero: { title: '01. HERO // EGO PROTOCOL UNLEASHED', desc: 'Player Identity & Status' },
    'player-card': {
      title: '02. PLAYER SPECIFICATION // SKILLS & RATINGS',
      desc: 'Technical Mastery & Skill Breakdown',
    },
    'tech-pitch': {
      title: `03. TACTICAL GRID // ${config.pitchFormation} FORMATION`,
      desc: 'Tech Stack Positioned on Field',
    },
    'match-stats': {
      title: '04. MATCH REPORT // STATS & CONTRIBUTION',
      desc: 'Commits, Pull Requests & Win Streaks',
    },
    'league-table': {
      title: '05. LEAGUE TABLE // LANGUAGE STANDINGS',
      desc: 'Codebase Distribution & Rank',
    },
    projects: {
      title: '06. KEY FIXTURES // FEATURED PROJECTS',
      desc: 'Championship Repositories & Highlights',
    },
    season: {
      title: '07. SEASON HEATMAP // TRAINING LOG',
      desc: '52-Week Contribution Calendar',
    },
    footer: {
      title: '08. TRANSFER WINDOW // NETWORK & CONTACTS',
      desc: 'Scout Network & Direct Inquiries',
    },
  };

  return settings.selectedCards.map((cardId) => ({
    id: cardId,
    title:
      cardId === 'hero' && config.cardTemplates?.hero === 'poster'
        ? '01. MANGA POSTER // EGO PROTOCOL'
        : cardNames[cardId].title,
    pages: Array.from({ length: pageCount(cardId, config) }, (_, page) => ({
      page,
      links: profileLinks(config, cardId, page),
    })),
  }));
}

export function buildReadmeQuote(config: ProfileConfig, settings = resolveReadmeSettings(config)) {
  return {
    philosophy: config.philosophy || config.egoTagline || 'Experiments into impact.',
    weapon: settings.egoWeapon || config.egoWeapon || 'Add your own specialty',
    club: config.favoriteClub || 'Your club',
    jersey: '#' + (config.jerseyNumber || '—'),
    bid: settings.currentBid || config.currentBid || 'Not set',
  };
}
