import { ProfileConfig } from '../types';

const PITCH = 24;
// Two links form a full repeat because adjacent links lean in opposite directions.
const PERIOD = PITCH * 2;
const links = (count: number, first = 0) =>
  Array.from({ length: count }, (_, index) => {
    const i = index + first;
    return `<ellipse cx="${i * PITCH}" cy="0" rx="16" ry="6" transform="rotate(${i % 2 ? -24 : 24} ${i * PITCH} 0)"/>`;
  }).join('');

export const chain = (x: number, y: number, length: number, color: string, angle = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${angle})" fill="none" stroke="${color}" stroke-width="2.5">${links(Math.ceil(length / PITCH))}</g>`;

/** Move repeated links along the strip's own axis, preserving its placement and angle. */
export function movingCoverChain(
  x: number,
  y: number,
  length: number,
  color: string,
  angle: number,
  options: {
    uid: string;
    part: 'back' | 'front';
    motion: ProfileConfig['animationLevel'];
    cycleSeconds: number;
  },
): { svg: string; definitions: string; styles: string } {
  if (options.motion === 'none')
    return { svg: chain(x, y, length, color, angle), definitions: '', styles: '' };

  const count = Math.ceil(length / PITCH);
  const clipId = `${options.uid}-clip`;
  const keyframes = `${options.uid}-flow`;
  const duration = options.cycleSeconds / (options.motion === 'subtle' ? 4 : 8);
  const shift = options.part === 'back' ? PERIOD : -PERIOD;
  return {
    definitions: `<clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><rect x="-18" y="-16" width="${(count - 1) * PITCH + 36}" height="32"/></clipPath>`,
    styles: `@keyframes ${keyframes}{from{transform:translateX(0)}to{transform:translateX(${shift}px)}}`,
    svg: `<g data-cover-chain="${options.part}" data-chain-period="${PERIOD}" transform="translate(${x} ${y}) rotate(${angle})" fill="none" stroke="${color}" stroke-width="2.5"><g clip-path="url(#${clipId})"><g class="cover-chain-flow" style="animation:${keyframes} ${duration}s linear infinite">${links(count + 6, -3)}</g></g></g>`,
  };
}

export const COVER_CHAIN_REDUCED_MOTION =
  '@media(prefers-reduced-motion:reduce){.cover-chain-flow{animation:none!important;transform:none!important}}';
