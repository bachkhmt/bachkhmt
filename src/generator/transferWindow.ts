import { ProfileConfig, RenderOptions, ThemeMode } from '../types';
import { transferContacts, transferWindowHeight } from '../data/transferWindow';
import { createRenderContext } from './renderContext';
import { esc, glyphDefinitions, textBlock } from './text';
import { FONT_LICENSES } from './fonts/licenses';
import { layoutElement } from './layoutElements';
import { compileElementMotion } from '../fx/presets';
import { turfBackground } from './turfBackground';

export function renderTransferWindow(
  config: ProfileConfig,
  theme: ThemeMode,
  options: RenderOptions,
) {
  const ctx = options.context ?? createRenderContext(config, 'footer', theme, options);
  const t = ctx.tokens;
  const compact = options.layout === 'compact';
  const width = compact ? 400 : 800;
  const height = transferWindowHeight(options.layout, config);
  const uid = `${ctx.uid}-transfer-window`;
  const contacts = transferContacts(config);
  const open = config.transferStatus === 'OPEN';
  const closed = config.transferStatus === 'CLOSED';
  const accent = open ? t.teal : closed ? t.muted : t.signal;
  const headline = open ? 'OPEN' : closed ? 'FOCUSED' : 'LET’S TALK';
  const detail = open
    ? 'OPEN TO COLLABORATE'
    : closed
      ? 'FOCUSED ON CURRENT WORK'
      : 'LET’S TALK / NEGOTIATING';
  const txt = (
    value: string,
    x: number,
    y: number,
    maxWidth: number,
    size: number,
    color = t.ink,
    weight = 600,
  ) => textBlock(value, x, y, maxWidth, size, color, { weight, maxLines: 1 }).svg;
  const layer = (id: string, label: string, x: number, y: number, content: string) =>
    layoutElement(config, options, 'footer', 'transfer-window', id, label, x, y, content);
  const tile = (x: number, y: number, w: number, h: number, stroke = t.cardBorder) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${t.cardBg}" stroke="${stroke}" stroke-opacity=".75"/>`;

  let body = layer(
    'footer-heading',
    'Transfer Window heading',
    24,
    45,
    txt('TRANSFER WINDOW', 24, 45, width - 48, compact ? 30 : 34, t.ink, 900) +
      txt('LET’S BUILD THE NEXT PLAY', 24, 65, width - 48, 11, t.muted, 700),
  );
  const statusW = compact ? 352 : 246;
  const statusH = compact ? 80 : 104;
  body += layer(
    'footer-status',
    'Collaboration status',
    24,
    82,
    tile(24, 82, statusW, statusH, accent) +
      `<path d="M36 83h${statusW - 24}" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>` +
      txt('COLLABORATION', 40, 103, statusW - 70, 10, t.muted, 700) +
      txt(headline, 40, compact ? 135 : 148, statusW - 32, compact ? 32 : 38, t.ink, 900) +
      txt(detail, 40, compact ? 153 : 173, statusW - 32, compact ? 13 : 14, t.muted, 600) +
      `<circle class="transfer-status-light" cx="${24 + statusW - 23}" cy="100" r="4" fill="${accent}"/>`,
  );

  const contactX = compact ? 24 : 294;
  const contactW = compact ? 352 : 482;
  const contactStart = compact ? 176 : 82;
  const step = compact ? 60 : 62;
  const contactH = compact ? 52 : 54;
  const symbols: Record<string, string> = {
    github: 'M8 10l-3 6 3 6M24 10l3 6-3 6M19 8l-6 16',
    email: 'M4 8h24v17H4ZM4 8l12 10L28 8',
    web: 'M16 4a12 12 0 1 0 0 24a12 12 0 1 0 0-24M4 16h24M16 4q-10 12 0 24q10-12 0-24',
    linkedin: 'M8 12v12M8 8h.1M14 24V12h5q6 0 6 6v6M14 16q5-6 9-1',
    twitter: 'M7 6l18 20M25 6L7 26',
  };
  for (const [index, contact] of contacts.entries()) {
    const y = contactStart + index * step;
    body += layer(
      `contact-${contact.id}`,
      `${contact.label} contact`,
      contactX,
      y,
      `<g data-transfer-contact="${contact.id}" data-link-font-size="${compact ? 17 : 18}">` +
        tile(contactX, y, contactW, contactH) +
        `<rect x="${contactX + 10}" y="${y + 10}" width="32" height="32" rx="8" fill="${t.royal}" opacity=".13"/>` +
        `<path transform="translate(${contactX + 10} ${y + 10})" d="${symbols[contact.id]}" fill="none" stroke="${t.ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>` +
        txt(contact.label, contactX + 54, y + 17, contactW - 68, 12, t.muted, 700) +
        txt(contact.value, contactX + 54, y + 40, contactW - 68, compact ? 17 : 18, t.ink, 600) +
        '</g>',
    );
  }
  if (!contacts.length)
    body += layer(
      'contact-empty',
      'Contact details',
      contactX,
      contactStart,
      tile(contactX, contactStart, contactW, compact ? 52 : 104) +
        txt(
          'YOUR NEXT CONNECTION',
          contactX + 16,
          contactStart + 21,
          contactW - 32,
          12,
          t.ink,
          800,
        ) +
        txt(
          'Add your contact links in Customize.',
          contactX + 16,
          contactStart + 41,
          contactW - 32,
          12,
          t.muted,
          400,
        ),
    );

  const turfH = compact ? 96 : 118;
  const turfY = height - turfH;
  const turf = layer(
    'footer-turf',
    'Bottom turf background',
    0,
    turfY,
    turfBackground(uid, width, turfH, turfY),
  );
  body += layer(
    'footer-credit',
    'Footer credit',
    24,
    turfY - 8,
    txt('FAN-MADE / BLUE LOCK INSPIRED / EGO STRIKER', 24, turfY - 8, width - 48, 9, t.muted, 400),
  );
  const motion = compileElementMotion(
    config,
    'footer',
    'transfer-window',
    options.layout,
    ctx.timeline.cycleSeconds,
    accent,
  );
  const statusMotion =
    open && config.animationLevel !== 'none'
      ? `@keyframes ${uid}-status{50%{opacity:.45}}.transfer-status-light{animation:${uid}-status 3s ease-in-out infinite}`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${uid}-title ${uid}-desc" data-template="transfer-window">
    <title id="${uid}-title">Transfer Window — ${esc(detail)}</title>
    <desc id="${uid}-desc">${esc(detail)}. ${esc(contacts.map((contact) => `${contact.label}: ${contact.value}`).join('. '))}. A photographic strip of football turf and a ball across the bottom. Contact destinations are linked in the README snippet.</desc>
    <metadata>${esc(FONT_LICENSES)}</metadata>
    <defs>${glyphDefinitions(body)}<clipPath id="${uid}-card-clip"><rect width="${width}" height="${height}" rx="16"/></clipPath><linearGradient id="${uid}-background" x2="1" y2="1"><stop stop-color="${t.deep}"/><stop offset="1" stop-color="${t.navy}"/></linearGradient></defs>
    <style>${statusMotion}${motion}@media(prefers-reduced-motion:reduce){[data-motion-element],.transfer-status-light{animation:none!important}}</style>
    <rect x=".75" y=".75" width="${width - 1.5}" height="${height - 1.5}" rx="16" fill="url(#${uid}-background)" stroke="${t.cardBorder}" stroke-width="1.5"/>
    <path d="M16 1H${width - 16}" stroke="${t.cyan}" stroke-width="3"/>
    <g clip-path="url(#${uid}-card-clip)">${turf}${body}</g>
    <rect x=".75" y=".75" width="${width - 1.5}" height="${height - 1.5}" rx="16" fill="none" stroke="${t.cardBorder}" stroke-width="1.5"/>
  </svg>`;
}
