import { CharacterId } from '../types';

/** Cover colors are decorative; readable text always uses the paired neutral surface. */
export const COVER_COLORS: Record<CharacterId, { accent: string; shade: string; motif: string }> = {
  isagi: { accent: '#adf332', shade: '#25391c', motif: 'puzzle' },
  bachira: { accent: '#ffd735', shade: '#493816', motif: 'ink' },
  rin: { accent: '#39d8c5', shade: '#163b3a', motif: 'curve' },
  nagi: { accent: '#e6e6e3', shade: '#33343a', motif: 'orbit' },
  reo: { accent: '#c190ff', shade: '#362144', motif: 'hexagon' },
  chigiri: { accent: '#ff76ac', shade: '#4c1b36', motif: 'speed' },
  barou: { accent: '#ff585e', shade: '#4b1820', motif: 'crown' },
  kaiser: { accent: '#71b6ff', shade: '#152e50', motif: 'rose' },
};
