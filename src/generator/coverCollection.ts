import { ComponentId, ProfileConfig, RenderOptions, ThemeMode } from '../types';
import { getCardTemplate } from '../templates/registry';
import { ArtworkPose, getArtwork } from '../artwork/library';
import { createRenderContext } from './renderContext';
import { widthFor } from './frame';
import {
  esc,
  glyphDefinitions,
  textBlock,
  textWidth,
  wrapText,
  nameRevealOptions,
  TEXT_REVEAL_STYLES,
  textFieldReveal,
  heroTaglines,
  taglineCycle,
  type FontStyle,
} from './text';
import { FONT_LICENSES } from './fonts/licenses';
import { layoutElement } from './layoutElements';
import { compileElementMotion } from '../fx/presets';
import { techIcon } from './visual';
import { resolveHeroColors } from '../characters/heroColors';
import { renderChapterHeatmap } from './chapterHeatmap';
import { resolveCharacterPalette, contributionLevel } from '../characters/colorways';
import { contributionLegend } from './contributionLegend';
import { chain, movingCoverChain, COVER_CHAIN_REDUCED_MOTION } from './coverChain';
import { textElement, editionNote } from './textElements';

const source = (value: string) =>
  value === 'demo' ? 'DEMO' : value === 'github' ? 'GITHUB API' : 'MANUAL';

function heroTextSize(
  value: string,
  width: number,
  height: number,
  preferredSize: number,
  font: FontStyle,
  maxLines = 2,
) {
  let size = preferredSize;
  while (
    size > 12 &&
    wrapText(value, width, size, maxLines, font).length * Math.ceil(size * 1.15) > height
  )
    size--;
  return size;
}

/** Original artwork + editable vector information. No browser-only asset loading. */
export function renderCoverCollection(
  id: ComponentId,
  c: ProfileConfig,
  theme: ThemeMode,
  options: RenderOptions,
): string {
  const definition = getCardTemplate(id, options.template ?? c.cardTemplates?.[id]);
  if (!definition.collection || !definition.height)
    throw new Error('Not a cover collection template.');
  const template = definition.id;
  const minimal = template === 'chapter-log';
  const o = { ...options, template };
  const ctx = createRenderContext(c, id, theme, o);
  o.context = ctx;
  const character = ctx.character.id;
  const resolvedPalette = resolveCharacterPalette(c, character, theme);
  const palette = resolvedPalette.cover;
  const deepBlue = resolvedPalette.colorway === 'deep-blue';
  const compact = o.layout === 'compact';
  const w = widthFor(o, id),
    h = definition.height[o.layout];
  const p = `${ctx.uid}-${template}`;
  const dark = theme === 'dark';
  const heroColors = id === 'hero' ? resolveHeroColors(c, template, character, theme) : undefined;
  const paper =
    heroColors?.colors.surface ?? (deepBlue ? ctx.tokens.cardBg : dark ? '#141820' : '#fffaf2');
  const ink = heroColors?.colors.text ?? (deepBlue ? ctx.tokens.ink : dark ? '#f8f6ef' : '#17212d');
  const muted = heroColors?.muted ?? (deepBlue ? ctx.tokens.muted : dark ? '#b9c3d0' : '#4d5968');
  const rule = deepBlue ? ctx.tokens.cardBorder : dark ? '#435061' : '#b9bcc2';
  const accent = heroColors?.colors.accent ?? (dark ? palette.accent : ctx.tokens.cyan);
  const decorationInk = dark ? '#f8f6ef' : '#17212d';
  const auraColor = heroColors?.overrides.accent ?? palette.accent;
  const surface = deepBlue ? ctx.tokens.cardBg : dark ? '#202735' : '#ffffff';
  const definitions = new Map<string, string>();
  const decorationStyles: string[] = [];
  const flowingChain = (
    part: 'back' | 'front',
    x: number,
    y: number,
    length: number,
    color: string,
    angle: number,
  ) => {
    const uid = `${p}-cover-chain-${part}`;
    const ribbon = movingCoverChain(x, y, length, color, angle, {
      uid,
      part,
      motion: c.animationLevel,
      cycleSeconds: ctx.timeline.cycleSeconds,
    });
    if (ribbon.definitions) definitions.set(uid, ribbon.definitions);
    if (ribbon.styles) decorationStyles.push(ribbon.styles);
    return ribbon.svg;
  };
  let clipIndex = 0;
  let decorationIndex = 0;
  const txt = (
    value: string | number,
    x: number,
    y: number,
    maxWidth: number,
    size = 12,
    color = ink,
    weight = 600,
    lines = 1,
  ) =>
    textBlock(String(value), x, y, Math.max(1, maxWidth), size, color, { weight, maxLines: lines })
      .svg;
  const fit = (value: string, x: number, y: number, maxWidth: number, size: number, color = ink) =>
    txt(
      value,
      x,
      y,
      maxWidth,
      Math.min(size, Math.max(12, maxWidth / Math.max(1, textWidth(value, 1, 'title')))),
      color,
      900,
    );
  const box = (
    x: number,
    y: number,
    width: number,
    height: number,
    fill = surface,
    stroke = rule,
    extra = '',
  ) =>
    `<rect x="${x}" y="${y}" width="${Math.max(0, width)}" height="${Math.max(0, height)}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
  const layer = (key: string, title: string, x: number, y: number, body: string) =>
    layoutElement(c, o, id, template, key, title, x, y, body);
  const image = (
    pose: ArtworkPose,
    x: number,
    y: number,
    width: number,
    height: number,
    crop = false,
    opacity = 1,
  ) => {
    const asset = getArtwork(character, pose);
    const artId = `art-${character}-${pose}`;
    definitions.set(
      artId,
      `<image id="${artId}" width="${asset.width}" height="${asset.height}" href="${asset.dataUri}"/>`,
    );
    const clipId = `${p}-clip-${clipIndex++}`;
    definitions.set(
      clipId,
      `<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath>`,
    );
    const scale = crop
      ? Math.max(width / asset.width, height / asset.height)
      : Math.min(width / asset.width, height / asset.height);
    const tx = x + (width - asset.width * scale) / 2;
    const ty = crop ? y : y + (height - asset.height * scale) / 2;
    return `<g clip-path="url(#${clipId})" opacity="${opacity}" data-artwork="${character}:${pose}"><use href="#${artId}" transform="translate(${tx} ${ty}) scale(${scale})"/></g>`;
  };
  const portrait = (
    pose: ArtworkPose,
    x: number,
    y: number,
    width: number,
    height: number,
    crop = true,
    opacity = 1,
    key = 'character-art',
  ) =>
    layer(
      key,
      `${ctx.character.name} ${pose} artwork`,
      x,
      y,
      image(pose, x, y, width, height, crop, opacity),
    );
  const decoration = (
    body: string,
    key = `cover-decoration-${decorationIndex++}`,
    title = 'Cover decoration',
  ) => layer(key, title, 0, 0, `<g data-decoration="true" aria-hidden="true">${body}</g>`);
  const heading = (title: string, note: string, maxWidth = w - 112) =>
    layer(
      'card-heading',
      'Card heading',
      24,
      26,
      txt(title.toUpperCase(), 24, 35, maxWidth, compact ? 20 : 24, ink, 900) +
        txt(note, 24, 56, maxWidth, 9, muted, 600),
    );
  const perPage = definition.itemsPerPage ?? 1;
  const count =
    id === 'projects'
      ? c.projects.length
      : id === 'player-card'
        ? c.skills.length
        : id === 'league-table'
          ? c.languages.length
          : 1;
  const pageCount = Math.max(1, Math.ceil(count / perPage));
  const page = Math.min(pageCount - 1, Math.max(0, Math.floor(o.page ?? 0)));
  const pageNote = pageCount > 1 ? ` / ${page + 1} OF ${pageCount}` : '';
  const empty = (message: string, y = 138) =>
    layer('empty-state', 'Empty data', 24, y, txt(message, 24, y, w - 48, 14, muted, 600, 2));
  const credit = layer(
    'edition-note',
    'Edition note',
    24,
    h - 13,
    box(0, h - 24, w, 24, paper, 'none') +
      textElement(
        c,
        o,
        id,
        template,
        'edition-text',
        24,
        h - 13,
        textBlock(
          editionNote(
            c,
            id,
            template,
            `EGO STRIKER / ${definition.collection.toUpperCase()} EDITION${pageNote}`,
          ),
          24,
          h - 13,
          w - 48,
          8,
          muted,
          {
            weight: 700,
            maxLines: 1,
            reveal: textFieldReveal(
              c,
              'edition',
              editionNote(
                c,
                id,
                template,
                `EGO STRIKER / ${definition.collection.toUpperCase()} EDITION${pageNote}`,
              ),
              ctx.timeline.cycleSeconds,
            ),
          },
        ).svg,
      ),
  );
  let body = '';
  let bg =
    box(0, 0, w, h, paper, paper) +
    `<path d="M0 0H${w}V8H0Z" fill="${heroColors?.overrides.accent ?? palette.accent}"/>`;
  if (!minimal)
    definitions.set(
      `${p}-dots`,
      `<pattern id="${p}-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="${ink}" fill-opacity=".09"/></pattern>`,
    );
  if (!minimal)
    body += decoration(
      `<g class="collection-speed" opacity=".12" stroke="${accent}" stroke-width="1.5">${Array.from({ length: 7 }, (_, i) => `<path d="M${w - 140 + i * 17} ${h - 25}l${100 - i * 9} -${22 + i * 8}"/>`).join('')}</g>`,
      'speed-decoration',
      'Speed lines',
    );
  if (character === 'kaiser' && !minimal)
    body += decoration(
      `<g opacity=".15" fill="none" stroke="${accent}" stroke-width="1.3"><path d="M${w - 20} ${h - 33}q-18 -18 -26 -48m14 33l-10 -2 8 -5m-17 -10l10 1 -8 -6"/>${[0, 60, 120].map((angle) => `<ellipse cx="${w - 47}" cy="${h - 83}" rx="13" ry="7" transform="rotate(${angle} ${w - 47} ${h - 83})"/>`).join('')}<circle cx="${w - 47}" cy="${h - 83}" r="4"/></g>`,
      'rose-decoration',
      'Rose and thorns',
    );

  if (id === 'hero') {
    const cover = template === 'volume-cover';
    const artX = compact ? (cover ? 162 : 102) : 410,
      artY = compact ? 22 : 12;
    const artW = compact ? (cover ? 238 : 298) : 390,
      artH = compact ? 238 : 333;
    bg += `<path data-hero-color="background" d="M${compact ? 155 : 400} 0H${w}V${h}H${compact ? 112 : 310}Z" fill="${heroColors!.colors.background}"/><rect width="${w}" height="${h}" fill="url(#${p}-dots)"/>`;
    body += decoration(
      cover
        ? flowingChain(
            'back',
            compact ? 178 : 396,
            artH - 7,
            artW + 20,
            heroColors?.overrides.accent ?? '#17212d',
            -15,
          )
        : `<path d="M${artX - 30} 0l-80 ${h}" stroke="${heroColors?.overrides.accent ?? decorationInk}" stroke-width="7"/>`,
    );
    if (!cover)
      body += decoration(
        `<g transform="rotate(-12 ${artX} 95)" opacity=".18">${txt(ctx.character.name.toUpperCase(), artX - 45, 100, artW, compact ? 35 : 55, '#17212d', 900)}</g>`,
      );
    body += portrait('action', artX, artY, artW, artH, false);
    if (cover)
      body += decoration(
        flowingChain(
          'front',
          12,
          compact ? 274 : 317,
          w + 30,
          heroColors?.overrides.accent ?? decorationInk,
          -3,
        ),
      );
    const titleW = compact ? (cover ? 165 : w - 48) : 396;
    const roleSize = compact ? 22 : 26;
    const roleLineHeight = Math.ceil(roleSize * 1.15);
    const heroRole = textBlock(
      c.role,
      24,
      43,
      compact ? 165 : titleW,
      roleSize,
      cover && !heroColors?.overrides.accent ? ink : accent,
      {
        weight: 800,
        maxLines: 2,
        lineHeight: roleLineHeight,
        reveal: textFieldReveal(c, 'role', c.role, ctx.timeline.cycleSeconds),
      },
    );
    const nameTop = compact
      ? cover
        ? Math.max(86, 43 + (heroRole.lines.length - 1) * roleLineHeight + roleSize * 0.15 + 10)
        : 254
      : Math.max(64, 43 + (heroRole.lines.length - 1) * roleLineHeight + roleSize * 0.15 + 10);
    const nameSize = heroTextSize(
      c.displayName || 'YOUR NAME',
      titleW,
      (compact ? (cover ? 210 : 332) : 195) - nameTop,
      compact ? 56 : 84,
      'title',
    );
    const identityPaper = compact
      ? box(20, 25, 173, cover ? 241 : 70, paper, 'none') +
        (!cover ? box(20, 252, w - 40, 84, paper, 'none') : '')
      : box(20, 25, titleW + 8, 176, paper, 'none');
    body += layer(
      'hero-identity',
      'Name and identity',
      24,
      40,
      identityPaper +
        textElement(c, o, id, template, 'hero-role', 24, 43, heroRole.svg) +
        textElement(
          c,
          o,
          id,
          template,
          'hero-name',
          24,
          nameTop + nameSize * 0.95,
          textBlock(
            c.displayName || 'YOUR NAME',
            24,
            nameTop + nameSize * 0.95,
            titleW,
            nameSize,
            ink,
            {
              weight: 900,
              maxLines: 2,
              lineHeight: Math.ceil(nameSize * 1.15),
              reveal:
                c.nameAnimation && c.nameAnimation !== 'theme'
                  ? nameRevealOptions(c, ctx.fx.typing, ctx.timeline.cycleSeconds)
                  : undefined,
            },
          ).svg,
        ) +
        textElement(
          c,
          o,
          id,
          template,
          'hero-jersey',
          24,
          compact ? (cover ? 230 : heroRole.lines.length > 1 ? 92 : 84) : cover ? 292 : 311,
          textBlock(
            `NO. ${c.jerseyNumber}`,
            24,
            compact ? (cover ? 230 : heroRole.lines.length > 1 ? 92 : 84) : cover ? 292 : 311,
            titleW,
            24,
            ink,
            {
              weight: 900,
              maxLines: 1,
              reveal: textFieldReveal(c, 'jersey', c.jerseyNumber, ctx.timeline.cycleSeconds),
            },
          ).svg,
        ),
    );
    const dy = compact ? (cover ? 306 : 360) : cover ? 221 : 235;
    const dw = compact ? w - 48 : 356;
    const taglineValues = heroTaglines(c);
    const tagline = taglineValues[0] ?? '';
    const taglineTop = compact ? (cover ? 314 : 367) : dy - 3;
    const taglineLines = compact && cover ? 3 : 2;
    const taglineSize = heroTextSize(
      tagline,
      dw - 12,
      (compact ? (cover ? 375 : 410) : cover ? 258 : 272) - taglineTop,
      compact ? 18 : 20,
      'bold',
      taglineLines,
    );
    body += layer(
      'hero-details',
      'Role and tagline',
      24,
      dy,
      box(20, dy - 18, dw + 8, compact ? (cover ? 91 : 70) : 57, paper, rule) +
        textElement(
          c,
          o,
          id,
          template,
          'hero-position',
          30,
          compact ? dy : dy - 7,
          textBlock(c.positionName, 30, compact ? dy : dy - 7, dw - 12, 10, accent, {
            weight: 800,
            maxLines: 1,
            reveal: textFieldReveal(c, 'position', c.positionName, ctx.timeline.cycleSeconds),
          }).svg,
        ) +
        textElement(
          c,
          o,
          id,
          template,
          'hero-tagline',
          30,
          taglineTop + taglineSize * 0.95,
          taglineCycle(
            taglineValues,
            30,
            taglineTop + taglineSize * 0.95,
            dw - 12,
            taglineSize,
            ink,
            {
              uid: `${p}-tagline`,
              cycleSeconds: ctx.timeline.cycleSeconds,
              typing: ctx.fx.typing,
              animate: c.animationLevel !== 'none' && c.textEffects?.tagline?.effect !== 'none',
              weight: 600,
              maxLines: taglineLines,
              lineHeight: Math.ceil(taglineSize * 1.15),
              reveal: textFieldReveal(c, 'tagline', tagline, ctx.timeline.cycleSeconds),
            },
          ),
        ),
    );
  } else if (id === 'player-card') {
    const collector = template === 'collector-cover';
    body += heading(
      collector ? 'Player / Collection' : 'Egoist / Portrait',
      `${source(c.skillSource)} / SELF-ASSESSED SKILLS${pageNote}`,
    );
    const ax = 24,
      ay = 78,
      aw = compact ? 112 : 226,
      ah = compact ? 121 : 229;
    body += decoration(
      box(ax, ay, aw, ah, palette.accent, ink) +
        (collector
          ? chain(ax, ay + ah - 5, aw, '#17212d')
          : `<path d="M${ax} ${ay + ah}l${aw} -${ah}" stroke="${ink}" stroke-width="3"/>`),
    );
    body += portrait('portrait', ax + 3, ay + 3, aw - 6, ah - 6);
    const ix = compact ? 150 : 273,
      iw = w - ix - 24;
    body += layer(
      'player-identity',
      'Player identity',
      ix,
      86,
      fit(c.displayName || 'YOUR NAME', ix, 103, iw, compact ? 21 : 33) +
        txt(`${c.positionName} / NO. ${c.jerseyNumber}`, ix, 125, iw, 10, accent, 700) +
        txt(c.philosophy, ix, 146, iw, 11, muted, 500, 2),
    );
    const skills = c.skills.slice(page * 6, page * 6 + 6);
    const sx = compact ? 24 : ix,
      sy = compact ? 219 : 184;
    const sw = w - sx - 24;
    if (!skills.length) body += empty('Add your skill ratings in Customize.', compact ? 232 : 205);
    skills.forEach((s, i) => {
      const columns = collector ? 2 : 1;
      const cellW = (sw - 16) / columns;
      const step = collector ? (compact ? 43 : 42) : compact ? 23 : 22;
      const x = sx + (i % columns) * (cellW + 16),
        y = sy + Math.floor(i / columns) * step;
      body += layer(
        `skill-${s.id ?? page * 6 + i}`,
        `${s.name} rating`,
        x,
        y,
        txt(s.name, x, y, cellW - 32, 11, ink, 700) +
          txt(s.value, x + cellW - 27, y, 27, 14, accent, 900) +
          box(x, y + 7, cellW, collector ? 6 : 3, rule, rule) +
          box(
            x,
            y + 7,
            (cellW * Math.min(99, Math.max(0, s.value))) / 99,
            collector ? 6 : 3,
            accent,
            accent,
          ),
      );
    });
  } else if (id === 'tech-pitch') {
    const puzzle = template === 'puzzle-field';
    body += heading(
      `Tactics / ${c.pitchFormation}`,
      puzzle ? 'PUZZLE FIELD / TECH FORMATION' : 'CHAIN TACTICS / TECH FORMATION',
    );
    body += portrait('portrait', w - 84, 10, 68, 60, true);
    const x = 24,
      y = 89,
      pw = w - 48,
      ph = compact ? 368 : 468;
    body += decoration(
      puzzle
        ? `<g opacity=".16">${Array.from({ length: 4 }, (_, i) => box(x, y + (i * ph) / 4, pw, ph / 4, i % 2 ? palette.accent : palette.shade, ink)).join('')}<path d="M${w / 2} ${y}v${ph}M${x} ${y + ph / 2}h${pw}" stroke="${ink}" stroke-width="6"/><circle cx="${w / 2}" cy="${y + ph / 4}" r="18" fill="${paper}" stroke="${ink}" stroke-width="6"/></g>`
        : chain(17, 93, ph - 12, accent, 90) + chain(w - 17, 93, ph - 12, accent, 90),
    );
    body += layer(
      'tactical-field',
      'Tactical field',
      x,
      y,
      box(x, y, pw, ph, 'none', rule) +
        `<g fill="none" stroke="${rule}"><path d="M${x} ${y + ph / 2}h${pw}"/><circle cx="${w / 2}" cy="${y + ph / 2}" r="40"/><path d="M${w / 2 - 78} ${y}v52h156v-52M${w / 2 - 78} ${y + ph}v-52h156v52"/></g>`,
    );
    const inset = compact ? 34 : 42;
    const nodes = c.pitchTechs.map((n) => ({
      ...n,
      px: x + inset + (n.x / 100) * (pw - inset * 2),
      py: y + 24 + (n.y / 100) * (ph - 80),
    }));
    const roles = ['GK', 'DF', 'MF', 'FW'];
    const links = nodes
      .flatMap((n) => {
        const next = nodes.filter((v) => roles.indexOf(v.role) === roles.indexOf(n.role) + 1);
        return next
          .sort((a, b) => Math.abs(a.x - n.x) - Math.abs(b.x - n.x))
          .slice(0, 2)
          .map(
            (v) =>
              `<path data-from="${esc(n.id)}" data-to="${esc(v.id)}" d="M${n.px} ${n.py}L${v.px} ${v.py}" fill="none" stroke="${accent}" stroke-opacity=".35" stroke-dasharray="${puzzle ? '3 5' : 'none'}"/>`,
          );
      })
      .join('');
    body += layer('tactical-links', 'Technology connections', x, y, links);
    nodes.forEach((n) => {
      const rowCount = nodes.filter((v) => v.role === n.role).length;
      const labelW = Math.min(
        compact ? 112 : 140,
        rowCount > 1 ? ((pw - inset * 2) * 0.76) / (rowCount - 1) - 6 : pw - 32,
      );
      const lx = Math.max(x + labelW / 2 + 5, Math.min(x + pw - labelW / 2 - 5, n.px));
      body += layer(
        `pitch-node:${n.id}`,
        `${n.role} · ${n.tech}`,
        n.px,
        n.py,
        box(n.px - 16, n.py - 16, 32, 32, surface, accent, puzzle ? 'rx="5"' : '') +
          techIcon(n.tech, n.px - 9, n.py - 9, accent, 18) +
          box(lx - labelW / 2 - 3, n.py + 17, labelW + 6, 31, paper, 'none') +
          textBlock(
            c.presentation?.techLabels?.[n.id] ?? n.tech,
            lx,
            n.py + 30,
            labelW,
            compact ? 11 : 13,
            ink,
            { maxLines: 2, anchor: 'middle', weight: 700 },
          ).svg,
      );
    });
    if (!nodes.length) body += empty('Add technologies to your formation.');
  } else if (id === 'match-stats') {
    const impact = template === 'impact-panel';
    body += heading(
      impact ? 'Performance / Impact' : 'Performance / Issue',
      'GITHUB PROFILE METRICS / SOURCE ON EACH PANEL',
    );
    body += portrait('portrait', w - 80, 8, 60, 61);
    const metrics = [
      ['goals', 'COMMITS'],
      ['assists', 'PULL REQUESTS'],
      ['mvpVotes', 'STARS'],
      ['matches', 'PUBLIC REPOS'],
      ['winStreak', 'STREAK / DAYS'],
    ] as const;
    const columns = compact ? 3 : 5,
      gap = 9,
      cw = (w - 48 - (columns - 1) * gap) / columns;
    const leadWidth = (w - 48) * 0.43;
    metrics.forEach(([key, name], i) => {
      const panelW = !impact
        ? cw
        : compact
          ? i === 0
            ? w - 48
            : (w - 48 - gap) / 2
          : i === 0
            ? leadWidth
            : (w - 48 - leadWidth - gap * 2) / 2;
      const panelH = impact && !compact && i === 0 ? 168 : 80;
      const x = !impact
        ? 24 + (i % columns) * (cw + gap)
        : i === 0
          ? 24
          : compact
            ? 24 + ((i - 1) % 2) * (panelW + gap)
            : 24 + leadWidth + gap + ((i - 1) % 2) * (panelW + gap);
      const y = !impact
        ? 79 + Math.floor(i / columns) * 88
        : i === 0
          ? 79
          : (compact ? 167 : 79) + Math.floor((i - 1) / 2) * 88;
      let panel = box(x, y, panelW, panelH, surface, ink);
      if (impact)
        panel += `<path d="M${x} ${y}l${panelW} 14M${x} ${y + panelH}l${panelW} -16" stroke="${accent}" stroke-width="3" opacity=".25"/><path d="M${x} ${y + 3}l14 -3M${x + panelW - 14} ${y + panelH}l14 -3" stroke="${ink}" stroke-width="5"/>`;
      else panel += `<rect x="${x}" y="${y}" width="5" height="80" fill="${palette.accent}"/>`;
      body += layer(
        `stat-${key}`,
        `${name} metric`,
        x,
        y,
        panel +
          txt(name, x + 9, y + 15, panelW - 18, 8, muted, 800) +
          fit(
            c.matchStats[key].toLocaleString('en-US'),
            x + 9,
            y + (panelH > 80 ? 103 : 51),
            panelW - 18,
            panelH > 80 ? 68 : compact ? 28 : 38,
          ) +
          txt(source(c.statSources[key]), x + 9, y + panelH - 11, panelW - 18, 8, accent, 700),
      );
    });
    if (!compact && !impact)
      body += layer(
        'metric-note',
        'Metrics note',
        24,
        195,
        txt('Commit activity · Contributions · Repository visibility', 24, 195, w - 48, 12, muted),
      );
  } else if (id === 'league-table') {
    const awards = template === 'egoist-awards';
    body += heading(
      awards ? 'Languages / Awards' : 'Languages / Contents',
      `${source(c.languageSource)} / LANGUAGE SHARE, NOT SKILL${pageNote}`,
    );
    body += portrait(
      awards ? 'exhibition' : 'portrait',
      compact ? 24 : 26,
      79,
      compact ? 78 : 168,
      compact ? 235 : 194,
      !awards,
    );
    if (awards)
      body += decoration(
        `<path d="M18 75H${w - 18}V${h - 29}H18Z" fill="none" stroke="${accent}"/><path d="M22 79H${w - 22}V${h - 33}H22Z" fill="none" stroke="${accent}" opacity=".4"/>`,
      );
    const x = compact ? 117 : 215,
      rw = w - x - 30,
      rowH = compact ? 37 : 29;
    const sorted = [...c.languages].sort((a, b) => b.percent - a.percent);
    sorted.slice(page * 6, page * 6 + 6).forEach((l, i) => {
      const y = 83 + i * rowH;
      body += layer(
        `language-${l.id ?? l.name}`,
        `${l.name} language share`,
        x,
        y,
        (awards
          ? `<circle cx="${x + 12}" cy="${y + 7}" r="11" fill="none" stroke="${accent}"/><path d="M${x + 5} ${y + 16}l-3 9 10-5 10 5-3-9" fill="${accent}" opacity=".3"/>`
          : '') +
          txt(
            String(page * 6 + i + 1).padStart(2, '0'),
            x + (awards ? 5 : 0),
            y + (awards ? 11 : 15),
            awards ? 18 : 30,
            awards ? 11 : 22,
            accent,
            900,
          ) +
          txt(l.name, x + 37, y + 12, rw - 90, 12, ink, 700) +
          txt(`${l.percent.toFixed(1)}%`, x + rw - 50, y + 12, 50, 10, ink, 700) +
          box(x + 37, y + 20, rw - 37, 3, rule, rule) +
          box(
            x + 37,
            y + 20,
            ((rw - 37) * Math.min(100, Math.max(0, l.percent))) / 100,
            3,
            accent,
            accent,
          ),
      );
    });
    if (!sorted.length)
      body += layer(
        'empty-state',
        'Empty languages',
        x,
        118,
        txt('Add language shares in Customize.', x, 118, rw, 13, muted, 600, 2),
      );
    const total = sorted.reduce((sum, l) => sum + l.percent, 0);
    body += layer(
      'language-total',
      'Language total',
      x,
      h - 33,
      txt(`TOTAL ${total.toFixed(1)}% / SHARE`, x, h - 33, rw, 9, muted),
    );
  } else if (id === 'projects') {
    const shelf = template === 'volume-shelf';
    body += heading(
      shelf ? 'Projects / Volumes' : 'Projects / Rivals',
      `${source(c.projectSource)} / FEATURED PROJECTS${pageNote}`,
      w - 48,
    );
    const projects = c.projects.slice(page * 3, page * 3 + 3);
    const gap = 14,
      cw = compact ? w - 48 : (w - 48 - gap * 2) / 3;
    projects.forEach((project, i) => {
      const x = compact ? 24 : 24 + i * (cw + gap),
        y = compact ? 79 + i * 112 : 79;
      const ph = compact ? 99 : 268;
      const artW = compact ? 88 : cw,
        artH = compact ? ph : 104;
      body += layer(
        `project-panel-${project.id}`,
        `${project.name} panel`,
        x,
        y,
        shelf
          ? box(x, y, cw, ph, surface, ink)
          : `<path d="M${x + 10} ${y}H${x + cw}V${y + ph - 10}L${x + cw - 10} ${y + ph}H${x}V${y + 10}Z" fill="${surface}" stroke="${ink}"/>`,
      );
      const diagonal = `${p}-rival-${i}`;
      if (!shelf)
        definitions.set(
          diagonal,
          `<clipPath id="${diagonal}"><path d="M${x + 17} ${y + 1}H${x + artW - 1}L${x + artW - 17} ${y + artH - 1}H${x + 1}Z"/></clipPath>`,
        );
      const coverArt =
        box(x + 1, y + 1, artW - 2, artH - 2, palette.accent, 'none') +
        image(shelf ? 'portrait' : 'action', x + 2, y + 2, artW - 4, artH - 4, true);
      body += layer(
        `project-cover-${project.id}`,
        `${project.name} cover artwork`,
        x,
        y,
        shelf
          ? coverArt
          : `<g clip-path="url(#${diagonal})">${coverArt}</g><path d="M${x + 17} ${y + 1}L${x + 1} ${y + artH - 1}M${x + artW - 1} ${y + 1}L${x + artW - 17} ${y + artH - 1}" stroke="${accent}" stroke-width="3"/>`,
      );
      if (shelf)
        body += layer(
          `project-chain-${project.id}`,
          `${project.name} chain decoration`,
          x,
          y,
          `<g data-decoration="true" aria-hidden="true">${chain(x + 4, y + artH - 5, artW - 8, '#17212d')}</g>`,
        );
      const tx = compact ? x + 101 : x + 12,
        ty = compact ? y + 19 : y + 123;
      const tw = compact ? cw - 112 : cw - 24;
      const summary =
        c.presentation?.projectSummaries?.[project.id]?.[o.layout] ?? project.description;
      body += layer(
        `project-${project.id}`,
        `${project.name} project details`,
        tx,
        ty,
        txt(`${project.number} / ${project.status}`, tx, ty, tw, 8, accent, 800) +
          txt(project.name, tx, ty + 20, tw, compact ? 15 : 18, ink, 800, 1) +
          txt(
            summary,
            tx,
            ty + (compact ? 37 : 40),
            tw,
            compact ? 10 : 12,
            muted,
            500,
            compact ? 2 : 3,
          ) +
          txt(project.primaryTech, tx, compact ? y + 83 : y + 223, tw, 10, accent, 800) +
          txt(
            `${project.stars} STARS · ${project.forks} FORKS · ${project.rating}`,
            tx,
            compact ? y + 95 : y + 250,
            tw,
            8,
            ink,
            600,
          ),
      );
    });
    if (!projects.length) body += empty('Add featured projects in Customize.');
  } else if (id === 'season') {
    const training = template === 'training-panels';
    const demo = c.seasonSource === 'demo';
    const end = demo
      ? new Date('2025-12-31T00:00:00Z')
      : c.seasonDays.length
        ? new Date(
            [...c.seasonDays].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!.date +
              'T00:00:00Z',
          )
        : null;
    body += training
      ? heading(
          'Season / Training',
          demo
            ? 'DEMO / SIMULATED ACTIVITY'
            : `${source(c.seasonSource)} / ${c.seasonSource === 'github' ? 'GITHUB CONTRIBUTIONS' : 'RECORDED ACTIVITY'}`,
        )
      : layer(
          'card-heading',
          'Card heading',
          24,
          26,
          txt('CONTRIBUTIONS', 24, 45, w - 112, compact ? 20 : 24, ink, 900),
        );
    body += portrait('portrait', w - 80, 8, 60, 61);
    const byDate = new Map(c.seasonDays.map((d) => [d.date, d.count]));
    if (demo)
      for (let i = 0; i < 365; i++) {
        const day = new Date(Date.UTC(2025, 0, i + 1));
        byDate.set(
          day.toISOString().slice(0, 10),
          (i * 17 + 23) % 29 < 10 ? 0 : ((i * 7) % 12) + 1,
        );
      }
    const colors = resolvedPalette.contributions ?? [
      dark ? '#303c4a' : '#d6dde4',
      dark ? '#506249' : '#9cbd90',
      dark ? '#729456' : '#72a15b',
      palette.accent,
    ];
    const cell = (date: string, count: number, x: number, y: number, cw: number, ch: number) =>
      `<g><title>${date}: ${count}</title><rect data-contribution-date="${date}" data-contribution-count="${count}" data-contribution-level="${deepBlue ? contributionLevel(count) : count === 0 ? 0 : count < 3 ? 1 : count < 7 ? 2 : 3}" x="${x}" y="${y}" width="${cw}" height="${ch}" rx=".7" fill="${colors[deepBlue ? contributionLevel(count) : count === 0 ? 0 : count < 3 ? 1 : count < 7 ? 2 : 3]}"/></g>`;
    let total = 0;
    if (!end) body += empty('Add daily activity counts in Customize.');
    else if (training) {
      const columns = compact ? 3 : 4,
        cw = (w - 48) / columns,
        rh = compact ? 52 : 47;
      for (let i = 0; i < 12; i++) {
        const month = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11 + i, 1));
        const year = month.getUTCFullYear(),
          m = month.getUTCMonth();
        const x = 24 + (i % columns) * cw,
          y = 78 + Math.floor(i / columns) * rh;
        const first = month.getUTCDay(),
          length = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
        let sum = 0,
          cells = '';
        for (let day = 1; day <= length; day++) {
          const key = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const count = key > end.toISOString().slice(0, 10) ? 0 : (byDate.get(key) ?? 0);
          sum += count;
          cells += cell(
            key,
            count,
            x + 8 + ((first + day - 1) % 7) * 6.4,
            y + 16 + Math.floor((first + day - 1) / 7) * 4.1,
            5.6,
            3.4,
          );
        }
        total += sum;
        body += layer(
          `calendar-${year}-${String(m + 1).padStart(2, '0')}`,
          `${month.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })} activity`,
          x,
          y,
          box(x + 1, y, cw - 7, rh - 4, surface, rule) +
            txt(
              month.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
              x + 8,
              y + 11,
              43,
              8,
              ink,
              800,
            ) +
            txt(sum, x + 59, y + 27, cw - 70, compact ? 13 : 18, accent, 800) +
            cells,
        );
      }
    } else {
      const heatmap = renderChapterHeatmap(byDate, end, {
        width: w,
        compact,
        dark,
        surface,
        ink,
        muted,
        accent,
        colors: resolvedPalette.contributions,
      });
      total = heatmap.total;
      body += layer('activity-grid', 'Contribution activity grid', 24, 80, heatmap.markup);
    }
    if (training && deepBlue) {
      const legendX = w - 147,
        legendY = h - 36;
      body += layer(
        'activity-legend',
        'Contribution color legend',
        legendX,
        legendY,
        contributionLegend(colors, legendX, legendY, muted),
      );
    }
    body += layer(
      'activity-total',
      'Total activity',
      24,
      h - 28,
      training
        ? txt(
            `${total} TOTAL / ${demo ? 'SIMULATED ACTIVITY' : c.seasonSource === 'github' ? 'GITHUB CONTRIBUTIONS' : 'RECORDED ACTIVITY'}`,
            24,
            h - 28,
            deepBlue ? w - 200 : w - 48,
            10,
            ink,
            800,
          )
        : txt(`${total} TOTAL CONTRIBUTIONS`, 24, h - 26, w - 140, 10, ink, 700) +
            (demo ? txt('DEMO DATA', w - 100, h - 26, 76, 7, muted, 600) : ''),
    );
  } else if (id === 'footer') {
    const pass = template === 'exhibition-pass';
    body += heading(
      pass ? 'Exhibition / Pass' : 'Transfer / Ticket',
      'CONTACT LINKS INCLUDED IN README SNIPPET',
      w - 48,
    );
    const ax = 24,
      ay = 78,
      aw = compact ? 103 : 153,
      ah = h - 113;
    body += decoration(
      pass
        ? box(18, 71, w - 36, h - 101, 'none', accent) + box(22, 75, w - 44, h - 109, 'none', rule)
        : `<path d="M${compact ? 138 : 194} 71V${h - 30}" stroke="${rule}" stroke-dasharray="4 5"/>` +
            chain(8, h - 30, w, accent),
    );
    body += portrait(pass ? 'exhibition' : 'portrait', ax, ay, aw, ah, !pass);
    const x = compact ? 149 : 221,
      tw = w - x - 30;
    const status =
      c.transferStatus === 'OPEN'
        ? 'OPEN TO COLLABORATE'
        : c.transferStatus === 'CLOSED'
          ? 'FOCUSED ON CURRENT WORK'
          : 'LET’S TALK / NEGOTIATING';
    body += layer(
      'footer-status',
      'Collaboration status',
      x,
      94,
      txt(status, x, 94, tw, compact ? 13 : 21, accent, 800, 2),
    );
    const contacts = [
      ['GitHub', c.socials.github],
      ['Email', c.socials.email],
      ['Portfolio', c.socials.portfolio],
      ['LinkedIn', c.socials.linkedin],
      ['X', c.socials.twitter],
    ].filter((entry): entry is [string, string] => !!entry[1]);
    contacts.forEach(([name, value], i) => {
      const columns = compact ? 1 : 2,
        cw = tw / columns;
      const cx = x + (i % columns) * cw,
        cy = (compact ? 132 : 135) + Math.floor(i / columns) * (compact ? 19 : 21);
      body += layer(
        `contact-${name.toLowerCase()}`,
        `${name} contact`,
        cx,
        cy,
        txt(`${name.toUpperCase()} / ${value}`, cx, cy, cw - 8, 9, ink, 600),
      );
    });
    if (!contacts.length)
      body += layer(
        'contact-empty',
        'Contact details',
        x,
        143,
        txt('Add your contact details in Customize.', x, 143, tw, 11, muted, 500, 2),
      );
  }

  if (!minimal) body += credit;
  const motion = compileElementMotion(c, id, template, o.layout, ctx.timeline.cycleSeconds, accent);
  const active = c.animationLevel !== 'none';
  const textMotion =
    active &&
    ((id === 'hero' && (c.nameAnimation === 'typewriter' || c.nameAnimation === 'pop-up')) ||
      Object.entries(c.textEffects ?? {}).some(
        ([field, setting]) =>
          (id === 'hero' || field === 'edition') &&
          setting.effect !== 'theme' &&
          setting.effect !== 'none',
      ));
  const automatic =
    active && !minimal
      ? `@keyframes collection-reveal{from{opacity:.65}to{opacity:1}}@keyframes collection-aura{0%,100%{filter:drop-shadow(0 0 1px ${auraColor})}50%{filter:drop-shadow(0 0 4px ${auraColor})}}@keyframes collection-speed{0%,100%{opacity:.1}50%{opacity:.19}}[data-artwork]{animation:collection-reveal ${ctx.timeline.introSeconds}s ease-out both,collection-aura ${ctx.timeline.cycleSeconds}s ease-in-out infinite}.collection-speed{animation:collection-speed ${ctx.timeline.cycleSeconds}s ease-in-out infinite}`
      : '';
  const title = `${definition.name} / ${ctx.character.name}`;
  // data-text values already contain escaped XML; preserve exactly one encoding pass.
  const desc = `${esc(definition.description)} ${Array.from(body.matchAll(/data-text="([^"]*)"/g), (m) => m[1]).join('. ')}`;
  let content = bg + body;
  if (id === 'footer' && template === 'chain-ticket') {
    const edge = Array.from({ length: Math.ceil(h / 10) + 1 }, (_, i) => ({
      y: Math.min(h, i * 10),
      inset: (i % 2) * 6,
    }));
    const maskId = `${p}-ticket-edge`;
    definitions.set(
      maskId,
      `<mask id="${maskId}"><polygon points="${edge
        .map((v) => `${v.inset},${v.y}`)
        .concat([...edge].reverse().map((v) => `${w - v.inset},${v.y}`))
        .join(' ')}" fill="white"/></mask>`,
    );
    content = `<g mask="url(#${maskId})">${content}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${p}-title ${p}-desc" data-collection="${definition.collection}" data-template="${template}">
    <title id="${p}-title">${esc(title)}</title><desc id="${p}-desc">${desc}</desc>
    <metadata>${esc(FONT_LICENSES)} ${minimal ? 'Contribution calendar with embedded character artwork.' : `Original AI artwork generated for Ego Striker. References: ${esc((definition.references ?? []).join(', '))}.`}</metadata>
    <defs>${[...definitions.values()].join('')}${glyphDefinitions(body)}</defs>
    <style>${textMotion ? TEXT_REVEAL_STYLES : ''}${decorationStyles.join('')}${decorationStyles.length ? COVER_CHAIN_REDUCED_MOTION : ''}${automatic}${motion}@media(prefers-reduced-motion:reduce){[data-artwork],[data-motion-element],.collection-speed{animation:none!important}}</style>
    ${content}
  </svg>`;
}
