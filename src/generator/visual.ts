import { ColorTokens, SkinParams } from '../types';
import { TextRevealOptions, textBlock } from './text';
export const panel = (
  x: number,
  y: number,
  w: number,
  h: number,
  t: ColorTokens,
  skin: SkinParams['corner'] = 'cut',
) => {
  const shape = {
    cut: `M${x + 10} ${y}H${x + w}V${y + h - 10}L${x + w - 10} ${y + h}H${x}V${y + 10}Z`,
    round: `M${x + 10} ${y}H${x + w - 10}Q${x + w} ${y} ${x + w} ${y + 10}V${y + h - 10}Q${x + w} ${y + h} ${x + w - 10} ${y + h}H${x + 10}Q${x} ${y + h} ${x} ${y + h - 10}V${y + 10}Q${x} ${y} ${x + 10} ${y}Z`,
    crown: `M${x} ${y + 12}L${x + w * 0.22} ${y + 3}L${x + w * 0.42} ${y + 12}L${x + w * 0.58} ${y}L${x + w * 0.78} ${y + 12}L${x + w} ${y + 4}V${y + h - 10}L${x + w - 10} ${y + h}H${x}Z`,
    ice: `M${x + 14} ${y}H${x + w - 7}L${x + w} ${y + 12}V${y + h - 16}L${x + w - 18} ${y + h}H${x + 8}L${x} ${y + h - 12}V${y + 16}Z`,
    ink: `M${x + 8} ${y + 2}Q${x + 20} ${y - 2} ${x + 30} ${y + 2}T${x + 55} ${y + 2}H${x + w - 8}Q${x + w + 3} ${y + 7} ${x + w - 2} ${y + 20}V${y + h - 8}Q${x + w - 9} ${y + h + 3} ${x + w - 24} ${y + h - 2}H${x + 8}Q${x - 3} ${y + h - 7} ${x + 2} ${y + h - 22}V${y + 12}Z`,
  }[skin];
  return `<path data-skin-corner="${skin}" d="${shape}" fill="${t.cardBg}" stroke="${t.cardBorder}"/>`;
};

export function skinCell(
  x: number,
  y: number,
  width: number,
  height: number,
  shape: SkinParams['cell'],
  fill: string,
  extra = '',
): string {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const polygon = (points: [number, number][]) =>
    `<polygon data-skin-cell="${shape}" points="${points.map(([px, py]) => `${px},${py}`).join(' ')}" fill="${fill}" ${extra}/>`;
  if (shape === 'round')
    return `<ellipse data-skin-cell="round" cx="${cx}" cy="${cy}" rx="${width / 2}" ry="${height / 2}" fill="${fill}" ${extra}/>`;
  if (shape === 'diamond')
    return polygon([[cx, y], [x + width, cy], [cx, y + height], [x, cy]]);
  if (shape === 'hex')
    return polygon([[x + width * 0.25, y], [x + width * 0.75, y], [x + width, cy], [x + width * 0.75, y + height], [x + width * 0.25, y + height], [x, cy]]);
  return `<rect data-skin-cell="square" x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" ${extra}/>`;
}
export const miniBall = (x: number, y: number, t: ColorTokens) =>
  `<g transform="translate(${x} ${y})"><g class="mini-ball"><circle r="8" fill="${t.ballLight}" stroke="${t.glow}" stroke-width="1.2"/><path d="M0-3.4L3.2-1.1 2 2.7H-2L-3.2-1.1Z" fill="${t.ballDark}"/><path d="M0-3.4V-6M3.2-1.1L6-1.6M2 2.7L3.8 5M-2 2.7L-3.8 5M-3.2-1.1L-6-1.6" fill="none" stroke="${t.ballSeam}" stroke-width=".7"/></g></g>`;
export function techIcon(tech: string, x: number, y: number, color: string, size = 16): string {
  const n = tech.toLowerCase();
  const d = /python|data|rag|faiss/.test(n)
    ? 'M3 4Q8 0 13 4V8H3V12Q8 16 13 12M5 4H5.1M11 12H11.1'
    : /torch|learning|mlflow|transform/.test(n)
      ? 'M8 1L1 5V11L8 15L15 11V5Z M1 5L8 9L15 5M8 9V15'
      : /docker|runtime/.test(n)
        ? 'M1 9H15Q13 15 6 14Q2 13 1 9M3 8V5H6V8M7 8V5H10V8M7 4V1H10V4M11 8V5H14V8'
        : /api|type|shell/.test(n)
          ? 'M5 3L1 8L5 13M11 3L15 8L11 13M9 2L7 14'
          : /stream|gradio|jupyter/.test(n)
            ? 'M1 2H15V12H1ZM1 5H15M5 15H11M8 12V15'
            : 'M8 1L15 8L8 15L1 8ZM5 8H11M8 5V11';
  return `<g transform="translate(${x} ${y}) scale(${size / 16})" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"> <path d="${d}"/></g>`;
}
export const label = (
  s: string,
  x: number,
  y: number,
  w: number,
  size: number,
  color: string,
  weight = 400,
  maxLines = 1,
  anchor: 'start' | 'middle' | 'end' = 'start',
  reveal?: TextRevealOptions,
) => textBlock(s, x, y, w, size, color, { weight, maxLines, anchor, reveal }).svg;
