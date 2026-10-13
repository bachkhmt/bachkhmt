import { CharacterId, SkinParams } from '../types';

/** Shape language layered over each character's existing palette and motion. */
export const CHARACTER_SKINS: Record<CharacterId, SkinParams> = {
  isagi: { corner: 'cut', cell: 'square', bar: 'segmented', link: 'straight', flash: 'ring', motifPlacement: 'corner' },
  bachira: { corner: 'ink', cell: 'round', bar: 'ink', link: 'zigzag', flash: 'ink', motifPlacement: 'watermark' },
  rin: { corner: 'ice', cell: 'diamond', bar: 'crack', link: 'curve', flash: 'shock', motifPlacement: 'edge' },
  nagi: { corner: 'round', cell: 'round', bar: 'solid', link: 'dash', flash: 'ring', motifPlacement: 'corner' },
  reo: { corner: 'cut', cell: 'hex', bar: 'segmented', link: 'curve', flash: 'ring', motifPlacement: 'watermark' },
  chigiri: { corner: 'cut', cell: 'diamond', bar: 'speed', link: 'straight', flash: 'shock', motifPlacement: 'edge' },
  barou: { corner: 'crown', cell: 'square', bar: 'solid', link: 'straight', flash: 'shock', motifPlacement: 'corner' },
  kaiser: { corner: 'cut', cell: 'square', bar: 'solid', link: 'bolt', flash: 'lightning', motifPlacement: 'edge' },
};
