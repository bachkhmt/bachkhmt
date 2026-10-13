import { CharacterId, CharacterTheme, ProfileConfig, ThemeMode, ColorTokens } from '../types';
import { textBlock } from './text';

export function characterMotifGraphic(id: CharacterId, tokens: ColorTokens): string {
  const stroke = tokens.accent2;
  const common = `fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`;
  const shapes: Record<CharacterId, string> = {
    isagi: `<path ${common} d="M0 0h30v30H0zM15 0v30M0 15h30M15 15L42 2M15 15l19 17"/><circle cx="15" cy="15" r="4" fill="${tokens.glow}"/>`,
    bachira: `<circle ${common} cx="8" cy="12" r="7"/><circle ${common} cx="25" cy="8" r="4"/><circle ${common} cx="25" cy="25" r="9"/><circle cx="8" cy="12" r="2" fill="${tokens.accent2}"/>`,
    rin: `<path ${common} d="M13 0l13 14-7 22L6 25zM13 0l-1 15 14-1M12 15l7 21M0 35l13-10 6 11"/>`,
    nagi: `<circle ${common} cx="18" cy="18" r="15"/><ellipse ${common} cx="18" cy="18" rx="7" ry="18" transform="rotate(48 18 18)"/><circle cx="18" cy="18" r="2.5" fill="${tokens.glow}"/>`,
    reo: `<path ${common} d="M9 1h18l9 15-9 15H9L0 16zM9 1l9 15 9-15M0 16h36M9 31l9-15 9 15"/>`,
    chigiri: `<path ${common} d="M0 8h20l8-7M4 18h24l8-7M0 28h19l9-7M22 36l11-7"/>`,
    barou: `<path ${common} d="M1 31h35l-4-21-9 8-7-17-7 17-8-8zM11 31v5h15v-5"/>`,
    kaiser: `<path ${common} d="M2 2l11 8-8 8 18 4-8 9 18 5M27 1l-5 8 7 3-6 9"/>`,
  };
  return shapes[id];
}

export function heroBackground(
  c: ProfileConfig,
  theme: ThemeMode,
  width: number,
  height: number,
  tokens: ColorTokens,
  character?: CharacterTheme,
) {
  const compact = width === 400;
  const ink = tokens.heroInk;
  const decorative = (
    word: string,
    x: number,
    y: number,
    maxWidth: number,
    size: number,
    anchor: 'start' | 'end' = 'start',
  ) =>
    textBlock(word, x, y, maxWidth, size, ink, { weight: 900, anchor, maxLines: 1 }).svg.replace(
      'class="text-line"',
      'class="hero-background-type"',
    );
  // Ink bounds of STRIKER in the bundled Barlow Condensed outlines at 1000 px.
  // Fit the visible letters, rather than the font's larger line box, to the frame.
  const wordWidth = width * (compact ? 0.7 : 0.65);
  const wordTransform = `translate(12 73) scale(${wordWidth / 2966} ${(height - 81) / 716}) translate(-27 708)`;
  const motif = characterMotifGraphic(character?.id ?? 'isagi', tokens);
  const svg = `<g data-hero-anime-background="true" aria-hidden="true">
    <g data-hero-wordmark="true" transform="${wordTransform}" opacity="${theme === 'dark' ? '.28' : '.26'}">${decorative('STRIKER', 0, 0, 3100, 1000)}</g>
    <g class="character-motif" transform="translate(${compact ? 304 : 560} ${compact ? 84 : 76}) scale(${compact ? 1 : 1.8})">${motif}</g>
    <g opacity="${theme === 'dark' ? '.34' : '.32'}">${decorative(c.jerseyNumber, width - 18, 223, compact ? 140 : 255, compact ? 170 : 232, 'end')}</g>
  </g>`;
  return { svg };
}
