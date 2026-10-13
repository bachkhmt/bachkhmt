import {
  ComponentId,
  ProfileConfig,
  RenderOptions,
  ThemeMode,
  DataSource,
  TacticalPitchPosition,
} from '../types';
import { THEME_TOKENS } from '../data/defaultConfig';
import { frame, jersey, widthFor } from './frame';
import {
  esc,
  textWidth,
  textBlock,
  taglineCycle,
  sceneCycle,
  nameRevealOptions,
  textFieldReveal,
  heroTaglines,
} from './text';
import { textElement } from './textElements';
import { renderTransferWindow } from './transferWindow';
import { label, panel, techIcon, miniBall, skinCell } from './visual';
import { renderAnimeHeroSvg } from './animeHero';
import { createRenderContext } from './renderContext';
import { CARD_TEMPLATES, getCardTemplate, itemsPerPage, cardSize } from '../templates/registry';
import { CHARACTER_SKINS } from '../characters/skins';
import { layoutElement } from './layoutElements';
import { renderCoverCollection } from './coverCollection';
import { resolveCharacterPalette, contributionLevel } from '../characters/colorways';
import { contributionLegend } from './contributionLegend';
const DEFAULT_OPTIONS: RenderOptions = { layout: 'wide' };
const provenance = (s: DataSource) =>
  s === 'demo' ? 'DEMO' : s === 'github' ? 'GITHUB API' : 'MANUAL';
type Renderer = (c: ProfileConfig, t: ThemeMode, o?: RenderOptions) => string;
const connectionPath = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style: 'straight' | 'curve' | 'zigzag' | 'dash' | 'bolt',
) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.max(1, Math.hypot(dx, dy));
  const ox = (-dy / length) * 9;
  const oy = (dx / length) * 9;
  if (style === 'curve') return `M${x1} ${y1}Q${mx + ox} ${my + oy} ${x2} ${y2}`;
  if (style === 'zigzag') return `M${x1} ${y1}L${mx + ox} ${my + oy}L${x2} ${y2}`;
  if (style === 'bolt')
    return `M${x1} ${y1}L${mx - ox * 0.6} ${my - oy * 0.6}L${mx + ox} ${my + oy}L${x2} ${y2}`;
  return `M${x1} ${y1}L${x2} ${y2}`;
};
const impactGraphic = (
  x: number,
  y: number,
  type: 'ring' | 'shock' | 'lightning' | 'ink' | 'none',
  color: string,
) => {
  if (type === 'ring')
    return `<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="${color}" stroke-width="2"/>`;
  if (type === 'shock')
    return `<path d="M${x} ${y - 16}v8M${x} ${y + 8}v8M${x - 16} ${y}h8M${x + 8} ${y}h8M${x - 11} ${y - 11}l6 6M${x + 6} ${y + 6}l6 6M${x + 11} ${y - 11}l-6 6M${x - 6} ${y + 6}l-6 6" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
  if (type === 'lightning')
    return `<path d="M${x + 2} ${y - 18}l-11 17h8l-4 18 17-24h-10l4-11z" fill="${color}"/>`;
  if (type === 'ink')
    return `<circle cx="${x - 7}" cy="${y + 1}" r="5" fill="${color}"/><circle cx="${x + 4}" cy="${y - 5}" r="8" fill="${color}"/><circle cx="${x + 9}" cy="${y + 6}" r="4" fill="${color}"/>`;
  return '';
};
const heights: Record<ComponentId, [number, number]> = {
  hero: [296, 296],
  'player-card': [280, 300],
  'tech-pitch': [580, 480],
  'match-stats': [190, 220],
  'league-table': [236, 240],
  projects: [320, 320],
  season: [220, 280],
  footer: [414, 480],
};
export function pageCount(id: ComponentId, c: ProfileConfig, template?: string): number {
  const perPage = itemsPerPage(id, template ?? c.cardTemplates?.[id]);
  const count =
    id === 'projects'
      ? Math.ceil(c.projects.length / (perPage ?? 3))
      : id === 'league-table'
        ? Math.ceil(c.languages.length / (perPage ?? 6))
        : id === 'player-card'
          ? Math.ceil(c.skills.length / (perPage ?? 6))
          : 1;
  return Math.max(1, count);
}
export function currentPage(id: ComponentId, c: ProfileConfig, o: RenderOptions): number {
  return Math.min(
    pageCount(id, c, o.context?.template ?? o.template) - 1,
    Math.max(0, Math.floor(o.page ?? 0)),
  );
}
const shell = (
  id: ComponentId,
  c: ProfileConfig,
  t: ThemeMode,
  o: RenderOptions,
  title: string,
  sub: string,
  body: string,
) => {
  const height = cardSize(id, o.layout, o.context?.template ?? o.template, c)[1];
  return frame(id, c, t, o, height, title, sub, body, o.context);
};
const pageNote = (id: ComponentId, c: ProfileConfig, o: RenderOptions) => {
  const count = pageCount(id, c, o.context?.template ?? o.template);
  return count > 1 ? ` / ${currentPage(id, c, o) + 1} OF ${count}` : '';
};
const empty = (w: number, s: string, color: string) => label(s, 24, 125, w - 48, 14, color, 400, 2);
const withRenderContext =
  (id: ComponentId, renderer: Renderer): Renderer =>
  (c, theme, o = DEFAULT_OPTIONS) => {
    const options = { ...DEFAULT_OPTIONS, ...o };
    options.context = createRenderContext(c, id, theme, options);
    options.template = options.template ?? options.context.template;
    if (getCardTemplate(id, options.template).collection)
      return renderCoverCollection(id, c, theme, options);
    return renderer(c, theme, options);
  };
const templateFor = (id: ComponentId, config: ProfileConfig, options: RenderOptions) =>
  getCardTemplate(id, options.context?.template ?? options.template ?? config.cardTemplates?.[id])
    .id;

const renderHeroTemplate: Renderer = (config, theme, options = DEFAULT_OPTIONS) => {
  const template = getCardTemplate('hero', options.template ?? config.cardTemplates?.hero).id;
  return withRenderContext('hero', template === 'poster' ? renderAnimeHeroSvg : renderHeroSvg)(
    config,
    theme,
    { ...options, template },
  );
};

export const renderHeroSvg: Renderer = (c, theme, o = DEFAULT_OPTIONS) => {
  const t = o.context?.tokens ?? THEME_TOKENS[theme],
    compact = o.layout === 'compact',
    w = widthFor(o),
    tw = compact ? 246 : 510;
  const name = c.displayName || 'YOUR NAME',
    size = Math.min(
      compact ? 54 : 112,
      Math.max(compact ? 26 : 44, tw / textWidth(name, 1, 'title')),
    );
  const typing = o.context?.fx.typing ?? 'sharp';
  const cycle = o.context?.timeline.cycleSeconds ?? 16;
  const nameReveal = nameRevealOptions(c, typing, cycle);
  const taglineLines = heroTaglines(c);
  const tagline = taglineCycle(
    taglineLines,
    24,
    textWidth(name, size, 'title') > tw ? 207 : 185,
    tw,
    compact ? 14 : 16,
    t.muted,
    {
      uid: o.context?.uid ?? `hero-${theme}-${o.layout}`,
      cycleSeconds: cycle,
      typing,
      animate: c.animationLevel !== 'none' && c.textEffects?.tagline?.effect !== 'none',
      reveal: textFieldReveal(c, 'tagline', taglineLines[0] ?? '', cycle, {
        kind: typing,
        cycleSeconds: cycle,
      }),
    },
  );
  const scenes = sceneCycle(
    [
      `${c.positionName || 'STRIKER'} · NO. ${c.jerseyNumber}`,
      `${c.matchStats.goals} GOALS / ${c.matchStats.assists} ASSISTS · ${c.matchStats.matches} REPOS`,
      c.philosophy || c.egoTagline,
    ],
    24,
    263,
    tw,
    10,
    t.cyan,
    {
      uid: o.context?.uid ?? `hero-${theme}-${o.layout}`,
      cycleSeconds: cycle,
      animate: c.animationLevel !== 'none',
    },
  );
  const multiline = textWidth(name, size, 'title') > tw;
  const artX = compact ? 334 : 654,
    artY = 160,
    radius = compact ? 54 : 74,
    js = compact ? 83 : 125;
  const art = `<g>
    <circle cx="${artX}" cy="${artY}" r="${radius + 8}" fill="${t.royal}" opacity=".06"/>
    <circle cx="${artX}" cy="${artY}" r="${radius}" fill="none" stroke="${t.royal}" opacity=".24"/>
    ${jersey(artX - js / 2, artY - js / 2, js, c.jerseyNumber, t.royal, c.displayName, t)}
  </g>`;
  const template = o.context?.template ?? o.template ?? 'classic';
  const textLayer = (
    element: Parameters<typeof textElement>[4],
    x: number,
    y: number,
    body: string,
  ) => textElement(c, o, 'hero', template, element, x, y, body);
  const numberSize = compact ? 10 : 12;
  const numberLabel = `NO. ${c.jerseyNumber} / `;
  const numberWidth = Math.min(tw * 0.4, textWidth(numberLabel, numberSize, 'bold'));
  const identity = layoutElement(
    c,
    o,
    'hero',
    template,
    'hero-identity',
    'Name and identity',
    24,
    73,
    textLayer(
      'hero-name',
      24,
      73 + size * 0.708,
      label(name, 24, 73 + size * 0.708, tw, size, t.ink, 900, 2, undefined, nameReveal),
    ),
  );
  const details = layoutElement(
    c,
    o,
    'hero',
    template,
    'hero-details',
    'Position and taglines',
    24,
    185,
    textLayer('hero-tagline', 24, textWidth(name, size, 'title') > tw ? 207 : 185, tagline) +
      textLayer(
        'hero-jersey',
        24,
        228,
        label(
          numberLabel,
          24,
          228,
          numberWidth,
          numberSize,
          t.teal,
          700,
          1,
          'start',
          textFieldReveal(c, 'jersey', c.jerseyNumber, cycle),
        ),
      ) +
      textLayer(
        'hero-position',
        24 + numberWidth,
        228,
        label(
          c.positionName,
          24 + numberWidth,
          228,
          tw - numberWidth,
          numberSize,
          t.teal,
          700,
          1,
          'start',
          textFieldReveal(c, 'position', c.positionName, cycle),
        ),
      ) +
      scenes,
  );
  return shell(
    'hero',
    c,
    theme,
    o,
    name,
    c.role,
    identity +
      details +
      layoutElement(c, o, 'hero', template, 'hero-art', 'Jersey illustration', artX, artY, art),
  );
};
function renderPlayerRadarSvg(c: ProfileConfig, theme: ThemeMode, o: RenderOptions): string {
  const t = o.context?.tokens ?? THEME_TOKENS[theme];
  const compact = o.layout === 'compact';
  const pageSize = itemsPerPage('player-card', o.context?.template ?? o.template) ?? 6;
  const skills = c.skills.slice(
    currentPage('player-card', c, o) * pageSize,
    currentPage('player-card', c, o) * pageSize + pageSize,
  );
  const cx = compact ? 200 : 576;
  const cy = compact ? 198 : 178;
  const radius = compact ? 60 : 70;
  const angle = (index: number) =>
    -Math.PI / 2 + (index * Math.PI * 2) / Math.max(3, skills.length);
  const point = (index: number, r: number) =>
    `${(cx + Math.cos(angle(index)) * r).toFixed(1)},${(cy + Math.sin(angle(index)) * r).toFixed(1)}`;
  let chart = '';
  if (skills.length >= 3)
    [0.25, 0.5, 0.75, 1].forEach((scale) => {
      const points = skills.map((_, i) => point(i, radius * scale)).join(' ');
      chart += `<polygon points="${points}" fill="none" stroke="${t.cardBorder}" stroke-width="1"/>`;
    });
  const values = skills
    .map((skill, i) => point(i, radius * Math.max(0.06, skill.value / 99)))
    .join(' ');
  if (skills.length >= 3)
    chart += `<polygon points="${values}" fill="${t.cyan}" fill-opacity=".22" stroke="${t.cyan}" stroke-width="2"/>`;
  if (skills.length < 3)
    chart += skills.length
      ? skills
          .map((s, i) =>
            label(
              `${s.name}: ${s.value}`,
              compact ? 24 : 300,
              (compact ? 165 : 145) + i * 30,
              compact ? 352 : 450,
              16,
              t.ink,
              700,
            ),
          )
          .join('')
      : label(
          'Add at least three ratings for a skill radar.',
          24,
          compact ? 179 : 280,
          widthFor(o) - 48,
          12,
          t.muted,
        );
  if (skills.length >= 3)
    skills.forEach((skill, i) => {
      const a = angle(i),
        labelX = cx + Math.cos(a) * (radius + (compact ? 21 : 27));
      const labelY = cy + Math.sin(a) * (radius + (compact ? 21 : 27));
      const dot = {
        x: cx + Math.cos(a) * radius * Math.max(0.06, skill.value / 99),
        y: cy + Math.sin(a) * radius * Math.max(0.06, skill.value / 99),
      };
      chart += `<circle cx="${dot.x.toFixed(1)}" cy="${dot.y.toFixed(1)}" r="3.5" fill="${i % 2 ? t.teal : t.cyan}"/>`;
      chart += label(
        skill.name,
        labelX,
        labelY + 4,
        compact ? 62 : 82,
        compact ? 8 : 10,
        t.ink,
        700,
        1,
        'middle',
      );
      if (!compact)
        chart += label(
          String(skill.value),
          cx + Math.cos(a) * (radius - 10),
          cy + Math.sin(a) * (radius - 10) + 3,
          24,
          8,
          t.ink,
          800,
          1,
          'middle',
        );
    });
  const identity = compact
    ? jersey(24, 94, 38, c.jerseyNumber, t.royal, c.displayName, t) +
      label(c.displayName, 73, 115, 112, 16, t.ink, 800) +
      label(c.favoriteClub, 73, 133, 112, 9, t.teal, 700)
    : panel(24, 100, 220, 150, t, o.context?.character.skin.corner) +
      jersey(37, 116, 70, c.jerseyNumber, t.royal, c.displayName, t) +
      label(c.displayName, 121, 139, 110, 18, t.ink, 800, 2) +
      label(c.role, 121, 178, 110, 10, t.cyan, 700) +
      label(c.favoriteClub, 38, 230, 190, 10, t.teal, 700);
  const template = o.context?.template ?? o.template ?? c.cardTemplates?.['player-card'] ?? 'radar';
  const body =
    layoutElement(
      c,
      o,
      'player-card',
      template,
      'player-identity',
      'Player identity',
      24,
      compact ? 94 : 100,
      identity,
    ) +
    layoutElement(
      c,
      o,
      'player-card',
      template,
      'player-radar',
      'Skill radar chart',
      cx - radius,
      cy - radius,
      chart,
    );
  return shell(
    'player-card',
    c,
    theme,
    o,
    'STRIKER ID / RADAR PROFILE',
    `${c.skillSource === 'demo' ? 'DEMO RATINGS' : 'SELF-ASSESSMENT'} / 0–99${pageNote('player-card', c, o)}`,
    body,
  );
}
export const renderPlayerCardSvg: Renderer = (c, theme, o = DEFAULT_OPTIONS) => {
  if (templateFor('player-card', c, o) === 'radar') return renderPlayerRadarSvg(c, theme, o);
  const t = o.context?.tokens ?? THEME_TOKENS[theme],
    compact = o.layout === 'compact',
    w = widthFor(o),
    cols = compact ? 2 : 3,
    skin = o.context?.character.skin ?? CHARACTER_SKINS[c.character];
  const template = o.context?.template ?? o.template ?? c.cardTemplates?.['player-card'] ?? 'bars';
  const identity = compact
    ? jersey(24, 90, 44, c.jerseyNumber, t.royal, c.displayName, t) +
      label(c.displayName, 82, 112, 294, 24, t.ink, 800) +
      label(c.favoriteClub, 82, 136, 294, 11, t.teal, 700)
    : panel(24, 96, 246, 160, t, skin.corner) +
      jersey(34, 109, 78, c.jerseyNumber, t.royal, c.displayName, t) +
      label(c.displayName, 127, 127, 130, 25, t.ink, 800, 2) +
      label(c.role, 127, 183, 130, 12, t.cyan, 700) +
      label(c.philosophy, 38, 218, 218, 12, t.muted) +
      label(c.favoriteClub, 38, 244, 218, 11, t.teal, 700);
  let body = layoutElement(
    c,
    o,
    'player-card',
    template,
    'player-identity',
    'Player identity',
    24,
    compact ? 90 : 96,
    identity,
  );
  const pageSize = itemsPerPage('player-card', o.context?.template ?? o.template) ?? 6;
  const sx = compact ? 24 : 294,
    sw = compact ? 352 : 482,
    gap = compact ? 16 : 12,
    cw = (sw - gap * (cols - 1)) / cols,
    items = c.skills.slice(
      currentPage('player-card', c, o) * pageSize,
      currentPage('player-card', c, o) * pageSize + pageSize,
    );
  items.forEach((s, i) => {
    const x = sx + (i % cols) * (cw + gap),
      y = (compact ? 153 : 100) + Math.floor(i / cols) * (compact ? 44 : 80),
      by = y + (compact ? 34 : 59);
    const skillMarkup =
      label(s.name, x, y + 17, cw - (compact ? 39 : 0), compact ? 15 : 17, t.ink, 800) +
      label(
        String(s.value).padStart(2, '0'),
        x + cw,
        y + (compact ? 27 : 48),
        38,
        compact ? 27 : 32,
        t.cyan,
        800,
        1,
        'end',
      ) +
      `<path d="M${x} ${by}h${cw}" stroke="${t.cardBorder}" stroke-width="3"/><path class="reveal skill-bar skin-bar-${skin.bar}" data-skin-bar="${skin.bar}" d="M${x} ${by}h${(cw * Math.min(99, Math.max(0, s.value))) / 99}" stroke="${i % 2 ? t.teal : t.cyan}" stroke-width="3"/>`;
    body += layoutElement(
      c,
      o,
      'player-card',
      template,
      `skill-${s.id ?? currentPage('player-card', c, o) * 6 + i}`,
      `${s.name} rating`,
      x,
      y,
      skillMarkup,
    );
  });
  if (!items.length)
    body += label(
      'Add your AI capabilities in Customize.',
      sx,
      compact ? 179 : 145,
      sw,
      14,
      t.muted,
      400,
      2,
    );
  return shell(
    'player-card',
    c,
    theme,
    o,
    'STRIKER ID / PLAYER CARD',
    `${c.skillSource === 'demo' ? 'DEMO RATINGS' : 'SELF-ASSESSMENT'} / 0–99${pageNote('player-card', c, o)}`,
    body,
  );
};
/** Paths follow the configured vertical-pitch coordinates. */
export function pitchConnections(c: ProfileConfig): [string, string][] {
  const layers = ['GK', 'DF', 'MF', 'FW'];
  return layers.slice(0, -1).flatMap((role, i) => {
    const from = c.pitchTechs.filter((n) => n.role === role),
      to = c.pitchTechs.filter((n) => n.role === layers[i + 1]);
    return from.length
      ? to.map(
          (n) =>
            [
              from.reduce(
                (best, p) => (Math.abs(p.x - n.x) < Math.abs(best.x - n.x) ? p : best),
                from[0],
              ).id,
              n.id,
            ] as [string, string],
        )
      : [];
  });
}
function renderFormationListSvg(c: ProfileConfig, theme: ThemeMode, o: RenderOptions): string {
  const t = o.context?.tokens ?? THEME_TOKENS[theme];
  const compact = o.layout === 'compact';
  const w = widthFor(o, 'tech-pitch');
  const skin = o.context?.character.skin ?? CHARACTER_SKINS[c.character];
  const roles: TacticalPitchPosition['role'][] = ['FW', 'MF', 'DF', 'GK'];
  const ordered = roles.flatMap((role) =>
    c.pitchTechs.filter((node) => node.role === role).sort((a, b) => a.x - b.x),
  );
  const rowHeight = compact ? 32 : 36;
  const body = ordered
    .map((node, index) => {
      const x = 24,
        y = 91 + index * rowHeight;
      const color =
        node.role === 'FW'
          ? t.crimson
          : node.role === 'MF'
            ? t.cyan
            : node.role === 'DF'
              ? t.teal
              : t.signal;
      const content =
        panel(x, y, w - 48, rowHeight - 3, t, skin.corner) +
        `<circle cx="${x + 15}" cy="${y + (rowHeight - 3) / 2}" r="4" fill="${color}"/>` +
        label(node.role, x + 26, y + 17, 28, 9, color, 800) +
        techIcon(node.tech, x + 61, y + (rowHeight - 3) / 2 - 7, color, 14) +
        label(
          c.presentation?.techLabels?.[node.id] ?? node.tech,
          x + 82,
          y + 16,
          compact ? 165 : 220,
          compact ? 11 : 13,
          t.ink,
          700,
        ) +
        label(
          node.subTech ?? node.positionName,
          w - 34,
          y + 16,
          compact ? 105 : 140,
          compact ? 8 : 9,
          t.muted,
          500,
          1,
          'end',
        );
      return layoutElement(
        c,
        o,
        'tech-pitch',
        'formation-list',
        `formation-tech:${node.id}`,
        `${node.role} · ${node.tech}`,
        x,
        y,
        content,
      );
    })
    .join('');
  return shell(
    'tech-pitch',
    c,
    theme,
    o,
    'FORMATION / TECH STACK',
    `${ordered.length} PLAYER POSITIONS · ${c.pitchFormation}`,
    ordered.length ? body : empty(w, 'Add technologies to your formation.', t.muted),
  );
}
export const renderTechPitchSvg: Renderer = (c, theme, o = DEFAULT_OPTIONS) => {
  const template = templateFor('tech-pitch', c, o);
  if (template === 'formation-list') return renderFormationListSvg(c, theme, o);
  const t = o.context?.tokens ?? THEME_TOKENS[theme],
    compact = o.layout === 'compact',
    w = widthFor(o, 'tech-pitch'),
    skin = o.context?.character.skin ?? CHARACTER_SKINS[c.character];
  const px = 24,
    py = 89,
    pw = w - 48,
    ph = compact ? 368 : 468;
  const color = (r: string) =>
    r === 'FW' ? t.crimson : r === 'MF' ? t.cyan : r === 'DF' ? t.teal : t.signal;
  const inset = compact ? 34 : 42,
    top = 24,
    bottom = 56;
  const nodes = c.pitchTechs.map((n) => ({
    ...n,
    px: px + inset + (n.x / 100) * (pw - inset * 2),
    py: py + top + (n.y / 100) * (ph - top - bottom),
  }));
  const cx = px + pw / 2,
    cy = py + ph / 2;
  let body = `<rect data-pitch="vertical" x="${px}" y="${py}" width="${pw}" height="${ph}" rx="8" fill="${t.pitchGreen}" stroke="${t.pitchLine}"/>
    <g fill="${t.pitchLine}" opacity=".055">${Array.from({ length: 4 }, (_, i) => `<rect x="${px}" y="${py + (i * ph) / 4}" width="${pw}" height="${ph / 8}"/>`).join('')}</g>
    <g stroke="${t.pitchLine}" fill="none" opacity=".75"><path d="M${px} ${cy}h${pw}"/><circle cx="${cx}" cy="${cy}" r="${compact ? 39 : 49}"/>
    <path d="M${cx - pw * 0.26} ${py}v${ph * 0.13}h${pw * 0.52}v-${ph * 0.13}M${cx - pw * 0.26} ${py + ph}v-${ph * 0.13}h${pw * 0.52}v${ph * 0.13}"/>
    <path d="M${cx - pw * 0.12} ${py}v${ph * 0.045}h${pw * 0.24}v-${ph * 0.045}M${cx - pw * 0.12} ${py + ph}v-${ph * 0.045}h${pw * 0.24}v${ph * 0.045}"/>
    <path d="M${cx - 20} ${py}v-5h40v5M${cx - 20} ${py + ph}v5h40v-5"/></g>`;
  body += pitchConnections(c)
    .map(([a, b]) => {
      const from = nodes.find((n) => n.id === a)!,
        to = nodes.find((n) => n.id === b)!;
      return `<path data-from="${esc(a)}" data-to="${esc(b)}" data-skin-link="${skin.link}" d="${connectionPath(from.px, from.py, to.px, to.py, skin.link)}" stroke="${t.pitchLine}" opacity=".6" ${skin.link === 'dash' || skin.link === 'bolt' ? 'stroke-dasharray="3 5"' : ''} fill="none"/>`;
    })
    .join('');
  const route = ['GK', 'DF', 'MF', 'FW']
    .map(
      (r) =>
        nodes
          .filter((n) => n.role === r)
          .sort((a, b) => Math.abs(a.x - 50) - Math.abs(b.x - 50))[0],
    )
    .filter(Boolean);
  if (route.length > 1) {
    const d = route.slice(1).reduce((path, node, index) => {
      const previous = route[index]!;
      return `${path}${connectionPath(previous.px, previous.py, node.px, node.py, skin.link).replace(/^M[^LQC]+/, '')}`;
    }, `M${route[0]!.px} ${route[0]!.py}`);
    const runnerDuration = o.context?.timeline.cycleSeconds ?? 16;
    const runner =
      c.animationLevel === 'full' || c.animationLevel === 'cinematic'
        ? `<g class="runner" opacity="0"><circle r="3" fill="${t.ink}"/><animateMotion dur="${runnerDuration}s" repeatCount="indefinite" path="${d}"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.08;.9;1" dur="${runnerDuration}s" repeatCount="indefinite"/></g>`
        : '';
    body += `<path d="${d}" stroke="${t.cyan}" fill="none" opacity=".25" stroke-width="2"/>${runner}`;
  }
  nodes.forEach((n) => {
    const count = nodes.filter((other) => other.role === n.role).length;
    const labelW = Math.min(
      compact ? 112 : 140,
      count > 1 ? ((pw - inset * 2) * 0.76) / (count - 1) - 6 : pw - 32,
    );
    const fs = compact ? 13 : 15;
    const labelX = Math.max(px + labelW / 2 + 5, Math.min(px + pw - labelW / 2 - 5, n.px));
    const text = textBlock(
      c.presentation?.techLabels?.[n.id] ?? n.tech,
      labelX,
      n.py + 31,
      labelW,
      fs,
      t.ink,
      { weight: 600, anchor: 'middle', maxLines: 2 },
    );
    const nodeMarkup =
      `<g data-node="${esc(n.id)}">${skinCell(n.px - (compact ? 16 : 18), n.py - (compact ? 16 : 18), (compact ? 16 : 18) * 2, (compact ? 16 : 18) * 2, skin.cell, t.deep, `stroke="${color(n.role)}" stroke-width="1.5"`)}` +
      techIcon(n.tech, n.px - 9, n.py - 9, color(n.role), 18) +
      `<rect x="${labelX - labelW / 2 - 3}" y="${n.py + 17}" width="${labelW + 6}" height="${text.height + 3}" rx="4" fill="${t.pitchGreen}"/>` +
      text.svg +
      '</g>';
    body += layoutElement(
      c,
      o,
      'tech-pitch',
      o.context?.template ?? o.template ?? 'pitch',
      `pitch-node:${n.id}`,
      `${n.role} · ${n.tech}`,
      n.px,
      n.py,
      nodeMarkup,
    );
  });
  if (!nodes.length) body = empty(w, 'Add technologies to your formation.', t.muted);
  return shell(
    'tech-pitch',
    c,
    theme,
    o,
    `TACTICAL TECH / ${c.pitchFormation}`,
    c.presetLabel,
    body,
  );
};
export const renderMatchStatsSvg: Renderer = (c, theme, o = DEFAULT_OPTIONS) => {
  const template = templateFor('match-stats', c, o);
  const t = o.context?.tokens ?? THEME_TOKENS[theme],
    compact = o.layout === 'compact',
    w = widthFor(o),
    cols = compact ? 3 : 5,
    cw = (w - 48) / cols,
    skin = o.context?.character.skin ?? CHARACTER_SKINS[c.character];
  const metrics: [keyof ProfileConfig['matchStats'], string, string][] = [
    ['goals', 'GOALS', 'Commits'],
    ['assists', 'ASSISTS', 'Pull requests'],
    ['mvpVotes', 'MVP', 'Stars'],
    ['matches', 'MATCHES', 'Public repos'],
    ['winStreak', 'STREAK', 'Days'],
  ];
  let body = '';
  if (template === 'ticker') {
    const max = Math.max(1, ...metrics.map(([key]) => c.matchStats[key]));
    metrics.forEach(([key, name, note], i) => {
      const y = 92 + i * 24;
      const value = c.matchStats[key];
      const barX = compact ? 112 : 155;
      const barW = w - barX - 76;
      const row =
        label(name, 24, y + 9, barX - 33, 9, t.muted, 700) +
        `<rect x="${barX}" y="${y + 2}" width="${barW}" height="5" rx="2.5" fill="${t.cardBorder}"/><rect x="${barX}" y="${y + 2}" width="${(barW * value) / max}" height="5" rx="2.5" fill="${i % 2 ? t.teal : t.cyan}"/>` +
        label(value.toLocaleString('en-US'), w - 38, y + 9, 55, 10, t.ink, 800, 1, 'end') +
        label(provenance(c.statSources[key])[0], w - 18, y + 9, 16, 7, t.signal, 700, 1, 'end');
      body += layoutElement(
        c,
        o,
        'match-stats',
        template,
        `stat-${key}`,
        `${name}: ${note}`,
        24,
        y,
        row,
      );
    });
  } else
    metrics.forEach(([key, name, note], i) => {
      const x = 24 + (i % cols) * cw,
        y = compact ? 87 + Math.floor(i / cols) * 55 : 95;
      if (i % cols)
        body += `<path d="M${x - 9} ${y}v${compact ? 43 : 60}" stroke="${t.cardBorder}"/>`;
      const value = String(c.matchStats[key].toLocaleString('en-US')),
        fs = textWidth(value, compact ? 28 : 36, 'title') > cw - 35 ? 22 : compact ? 28 : 36;
      const item =
        label(name, x, y + 8, cw - 15, 12, t.cyan, 800) +
        label(value, x, y + 35, cw - 32, fs, t.ink, 800) +
        label(provenance(c.statSources[key])[0], x + cw - 23, y + 29, 15, 10, t.signal, 700) +
        label(note, x, y + (compact ? 48 : 55), cw - 15, 12, t.muted);
      body += layoutElement(
        c,
        o,
        'match-stats',
        o.context?.template ?? o.template ?? 'scoreboard',
        `stat-${key}`,
        `${name}: ${note}`,
        x,
        y,
        item,
      );
    });
  const goal = c.matchStats.goalThreshold > 0 && c.matchStats.goals >= c.matchStats.goalThreshold;
  const footerY = template === 'ticker' ? (compact ? 238 : 222) : compact ? 208 : 177;
  body += label('D Demo · M Manual · G GitHub', 24, footerY, w - 48, 10, t.muted);
  if (goal)
    body +=
      `<path class="sweep" d="M${w - 76} ${footerY - 15}h52" stroke="${t.crimson}" stroke-width="2" opacity=".5"/>` +
      layoutElement(
        c,
        o,
        'match-stats',
        template,
        'goal-flash',
        'Goal flash effect',
        w - 50,
        footerY - 15,
        `<g class="goal-flash" data-skin-flash="${skin.flash}" opacity=".72">${impactGraphic(w - 50, footerY - 15, skin.flash, t.crimson)}</g>`,
      ) +
      label('GOAL!', w - 24, footerY, 52, 12, t.crimson, 800, 1, 'end');
  body += layoutElement(
    c,
    o,
    'match-stats',
    template,
    'mini-ball',
    'Mini football',
    w - 19,
    footerY - 3,
    miniBall(w - 19, footerY - 3, t),
  );
  return shell(
    'match-stats',
    c,
    theme,
    o,
    'MATCHDAY / SCOREBOARD',
    'GITHUB METRICS / SOURCE LEGEND BELOW',
    body,
  );
};
export const renderLeagueTableSvg: Renderer = (c, theme, o = DEFAULT_OPTIONS) => {
  const template = templateFor('league-table', c, o);
  const t = o.context?.tokens ?? THEME_TOKENS[theme],
    compact = o.layout === 'compact',
    w = widthFor(o),
    cols = compact ? 2 : 3,
    cw = (w - 48) / cols,
    skin = o.context?.character.skin ?? CHARACTER_SKINS[c.character];
  const sorted = [...c.languages].sort((a, b) => b.percent - a.percent),
    total = sorted.reduce((s, l) => s + l.percent, 0);
  let body = '',
    offset = 24;
  if (template !== 'podium')
    sorted.forEach((l) => {
      const bw = total ? ((w - 48) * l.percent) / total : 0;
      body += `<rect class="reveal skin-bar-${skin.bar}" data-skin-bar="${skin.bar}" x="${offset}" y="92" width="${bw}" height="9" fill="${esc(l.color)}"/>`;
      offset += bw;
    });
  const pageSize = itemsPerPage('league-table', o.context?.template ?? o.template) ?? 6;
  const visibleLanguages = sorted.slice(
    currentPage('league-table', c, o) * pageSize,
    currentPage('league-table', c, o) * pageSize + pageSize,
  );
  if (template === 'podium') {
    const podium = visibleLanguages.slice(0, 3);
    const max = Math.max(1, ...podium.map((language) => language.percent));
    const positions = compact ? [92, 200, 308] : [150, 400, 650];
    podium.forEach((language, index) => {
      const cx = positions[index] ?? positions[0];
      const baseline = compact ? 166 : 166;
      const barHeight = 18 + 27 * (language.percent / max);
      const content =
        label(
          language.name,
          cx,
          compact ? 99 : 101,
          compact ? 86 : 150,
          10,
          t.ink,
          700,
          1,
          'middle',
        ) +
        label(
          `${language.percent.toFixed(1)}%`,
          cx,
          compact ? 112 : 114,
          70,
          9,
          t.cyan,
          800,
          1,
          'middle',
        ) +
        `<rect x="${cx - (compact ? 24 : 34)}" y="${baseline - barHeight}" width="${compact ? 48 : 68}" height="${barHeight}" rx="5" fill="${esc(language.color)}" opacity=".84"/>` +
        label(
          String(currentPage('league-table', c, o) * pageSize + index + 1).padStart(2, '0'),
          cx,
          baseline - barHeight + 15,
          32,
          10,
          t.deep,
          900,
          1,
          'middle',
        );
      body += layoutElement(
        c,
        o,
        'league-table',
        template,
        `language-${language.id ?? language.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        `${language.name} podium position`,
        cx - (compact ? 43 : 75),
        compact ? 99 : 101,
        content,
      );
    });
    visibleLanguages.slice(3).forEach((language, index) => {
      const y = (compact ? 177 : 170) + index * (compact ? 16 : 15);
      const x = 24;
      const row =
        label(
          String(currentPage('league-table', c, o) * pageSize + index + 4).padStart(2, '0'),
          x,
          y + 9,
          20,
          8,
          t.muted,
          700,
        ) +
        label(language.name, x + 28, y + 9, w - 154, 9, t.ink, 600) +
        `<rect x="${w - 111}" y="${y + 2}" width="65" height="5" rx="2.5" fill="${t.cardBorder}"/><rect x="${w - 111}" y="${y + 2}" width="${(65 * language.percent) / max}" height="5" rx="2.5" fill="${esc(language.color)}"/>` +
        label(`${language.percent.toFixed(1)}%`, w - 26, y + 9, 48, 8, t.cyan, 700, 1, 'end');
      body += layoutElement(
        c,
        o,
        'league-table',
        template,
        `language-${language.id ?? language.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        `${language.name} ranked language`,
        x,
        y,
        row,
      );
    });
  } else
    visibleLanguages.forEach((l, i) => {
      const x = 24 + (i % cols) * cw,
        y = compact ? 125 + Math.floor(i / cols) * 33 : 135 + Math.floor(i / cols) * 32;
      const row =
        label(
          String(currentPage('league-table', c, o) * 6 + i + 1).padStart(2, '0'),
          x,
          y,
          17,
          10,
          t.muted,
          700,
        ) +
        techIcon(l.name, x + 20, y - 12, l.color, 13) +
        label(l.name, x + 41, y, cw - 90, 13, t.ink, 600, compact ? 2 : 1) +
        label(`${l.percent.toFixed(1)}%`, x + cw - 12, y, 46, 12, t.cyan, 600, 1, 'end');
      body += layoutElement(
        c,
        o,
        'league-table',
        o.context?.template ?? o.template ?? 'table',
        `language-${l.id ?? l.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        `${l.name} language share`,
        x,
        y - 12,
        row,
      );
    });
  if (!sorted.length) body = empty(w, 'Add language distribution data.', t.muted);
  body += label(
    `Language share / not a skill rating${Math.abs(total - 100) > 0.1 && sorted.length ? ` / total ${total.toFixed(1)}%` : ''}`,
    24,
    !sorted.length ? 155 : compact ? 226 : 220,
    w - 48,
    10,
    t.muted,
  );
  return shell(
    'league-table',
    c,
    theme,
    o,
    'LEAGUE TABLE / LANGUAGES',
    provenance(c.languageSource) + pageNote('league-table', c, o),
    body,
  );
};
export const renderProjectsSvg: Renderer = (c, theme, o = DEFAULT_OPTIONS) => {
  const template = templateFor('projects', c, o);
  const t = o.context?.tokens ?? THEME_TOKENS[theme],
    compact = o.layout === 'compact',
    w = widthFor(o),
    skin = o.context?.character.skin ?? CHARACTER_SKINS[c.character];
  let body = '';
  const pageSize = itemsPerPage('projects', o.context?.template ?? o.template) ?? 3;
  c.projects
    .slice(
      currentPage('projects', c, o) * pageSize,
      currentPage('projects', c, o) * pageSize + pageSize,
    )
    .forEach((p, i) => {
      const isTransferList = template === 'compact-list';
      const y = isTransferList ? 94 + i * (compact ? 49 : 48) : 92 + i * 73,
        overrides = c.presentation?.projectSummaries?.[p.id],
        summary = (compact ? overrides?.compact : overrides?.wide) ?? p.description;
      if (isTransferList) {
        const row =
          `<path d="M24 ${y + 10}H${w - 24}" stroke="${t.cardBorder}"/>` +
          label(p.number, 28, y + 24, 34, 15, t.cyan, 800) +
          label(p.name, 72, y + 24, compact ? 164 : 210, 15, t.ink, 800) +
          label(p.rating || `${p.stars} ★`, w - 28, y + 24, 82, 12, t.signal, 700, 1, 'end') +
          label(p.primaryTech, 72, y + 41, compact ? 260 : 330, 9, t.teal, 600) +
          label(p.status, w - 28, y + 41, 78, 8, t.muted, 700, 1, 'end');
        body += layoutElement(
          c,
          o,
          'projects',
          template,
          `project-${p.id}`,
          `${p.name} scouting row`,
          24,
          y,
          row,
        );
        return;
      }
      let card =
        panel(24, y, w - 48, 65, t, skin.corner) +
        `<path ${i ? '' : 'class="sweep"'} d="M24 ${y + 10}v45" stroke="${i ? t.royal : t.cyan}" stroke-width="3"/>`;
      const nx = compact ? 54 : 82,
        nw = compact ? 220 : 330;
      card +=
        label(p.number, 35, y + 24, compact ? 15 : 31, compact ? 14 : 21, t.cyan, 800) +
        label(p.name, nx, y + 23, nw, compact ? 18 : 22, t.ink, 800) +
        label(summary, nx, y + 44, compact ? 302 : 350, compact ? 14 : 12, t.muted) +
        label(
          p.status,
          w - 36,
          y + 21,
          compact ? 85 : 108,
          compact ? 10 : 12,
          p.status === 'EVOLVING' ? t.signal : t.teal,
          700,
          1,
          'end',
        );
      if (compact) card += label(p.primaryTech, nx, y + 59, 302, 11, t.teal, 600);
      else {
        const techs = p.primaryTech
          .split(/\s*[·,|]\s*/)
          .filter(Boolean)
          .slice(0, 3);
        techs.forEach((s, j) => {
          const tx = 443 + j * 78;
          card +=
            `<rect x="${tx}" y="${y + 34}" width="74" height="20" rx="4" fill="${t.deep}"/>` +
            label(s, tx + 37, y + 48, 68, 10, t.teal, 600, 1, 'middle');
        });
        card += label(`★ ${p.stars}`, w - 36, y + 48, 55, 12, t.muted, 400, 1, 'end');
      }
      body += layoutElement(
        c,
        o,
        'projects',
        o.context?.template ?? o.template ?? 'squad-cards',
        `project-${p.id}`,
        `${p.name} project card`,
        24,
        y,
        card,
      );
    });
  if (!c.projects.length) body = empty(w, 'Add a project to your starting squad.', t.muted);
  return shell(
    'projects',
    c,
    theme,
    o,
    'STARTING SQUAD / PROJECTS',
    `${provenance(c.projectSource)} / PROBLEMS · STACKS · STATUS${pageNote('projects', c, o)}`,
    body,
  );
};
export const renderSeasonSvg: Renderer = (c, theme, o = DEFAULT_OPTIONS) => {
  const template = templateFor('season', c, o);
  const t = o.context?.tokens ?? THEME_TOKENS[theme],
    compact = o.layout === 'compact',
    w = widthFor(o),
    cols = compact ? 26 : 52,
    step = (w - 48) / cols,
    cell = compact ? 10 : 10,
    skin = o.context?.character.skin ?? CHARACTER_SKINS[c.character];
  const days =
    c.seasonSource === 'demo'
      ? Array.from({ length: 364 }, (_, i) => ({
          date: '',
          count: (i * 17 + 23) % 29 < 10 ? 0 : ((i * 7) % 12) + 1,
        }))
      : (() => {
          if (!c.seasonDays.length) return [];
          const end = new Date(
            [...c.seasonDays].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!.date +
              'T00:00:00Z',
          );
          end.setUTCDate(end.getUTCDate() + 6 - end.getUTCDay());
          const byDate = new Map(c.seasonDays.map((d) => [d.date, d.count]));
          return Array.from({ length: 364 }, (_, i) => {
            const date = new Date(end);
            date.setUTCDate(date.getUTCDate() - 363 + i);
            const key = date.toISOString().slice(0, 10);
            return { date: key, count: byDate.get(key) ?? 0 };
          });
        })();
  const contributionPalette = resolveCharacterPalette(
    c,
    o.context?.character.id ?? c.character,
    theme,
  ).contributions;
  const colors = contributionPalette ?? [t.cardBg, t.seasonLevel1, t.seasonLevel2, t.cyan, t.teal];
  if (template === 'calendar-grid') {
    if (!days.length)
      return shell(
        'season',
        c,
        theme,
        o,
        'SEASON / CALENDAR GRID',
        'MANUAL / NO ACTIVITY DATA',
        empty(w, 'Add daily activity counts in Customize.', t.muted),
      );
    const byDate = new Map<string, number>();
    if (c.seasonSource === 'demo') {
      const start = new Date(Date.UTC(2025, 0, 1));
      days.forEach((day, index) => {
        const date = new Date(start);
        date.setUTCDate(date.getUTCDate() + index);
        byDate.set(date.toISOString().slice(0, 10), day.count);
      });
    } else c.seasonDays.forEach((day) => byDate.set(day.date, day.count));
    const endDate =
      c.seasonSource === 'demo'
        ? new Date(Date.UTC(2025, 11, 31))
        : new Date(
            [...c.seasonDays].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!.date +
              'T00:00:00Z',
          );
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(
        Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - 11 + index, 1),
      );
      return { year: date.getUTCFullYear(), month: date.getUTCMonth(), date };
    });
    const columns = compact ? 3 : 4;
    const boxWidth = (w - 48) / columns;
    const boxHeight = compact ? 41 : 33;
    const cellWidth = Math.min(compact ? 7.2 : 8, (boxWidth - 14) / 7);
    const cellHeight = compact ? 5 : 4.2;
    let calendarTotal = 0;
    const calendar = months
      .map(({ year, month, date }, index) => {
        const col = index % columns,
          row = Math.floor(index / columns);
        const x = 24 + col * boxWidth,
          y = compact ? 96 + row * boxHeight : 101 + row * boxHeight;
        let cells = label(
          date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
          x,
          y + 7,
          boxWidth - 8,
          7,
          t.cyan,
          700,
        );
        const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const count = byDate.get(dateKey) ?? 0;
          calendarTotal += count;
          const level = contributionLevel(count);
          const xCell = x + 3 + ((first + day - 1) % 7) * cellWidth;
          const yCell = y + 11 + Math.floor((first + day - 1) / 7) * cellHeight;
          cells += `<g data-contribution-date="${dateKey}" data-contribution-count="${count}" data-contribution-level="${level}"><title>${dateKey}: ${count}</title>${skinCell(xCell, yCell, cellWidth - 0.8, cellHeight - 0.7, skin.cell, colors[level])}</g>`;
        }
        return layoutElement(
          c,
          o,
          'season',
          template,
          `calendar-${year}-${String(month + 1).padStart(2, '0')}`,
          `${date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })} activity calendar`,
          x,
          y,
          cells,
        );
      })
      .join('');
    const body =
      calendar +
      label(
        `${calendarTotal} TOTAL / ${c.seasonSource === 'demo' ? 'SIMULATED ACTIVITY' : c.seasonSource === 'github' ? 'GITHUB CONTRIBUTIONS' : 'RECORDED ACTIVITY'}`,
        24,
        compact ? 267 : 220,
        contributionPalette ? w - 200 : w - 48,
        compact ? 9 : 11,
        t.ink,
        600,
      ) +
      (contributionPalette
        ? contributionLegend(colors, w - 156, (compact ? 267 : 220) - 8, t.muted)
        : '');
    return shell(
      'season',
      c,
      theme,
      o,
      'SEASON / CALENDAR GRID',
      c.seasonSource === 'demo'
        ? 'DEMO / SIMULATED ACTIVITY'
        : `${provenance(c.seasonSource)} / LAST 12 MONTHS`,
      body,
    );
  }
  let body = '';
  for (let block = 0; block < (compact ? 2 : 1); block++) {
    const y = compact ? 100 + block * 86 : 109;
    if (compact)
      body += label(`WEEKS ${block * 26 + 1}–${(block + 1) * 26}`, 24, y - 9, 200, 9, t.muted);
    else
      for (let month = 0; month < 12; month++) {
        const sample = days[Math.floor((month * 364) / 12)];
        const name = sample?.date
          ? new Date(sample.date + 'T00:00:00Z').toLocaleString('en-US', {
              month: 'short',
              timeZone: 'UTC',
            })
          : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
              month
            ];
        body += label(name, 24 + (month * (w - 48)) / 12, y - 9, 48, 9, t.muted);
      }
    for (let col = 0; col < cols; col++)
      for (let day = 0; day < 7; day++) {
        const d = days[(block * cols + col) * 7 + day];
        if (!d) continue;
        const level = contributionLevel(d.count);
        const x = 24 + col * step;
        const cellY = y + day * (compact ? 10 : 11);
        body += `<g data-contribution-date="${esc(d.date || 'demo')}" data-contribution-count="${d.count}" data-contribution-level="${level}"><title>${esc(d.date || 'Demo day')}: ${d.count}</title>${skinCell(x, cellY, compact ? 10 : cell, 8, skin.cell, colors[level])}</g>`;
      }
  }
  if (!days.length) body = empty(w, 'Add your daily activity counts in Customize.', t.muted);
  else
    body = layoutElement(
      c,
      o,
      'season',
      o.context?.template ?? o.template ?? 'turf',
      'activity-grid',
      'Contribution activity grid',
      24,
      compact ? 91 : 100,
      body,
    );
  const total = days.reduce((s, d) => s + d.count, 0);
  body += label(
    `${total} TOTAL / ${c.seasonSource === 'demo' ? 'SIMULATED ACTIVITY' : c.seasonSource === 'github' ? 'GITHUB CONTRIBUTIONS' : 'RECORDED ACTIVITY'}`,
    24,
    !days.length ? 155 : compact ? 269 : 204,
    contributionPalette ? w - 200 : w - 160,
    compact ? 10 : 12,
    t.ink,
    600,
  );
  if (contributionPalette)
    body += contributionLegend(colors, w - 156, !days.length ? 146 : compact ? 260 : 195, t.muted);
  else
    colors.forEach(
      (color, i) =>
        (body += skinCell(
          w - 114 + i * 18,
          !days.length ? 146 : compact ? 260 : 195,
          12,
          9,
          skin.cell,
          color,
        )),
    );
  return shell(
    'season',
    c,
    theme,
    o,
    'SEASON TURF / ACTIVITY',
    c.seasonSource === 'demo'
      ? 'DEMO / SIMULATED ACTIVITY'
      : c.seasonSource === 'github'
        ? 'GITHUB API / CONTRIBUTION CALENDAR'
        : 'MANUAL / RECORDED DAILY COUNTS',
    body,
  );
};
export const renderFooterSvg: Renderer = (c, theme, o = DEFAULT_OPTIONS) => {
  const template = templateFor('footer', c, o);
  if (template === 'transfer-window') return renderTransferWindow(c, theme, o);
  const t = o.context?.tokens ?? THEME_TOKENS[theme],
    compact = o.layout === 'compact',
    w = widthFor(o);
  const status =
    c.transferStatus === 'OPEN'
      ? 'OPEN TO COLLABORATE'
      : c.transferStatus === 'CLOSED'
        ? 'FOCUSED ON CURRENT WORK'
        : 'LET’S TALK / NEGOTIATING';
  const color =
    c.transferStatus === 'OPEN' ? t.teal : c.transferStatus === 'CLOSED' ? t.muted : t.signal;
  if (template === 'full-time-strip') {
    const statusRow = layoutElement(
      c,
      o,
      'footer',
      template,
      'footer-status',
      'Collaboration status',
      24,
      100,
      `<circle cx="30" cy="108" r="5" fill="${color}"/>${label(status, 44, 114, w - 72, compact ? 18 : 22, color, 800)}`,
    );
    const contacts = [
      ['GITHUB', c.socials.github ? `@${c.socials.github}` : ''],
      ['EMAIL', c.socials.email ?? ''],
      ['WEB', c.socials.portfolio ?? ''],
    ].filter(([, value]) => value);
    const contactMarkup = contacts
      .map(([name, value], index) =>
        layoutElement(
          c,
          o,
          'footer',
          template,
          `contact-${name.toLowerCase()}`,
          `${name} contact`,
          compact ? 24 : 300 + index * 155,
          compact ? 144 + index * 24 : 132,
          label(
            name,
            compact ? 24 : 300 + index * 155,
            compact ? 144 + index * 24 : 132,
            48,
            9,
            t.cyan,
            700,
          ) +
            label(
              value,
              compact ? 78 : 300 + index * 155 + 52,
              compact ? 144 + index * 24 : 132,
              compact ? 280 : 100,
              11,
              t.ink,
              600,
            ),
        ),
      )
      .join('');
    const ballX = w - 19,
      ballY = compact ? 230 : 172;
    return shell(
      'footer',
      c,
      theme,
      o,
      'FULL TIME / SIGNOFF',
      'CONTACT LINKS IN YOUR EMBED SNIPPET',
      statusRow +
        contactMarkup +
        layoutElement(
          c,
          o,
          'footer',
          template,
          'mini-ball',
          'Mini football',
          ballX,
          ballY,
          miniBall(ballX, ballY, t),
        ) +
        label(
          'FAN-MADE / BLUE LOCK INSPIRED / EGO STRIKER',
          24,
          compact ? 224 : 165,
          w - 72,
          9,
          t.muted,
        ),
    );
  }
  return renderTransferWindow(c, theme, o);
};
export interface ComponentDefinition {
  id: ComponentId;
  name: string;
  filename: string;
  category: string;
  description: string;
  templates: string[];
  fields: (keyof ProfileConfig)[];
  layouts: RenderOptions['layout'][];
  baseSize?: { wide: [number, number]; compact: [number, number] };
  itemsPerPage?: number;
  render: Renderer;
}
export const COMPONENT_REGISTRY: ComponentDefinition[] = [
  {
    id: 'hero',
    name: 'Hero Banner',
    filename: 'hero',
    category: 'IDENTITY',
    description: 'Your entrance. Name, role, jersey & awakening aura.',
    templates: CARD_TEMPLATES.hero.map((template) => template.id),
    fields: ['displayName', 'role', 'egoTagline', 'jerseyNumber', 'positionName', 'presentation'],
    layouts: ['wide', 'compact'],
    render: renderHeroTemplate,
  },
  {
    id: 'player-card',
    name: 'Player Card',
    filename: 'player-card',
    category: 'IDENTITY',
    description: 'A striker ID with six AI engineering capabilities.',
    templates: CARD_TEMPLATES['player-card'].map((template) => template.id),
    fields: ['skills', 'skillSource', 'philosophy', 'favoriteClub'],
    layouts: ['wide', 'compact'],
    render: withRenderContext('player-card', renderPlayerCardSvg),
  },
  {
    id: 'tech-pitch',
    name: 'Tactical Tech Pitch',
    filename: 'tech-pitch',
    category: 'ENGINEERING',
    description: 'Eleven technologies. One AI engineering formation.',
    templates: CARD_TEMPLATES['tech-pitch'].map((template) => template.id),
    fields: ['pitchFormation', 'pitchTechs', 'presetLabel', 'presentation'],
    layouts: ['wide', 'compact'],
    render: withRenderContext('tech-pitch', renderTechPitchSvg),
  },
  {
    id: 'match-stats',
    name: 'Match Scoreboard',
    filename: 'match-stats',
    category: 'ACTIVITY',
    description: 'GitHub numbers with honest, per-value sources.',
    templates: CARD_TEMPLATES['match-stats'].map((template) => template.id),
    fields: ['matchStats', 'statSources'],
    layouts: ['wide', 'compact'],
    render: withRenderContext('match-stats', renderMatchStatsSvg),
  },
  {
    id: 'league-table',
    name: 'Language League',
    filename: 'league-table',
    category: 'ENGINEERING',
    description: 'Language distribution, separate from skill ratings.',
    templates: CARD_TEMPLATES['league-table'].map((template) => template.id),
    fields: ['languages', 'languageSource'],
    layouts: ['wide', 'compact'],
    render: withRenderContext('league-table', renderLeagueTableSvg),
  },
  {
    id: 'projects',
    name: 'Project Squad',
    filename: 'projects',
    category: 'ENGINEERING',
    description: 'Featured projects, problems and technology stacks.',
    templates: CARD_TEMPLATES.projects.map((template) => template.id),
    fields: ['projects', 'projectSource', 'presentation'],
    layouts: ['wide', 'compact'],
    render: withRenderContext('projects', renderProjectsSvg),
  },
  {
    id: 'season',
    name: 'Season Heatmap',
    filename: 'season',
    category: 'ACTIVITY',
    description: 'Stadium turf for demo or manually recorded activity.',
    templates: CARD_TEMPLATES.season.map((template) => template.id),
    fields: ['seasonDays', 'seasonSource'],
    layouts: ['wide', 'compact'],
    render: withRenderContext('season', renderSeasonSvg),
  },
  {
    id: 'footer',
    name: 'Transfer Window',
    filename: 'footer',
    category: 'IDENTITY',
    description: 'Collaboration status and your contact details.',
    templates: CARD_TEMPLATES.footer.map((template) => template.id),
    fields: ['transferStatus', 'socials'],
    layouts: ['wide', 'compact'],
    render: withRenderContext('footer', renderFooterSvg),
  },
];

for (const c of COMPONENT_REGISTRY) {
  c.baseSize = {
    wide: [widthFor({ layout: 'wide' }, c.id), heights[c.id][0]],
    compact: [400, heights[c.id][1]],
  };
  c.itemsPerPage =
    c.id === 'projects' ? 3 : c.id === 'league-table' || c.id === 'player-card' ? 6 : undefined;
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
