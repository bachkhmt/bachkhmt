import { CharacterId } from '../types';
export { COVER_COLORS } from './colors';
export type ArtworkPose = 'action' | 'portrait' | 'exhibition';
export interface ArtworkAsset {
  character: CharacterId;
  pose: ArtworkPose;
  width: number;
  height: number;
  dataUri: string;
}
const assets = new Map<string, ArtworkAsset>();
const pending = new Map<CharacterId, Promise<void>>();
const failed = new Map<CharacterId, Error>();
const loaders = {
  isagi: () => import('./generated/isagi'),
  bachira: () => import('./generated/bachira'),
  rin: () => import('./generated/rin'),
  nagi: () => import('./generated/nagi'),
  reo: () => import('./generated/reo'),
  chigiri: () => import('./generated/chigiri'),
  barou: () => import('./generated/barou'),
  kaiser: () => import('./generated/kaiser'),
};
export function retryArtwork() {
  failed.clear();
}
export async function preloadArtwork(characters: readonly CharacterId[]): Promise<void> {
  await Promise.all(
    [...new Set(characters)].map((character) => {
      if (assets.has(`${character}:action`)) return;
      if (pending.has(character)) return pending.get(character);
      failed.delete(character);
      const load = loaders[character]()
        .then((module) => {
          module.default.forEach((asset) =>
            assets.set(`${asset.character}:${asset.pose}`, asset as ArtworkAsset),
          );
        })
        .catch((error) => {
          failed.set(
            character,
            new Error(`Artwork for ${character} could not be loaded. Retry the preview.`),
          );
          throw error;
        })
        .finally(() => pending.delete(character));
      pending.set(character, load);
      return load;
    }),
  );
}
export function getArtwork(character: CharacterId, pose: ArtworkPose): ArtworkAsset {
  const asset = assets.get(`${character}:${pose}`);
  if (asset) return asset;
  if (failed.has(character)) throw failed.get(character);
  if (typeof window !== 'undefined') throw preloadArtwork([character]);
  throw new Error(`Preload artwork before rendering ${character}/${pose}.`);
}
