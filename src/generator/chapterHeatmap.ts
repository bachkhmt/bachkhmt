import { textBlock, textWidth } from './text';
import { contributionLevel } from '../characters/colorways';

interface HeatmapStyle {
  width: number;
  compact: boolean;
  dark: boolean;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  colors?: readonly string[];
}

const DAY_MS = 86400000;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function mix(base: string, accent: string, amount: number): string {
  const channel = (hex: string, index: number) => parseInt(hex.slice(index, index + 2), 16);
  return (
    '#' +
    [1, 3, 5]
      .map((index) =>
        Math.round(channel(base, index) * (1 - amount) + channel(accent, index) * amount)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

/** A static, self-contained 52-week calendar using UTC dates in both canvas sizes. */
export function renderChapterHeatmap(byDate: Map<string, number>, end: Date, style: HeatmapStyle) {
  const { width, compact, dark, surface, ink, muted, accent } = style;
  const colors = style.colors ?? [
    dark ? '#2e3743' : '#edf0f4',
    ...[0.22, 0.42, 0.64, 0.84].map((amount) => mix(surface, accent, amount)),
  ];
  const alignedEnd = new Date(end);
  alignedEnd.setUTCDate(alignedEnd.getUTCDate() + 6 - alignedEnd.getUTCDay());
  const start = new Date(alignedEnd.getTime() - 363 * DAY_MS);
  const endKey = end.toISOString().slice(0, 10);
  const columns = compact ? 26 : 52;
  const gap = compact ? 2.5 : 3;
  const step = compact ? 9.5 : (width - 104) / columns;
  const size = step - gap;
  const gridWidth = columns * step - gap;
  const gridX = compact ? (width - gridWidth + 24) / 2 : 64;
  const text = (
    value: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize = 8,
    color = muted,
    weight = 600,
  ) => textBlock(value, x, y, maxWidth, fontSize, color, { weight, maxLines: 1 }).svg;
  const dateLabel = (date: Date) =>
    `${String(date.getUTCDate()).padStart(2, '0')} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  let markup = `<rect x="24" y="79" width="${width - 48}" height="${compact ? 202 : 146}" fill="${surface}" stroke="${ink}"/>`;
  markup += text(`${dateLabel(start)} — ${dateLabel(end)}`, 40, 96, width - 80);
  let total = 0;

  for (let block = 0; block < (compact ? 2 : 1); block++) {
    const gridY = compact ? 113 + block * 86 : 116;
    const weekMonths = Array.from({ length: columns }, (_, col) =>
      new Date(
        Math.min(end.getTime(), start.getTime() + ((block * columns + col) * 7 + 3) * DAY_MS),
      ).getUTCMonth(),
    );
    let calendar = '';
    for (let col = 0; col < columns; col++) {
      const week = block * columns + col;
      const month = weekMonths[col];
      const nextMonth = weekMonths.findIndex((value, index) => index > col && value !== month);
      // Leave room for the next label; a partial month is already named in the date range.
      const remainingWidth = nextMonth < 0 ? gridWidth - col * step : (nextMonth - col) * step - 3;
      if (
        (col === 0 || month !== weekMonths[col - 1]) &&
        remainingWidth >= textWidth(MONTHS[month], 7, 'bold')
      ) {
        calendar += text(
          MONTHS[month],
          gridX + col * step,
          gridY - 7,
          remainingWidth,
          7,
          muted,
          700,
        );
      }
      for (let row = 0; row < 7; row++) {
        const date = new Date(start.getTime() + (week * 7 + row) * DAY_MS);
        const key = date.toISOString().slice(0, 10);
        const future = key > endKey;
        const count = future ? 0 : (byDate.get(key) ?? 0);
        const level = contributionLevel(count);
        total += count;
        calendar += `<g><title>${key}: ${count}${future ? ' (outside recorded range)' : ''}</title><rect data-contribution-date="${key}" data-contribution-count="${count}" data-contribution-level="${level}"${future ? ' data-contribution-future="true" opacity=".4"' : ''} x="${gridX + col * step}" y="${gridY + row * step}" width="${size}" height="${size}" rx="${compact ? 1.4 : 2}" fill="${colors[level]}"/></g>`;
      }
    }
    for (const [row, name] of [
      [1, 'MON'],
      [3, 'WED'],
      [5, 'FRI'],
    ] as const)
      calendar += text(name, gridX - 26, gridY + row * step + size / 2 + 2.5, 22, 6, muted);
    markup += `<g data-contribution-block="${block}">${calendar}</g>`;
  }

  const legendY = compact ? 269 : 212;
  const legendX = compact ? gridX : width - 193;
  markup += `<g data-contribution-legend="true">${text('LESS', legendX, legendY + 7, 28, 7)}`;
  colors.forEach((color, index) => {
    markup += `<rect data-contribution-legend-level="${index}" x="${legendX + 32 + index * 12}" y="${legendY}" width="8" height="8" rx="1.5" fill="${color}"/>`;
  });
  markup += text('MORE', legendX + 94, legendY + 7, 30, 7) + '</g>';
  return { markup, total };
}
