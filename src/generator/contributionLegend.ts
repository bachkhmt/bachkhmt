import { label } from './visual';

/** The legend reads the same palette as the cells; occupies 123 × 9 pixels. */
export function contributionLegend(colors: readonly string[], x: number, y: number, muted: string) {
  return (
    `<g data-contribution-legend="true">${label('LESS', x, y + 7, 26, 6, muted)}` +
    colors
      .map(
        (color, level) =>
          `<rect data-contribution-legend-level="${level}" x="${x + 30 + level * 12}" y="${y}" width="8" height="8" rx="1" fill="${color}"/>`,
      )
      .join('') +
    label('MORE', x + 93, y + 7, 30, 6, muted) +
    '</g>'
  );
}
