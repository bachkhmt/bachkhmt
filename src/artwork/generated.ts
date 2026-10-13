// Offline aggregate for tooling and tests; browser code uses per-character imports.
import isagi from './generated/isagi';
import bachira from './generated/bachira';
import rin from './generated/rin';
import nagi from './generated/nagi';
import reo from './generated/reo';
import chigiri from './generated/chigiri';
import barou from './generated/barou';
import kaiser from './generated/kaiser';
export const ARTWORK = [...isagi,...bachira,...rin,...nagi,...reo,...chigiri,...barou,...kaiser] as const;
