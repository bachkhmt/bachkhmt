import fontData from './fonts/glyphs.json' with { type: 'json' };
import { EditableTextField, ProfileConfig, TypingKind } from '../types';
export type FontStyle = 'title' | 'body' | 'bold';
export interface TextRevealOptions {
  kind: TypingKind;
  delay?: number;
  speed?: number;
  cycleSeconds?: number;
  perGlyph?: boolean;
}

export function textFieldReveal(
  config: ProfileConfig,
  field: EditableTextField,
  value: string,
  cycleSeconds: number,
  fallback?: TextRevealOptions,
): TextRevealOptions | undefined {
  if (config.animationLevel === 'none') return undefined;
  const setting = config.textEffects?.[field];
  if (!setting || setting.effect === 'theme') return fallback;
  if (setting.effect === 'none') return undefined;
  const count = Array.from(value.normalize('NFC')).length;
  return {
    kind: setting.effect,
    cycleSeconds,
    perGlyph: true,
    delay: setting.delaySeconds ?? 0,
    speed: Math.min(setting.letterSeconds ?? 0.075, (cycleSeconds * 0.25) / Math.max(1, count)),
  };
}

export function heroTaglines(config: ProfileConfig): string[] {
  const values = (config.taglines ?? []).map((value) => value.trim()).filter(Boolean);
  return values.length ? values : [config.presentation?.shortTagline || config.egoTagline];
}

export function nameRevealOptions(
  config: ProfileConfig,
  typing: TypingKind,
  cycleSeconds: number,
  delay = 0,
): TextRevealOptions | undefined {
  if (config.animationLevel === 'none' || config.nameAnimation === 'none') return undefined;
  const kind =
    !config.nameAnimation || config.nameAnimation === 'theme' ? typing : config.nameAnimation;
  const count = Array.from((config.displayName || 'YOUR NAME').normalize('NFC')).length;
  return {
    kind,
    cycleSeconds,
    delay,
    ...(kind === 'typewriter' || kind === 'pop-up'
      ? {
          speed: Math.min(
            kind === 'typewriter' ? 0.09 : 0.075,
            (cycleSeconds * 0.3) / Math.max(1, count),
          ),
        }
      : {}),
  };
}

export const TEXT_REVEAL_STYLES = `
  .reveal-glyph{opacity:1}
  .text-reveal-typewriter .reveal-glyph{animation:ego-typewriter var(--reveal-cycle,16s) steps(1,end) infinite both}
  .text-reveal-pop-up .reveal-glyph{transform-box:fill-box;transform-origin:center;animation:ego-pop-up var(--reveal-cycle,16s) cubic-bezier(.16,.82,.3,1) infinite both}
  .text-reveal-sharp .reveal-glyph{animation:ego-sharp var(--reveal-cycle,16s) steps(1,end) infinite both}
  .text-reveal-stagger .reveal-glyph{animation:ego-stagger var(--reveal-cycle,16s) steps(1,end) infinite both}
  .text-reveal-lazy .reveal-glyph{animation:ego-lazy var(--reveal-cycle,16s) steps(1,end) infinite both}
  .text-reveal-blur-in .reveal-glyph{animation:ego-blur-in var(--reveal-cycle,16s) ease-out infinite both}
  .text-reveal-hue .reveal-glyph{animation:ego-hue var(--reveal-cycle,16s) ease-in-out infinite both}
  .text-reveal-slam .reveal-glyph{animation:ego-slam var(--reveal-cycle,16s) cubic-bezier(.16,.82,.3,1) infinite both}
  .text-reveal-glitch .reveal-glyph{animation:ego-glitch var(--reveal-cycle,16s) steps(1,end) infinite both}
  .text-reveal-slide .reveal-glyph{animation:ego-slide var(--reveal-cycle,16s) ease-out infinite both}
  .text-reveal-long{clip-path:inset(0 100% 0 0);animation:ego-clip var(--reveal-cycle,16s) steps(var(--reveal-steps,12),end) infinite both;animation-delay:var(--reveal-delay,0s)}
  @keyframes ego-typewriter{0%,8%{opacity:0}9%,100%{opacity:1}}
  @keyframes ego-pop-up{0%,8%{opacity:0;transform:translateY(180px) scale(.35)}12%{opacity:1;transform:translateY(-25px) scale(1.08)}15%,100%{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes ego-sharp{0%,5%{opacity:0}6%,100%{opacity:1}}
  @keyframes ego-stagger{0%,11%{opacity:0}12%,100%{opacity:1}}
  @keyframes ego-lazy{0%,17%{opacity:0}18%,100%{opacity:1}}
  @keyframes ego-blur-in{0%,8%{opacity:0;filter:blur(4px)}16%,100%{opacity:1;filter:blur(0)}}
  @keyframes ego-hue{0%,8%{opacity:0;filter:hue-rotate(0deg)}16%{opacity:1;filter:hue-rotate(90deg)}24%,100%{opacity:1;filter:hue-rotate(0deg)}}
  @keyframes ego-slam{0%,7%{opacity:0;filter:blur(3px)}8%{opacity:.65;filter:blur(1px)}12%,100%{opacity:1;filter:blur(0)}}
  @keyframes ego-glitch{0%,8%{opacity:0}9%{opacity:.65}10%,12%{opacity:.35}13%,100%{opacity:1}}
  @keyframes ego-slide{0%,8%{opacity:0;clip-path:inset(0 100% 0 0)}16%,100%{opacity:1;clip-path:inset(0 0 0 0)}}
  @keyframes ego-clip{0%,8%{clip-path:inset(0 100% 0 0)}24%,100%{clip-path:inset(0 0 0 0)}}
  @media(prefers-reduced-motion:reduce){.text-line .reveal-glyph{animation:none!important;opacity:1!important;transform:none!important;filter:none!important}.text-reveal-long{animation:none!important;clip-path:none!important}}`;
type Glyph = { w: number; d: string };
const fonts = fontData as Record<FontStyle, Record<string, Glyph>>;
export function esc(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
}
const code = (c: string, f: FontStyle) =>
  String(fonts[f][c.codePointAt(0)!] ? c.codePointAt(0)! : 9633);
const glyph = (c: string, f: FontStyle) => fonts[f][code(c, f)];
export function textWidth(text: string, size: number, font: FontStyle = 'body'): number {
  return Array.from(text.normalize('NFC')).reduce(
    (sum, c) => sum + (glyph(c, font).w * size) / 1000,
    0,
  );
}
export function wrapText(
  text: string,
  width: number,
  size: number,
  maxLines = Infinity,
  font: FontStyle = 'body',
): string[] {
  const lines: string[] = [];
  let current = '';
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  for (const word of text.normalize('NFC').trim().split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, size, font) <= width) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = '';
    }
    for (const part of word.match(/[^\-_/]+[\-_/]?|[\-_/]/gu) ?? [word]) {
      if (current && textWidth(current + part, size, font) > width) {
        lines.push(current);
        current = '';
      }
      for (const { segment } of segmenter.segment(part)) {
        if (current && textWidth(current + segment, size, font) > width) {
          lines.push(current);
          current = '';
        }
        current += segment;
      }
    }
  }
  if (current.trim()) lines.push(current.trim());
  const clean = lines.map((l) => l.trim());
  if (clean.length > maxLines) {
    const short = clean.slice(0, maxLines);
    let last = short.at(-1) ?? '';
    while (last && textWidth(last + '…', size, font) > width)
      last = Array.from(last).slice(0, -1).join('');
    short[maxLines - 1] = last.trimEnd() + '…';
    return short;
  }
  return clean;
}
export function textBlock(
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  color: string,
  options: {
    maxLines?: number;
    weight?: number;
    lineHeight?: number;
    anchor?: 'start' | 'middle' | 'end';
    className?: string;
    font?: FontStyle;
    reveal?: TextRevealOptions;
  } = {},
): { svg: string; height: number; lines: string[] } {
  const font =
    options.font ??
    ((options.weight ?? 400) >= 800 ? 'title' : (options.weight ?? 400) >= 600 ? 'bold' : 'body');
  const lines = wrapText(text, width, size, options.maxLines, font),
    lh = options.lineHeight ?? Math.ceil(size * 1.3);
  const reveal = options.reveal;
  const glyphCount = Array.from(text).length;
  const shortReveal =
    !!reveal &&
    reveal.kind !== 'instant' &&
    (glyphCount <= 40 ||
      reveal.perGlyph ||
      reveal.kind === 'typewriter' ||
      reveal.kind === 'pop-up');
  let glyphIndex = 0;
  const revealClass = reveal && reveal.kind !== 'instant' ? ` text-reveal-${reveal.kind}` : '';
  const revealStyle =
    reveal && reveal.kind !== 'instant'
      ? ` style="--reveal-cycle:${reveal.cycleSeconds ?? 16}s;${!shortReveal ? `--reveal-steps:${Math.max(1, glyphCount)};--reveal-delay:${reveal.delay ?? 0}s` : ''}"`
      : '';
  const svg = lines
    .map((line, i) => {
      const lineWidth = textWidth(line, size, font);
      const offset =
        options.anchor === 'middle' ? lineWidth / 2 : options.anchor === 'end' ? lineWidth : 0;
      let advance = 0;
      const uses = Array.from(line)
        .map((c) => {
          const ref = `font-${font}-${code(c, font)}`,
            g = glyph(c, font);
          const delay = (reveal?.delay ?? 0) + glyphIndex * (reveal?.speed ?? 0.045);
          const use = g.d
            ? `<use href="#${ref}" x="${advance}"${shortReveal ? ` class="reveal-glyph" style="animation-delay:${delay.toFixed(3)}s"` : ''}/>`
            : '';
          glyphIndex++;
          advance += g.w;
          return use;
        })
        .join('');
      const longClass =
        reveal && reveal.kind !== 'instant' && !shortReveal ? ' text-reveal-long' : '';
      return `<g class="text-line${options.className ? ' ' + esc(options.className) : ''}${revealClass}${longClass}"${revealStyle} data-text="${esc(line)}" role="text" aria-label="${esc(line)}" fill="${color}" transform="translate(${x - offset} ${y + i * lh}) scale(${size / 1000})">${uses}</g>`;
    })
    .join('');
  return { lines, height: lines.length * lh, svg };
}
export function glyphDefinitions(body: string): string {
  const refs = new Set(
    Array.from(body.matchAll(/href="#font-(title|body|bold)-(\d+)"/g), (m) => `${m[1]}-${m[2]}`),
  );
  return Array.from(refs)
    .map((ref) => {
      const [f, c] = ref.split('-');
      return `<path id="font-${ref}" d="${fonts[f as FontStyle][c].d}"/>`;
    })
    .join('');
}

export function taglineCycle(
  values: string[],
  x: number,
  y: number,
  width: number,
  size: number,
  color: string,
  options: {
    uid: string;
    cycleSeconds: number;
    typing: TypingKind;
    animate: boolean;
    reveal?: TextRevealOptions;
    maxLines?: number;
    weight?: number;
    lineHeight?: number;
  },
): string {
  const taglines = values
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!taglines.length) return '';
  const textOptions = {
    maxLines: options.maxLines ?? 2,
    weight: options.weight,
    lineHeight: options.lineHeight,
  };
  const reveal = Object.hasOwn(options, 'reveal')
    ? options.reveal
    : { kind: options.typing, cycleSeconds: options.cycleSeconds };
  if (!options.animate) return textBlock(taglines[0], x, y, width, size, color, textOptions).svg;
  if (taglines.length === 1)
    return textBlock(taglines[0], x, y, width, size, color, {
      ...textOptions,
      reveal,
    }).svg;

  const slot = options.cycleSeconds / taglines.length;
  const frames = taglines.map((_, index) => {
    const start = (index / taglines.length) * 100;
    const enter = start + 1.5;
    const hold = start + 65 / taglines.length;
    const leave = start + 82 / taglines.length;
    return `@keyframes ${options.uid}-tagline-${index}{0%,${start.toFixed(3)}%{opacity:0;visibility:hidden}${enter.toFixed(3)}%{opacity:1;visibility:visible}${hold.toFixed(3)}%{opacity:1;visibility:visible}${leave.toFixed(3)}%,100%{opacity:0;visibility:hidden}}`;
  });
  const svg = taglines
    .map((line, index) => {
      const delay = index * slot;
      const body = textBlock(line, x, y, width, size, color, {
        ...textOptions,
        reveal: reveal
          ? {
              ...reveal,
              delay: delay + Math.min(reveal.delay ?? 0, slot * 0.1),
              speed: Math.min(
                reveal.speed ?? 0.05,
                (slot * 0.45) / Math.max(1, Array.from(line.normalize('NFC')).length),
              ),
              cycleSeconds: slot,
            }
          : undefined,
      }).svg;
      return `<g class="tagline-cycle tagline-cycle-${index}" visibility="${index === 0 ? 'visible' : 'hidden'}" style="animation:${options.uid}-tagline-${index} ${options.cycleSeconds}s linear infinite">${body}</g>`;
    })
    .join('');
  return `<style>${frames.join('')}@media(prefers-reduced-motion:reduce){.tagline-cycle{animation:none!important;visibility:hidden}.tagline-cycle-0{visibility:visible!important;opacity:1!important}}</style>${svg}`;
}

export function sceneCycle(
  values: string[],
  x: number,
  y: number,
  width: number,
  size: number,
  color: string,
  options: { uid: string; cycleSeconds: number; animate: boolean },
): string {
  const scenes = values
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (!scenes.length) return '';
  const groups = scenes
    .map((scene, index) => {
      const start = (index / scenes.length) * 100;
      const enter = start + 1.5;
      const hold = ((index + 1) / scenes.length) * 100 - 1.5;
      const name = `${options.uid}-scene-${index}`;
      const animation = options.animate
        ? `animation:${name} ${options.cycleSeconds}s ease-in-out infinite;`
        : '';
      return `<g class="hero-scene hero-scene-${index}" style="${animation}" opacity="${index === 0 ? 1 : 0}">${textBlock(scene, x, y, width, size, color, { weight: 700, maxLines: 1 }).svg}</g>`;
    })
    .join('');
  if (!options.animate) return groups;
  const styles = scenes
    .map((_, index) => {
      const start = (index / scenes.length) * 100;
      const enter = start + 1.5;
      const leave = ((index + 1) / scenes.length) * 100 - 1.5;
      const name = `${options.uid}-scene-${index}`;
      const keyframes =
        index === 0
          ? `0%,${leave.toFixed(3)}%{opacity:1;transform:translateX(0)}${(((index + 1) / scenes.length) * 100).toFixed(3)}%,100%{opacity:0;transform:translateX(-5px)}`
          : `0%,${start.toFixed(3)}%{opacity:0;transform:translateX(5px)}${enter.toFixed(3)}%,${leave.toFixed(3)}%{opacity:1;transform:translateX(0)}${(((index + 1) / scenes.length) * 100).toFixed(3)}%,100%{opacity:0;transform:translateX(-5px)}`;
      return `@keyframes ${name}{${keyframes}}`;
    })
    .join('');
  return `<style>${styles}@media(prefers-reduced-motion:reduce){.hero-scene{animation:none!important;opacity:0!important}.hero-scene-0{opacity:1!important}}</style>${groups}`;
}
