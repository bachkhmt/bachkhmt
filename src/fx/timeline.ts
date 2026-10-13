import { CharacterTheme, FxPlan, ProfileConfig } from '../types';

export function createFxTimeline(character: CharacterTheme, level: ProfileConfig['animationLevel'], cycleOverride?: number): FxPlan {
  const cycleSeconds = cycleOverride ?? (level === 'cinematic' ? 20 : level === 'subtle' ? 18 : 16);
  const introSeconds =
    level === 'none'
      ? 0
      : character.fx.intro === 'speed' || character.fx.intro === 'lightning'
        ? 1.4
        : character.fx.intro === 'drift'
          ? 3.2
          : level === 'cinematic'
            ? 3
            : 2.1;
  const introEnd = Math.min(0.32, introSeconds / cycleSeconds);
  const holdEnd = level === 'none' ? 1 : 0.92;
  const keyTimes = [0, introEnd, Math.max(introEnd, holdEnd), 1];
  return {
    cycleSeconds,
    introSeconds,
    idleSeconds: Math.max(0, cycleSeconds - introSeconds),
    keyTimes,
    keyTimesPercent: keyTimes.map((time) => `${(time * 100).toFixed(3)}%`).join(';'),
  };
}
