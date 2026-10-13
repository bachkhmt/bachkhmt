import { AnimationPresetId, AnimationSpec, ProfileConfig } from '../types';

export const ANIMATION_PRESETS: Record<AnimationPresetId, { label: string; channels: string[] }> = {
  'fade-up': { label: 'Fade up', channels: ['opacity', 'transform'] },
  'fade-out': { label: 'Fade out', channels: ['opacity'] },
  rise: { label: 'Rise', channels: ['opacity', 'transform'] },
  pop: { label: 'Impact pop', channels: ['opacity', 'transform'] },
  wipe: { label: 'Wipe reveal', channels: ['clip-path'] },
  'draw-stroke': { label: 'Draw stroke', channels: ['stroke'] },
  pulse: { label: 'Pulse', channels: ['transform'] },
  shake: { label: 'Shake', channels: ['transform'] },
  glow: { label: 'Aura glow', channels: ['filter'] },
  spin: { label: 'Turn', channels: ['transform'] },
  sweep: { label: 'Sweep', channels: ['opacity', 'transform'] },
  zoom: { label: 'Zoom in', channels: ['transform'] },
  rotate: { label: 'Rotate in', channels: ['transform'] },
  wobble: { label: 'Wobble', channels: ['transform'] },
  shine: { label: 'Shine', channels: ['filter'] },
  orbit: { label: 'Orbit', channels: ['transform'] },
  bounce: { label: 'Bounce', channels: ['transform'] },
  flip: { label: 'Flip', channels: ['transform'] },
  glitch: { label: 'Glitch', channels: ['opacity', 'transform'] },
  flash: { label: 'Flash', channels: ['opacity'] },
  'blur-in': { label: 'Blur in', channels: ['opacity', 'filter'] },
  'slide-left': { label: 'Slide left', channels: ['transform'] },
  'slide-right': { label: 'Slide right', channels: ['transform'] },
  squash: { label: 'Squash and stretch', channels: ['transform'] },
  tilt: { label: 'Tilt', channels: ['transform'] },
};

export function availableAnimationPresets(clips: AnimationSpec[]): AnimationPresetId[] {
  const used = new Set(clips.flatMap((clip) => ANIMATION_PRESETS[clip.preset].channels));
  return (Object.keys(ANIMATION_PRESETS) as AnimationPresetId[]).filter((id) =>
    ANIMATION_PRESETS[id].channels.every((channel) => !used.has(channel)),
  );
}

const EASINGS = {
  linear: 'linear',
  'ease-out': 'cubic-bezier(.16,.82,.3,1)',
  'ease-in-out': 'ease-in-out',
  'back-out': 'cubic-bezier(.18,.89,.32,1.28)',
} as const;

function presetFrames(preset: AnimationPresetId, color: string) {
  switch (preset) {
    case 'fade-up':
      return {
        from: 'opacity:0;transform:translateY(10px)',
        to: 'opacity:1;transform:translateY(0)',
      };
    case 'fade-out':
      return { from: 'opacity:1', to: 'opacity:0' };
    case 'rise':
      return {
        from: 'opacity:0;transform:translateY(14px)',
        to: 'opacity:1;transform:translateY(0)',
      };
    case 'pop':
      return { from: 'opacity:0;transform:scale(.78)', to: 'opacity:1;transform:scale(1)' };
    case 'wipe':
      return { from: 'clip-path:inset(0 100% 0 0)', to: 'clip-path:inset(0)' };
    case 'draw-stroke':
      return {
        from: 'stroke-dasharray:1000;stroke-dashoffset:1000',
        to: 'stroke-dasharray:1000;stroke-dashoffset:0',
      };
    case 'pulse':
      return { from: 'transform:scale(1)', to: 'transform:scale(1.07)' };
    case 'shake':
      return { from: 'transform:translateX(-3px)', to: 'transform:translateX(3px)' };
    case 'glow':
      return {
        from: 'filter:drop-shadow(0 0 0px transparent)',
        to: `filter:drop-shadow(0 0 8px ${color})`,
      };
    case 'spin':
      return { from: 'transform:rotate(-5deg)', to: 'transform:rotate(5deg)' };
    case 'sweep':
      return {
        from: 'opacity:.35;transform:translateX(-5px)',
        to: 'opacity:1;transform:translateX(0)',
      };
    case 'zoom':
      return { from: 'transform:scale(.65)', to: 'transform:scale(1)' };
    case 'rotate':
      return { from: 'transform:rotate(-18deg)', to: 'transform:rotate(0deg)' };
    case 'wobble':
      return { from: 'transform:rotate(-5deg)', to: 'transform:rotate(5deg)' };
    case 'shine':
      return {
        from: 'filter:brightness(1)',
        to: 'filter:brightness(1.45) drop-shadow(0 0 5px #ffffff)',
      };
    case 'orbit':
      return { from: 'transform:translate(4px,-3px)', to: 'transform:translate(-4px,3px)' };
    case 'bounce':
      return {
        from: 'transform:translateY(-6px) scale(.96,1.04)',
        to: 'transform:translateY(0) scale(1)',
      };
    case 'flip':
      return { from: 'transform:scaleX(.15)', to: 'transform:scaleX(1)' };
    case 'glitch':
      return {
        from: 'opacity:.55;transform:translateX(-2px) skewX(-4deg)',
        to: 'opacity:1;transform:translateX(0) skewX(0)',
      };
    case 'flash':
      return { from: 'opacity:.15', to: 'opacity:1' };
    case 'blur-in':
      return { from: 'opacity:0;filter:blur(4px)', to: 'opacity:1;filter:blur(0)' };
    case 'slide-left':
      return { from: 'transform:translateX(12px)', to: 'transform:translateX(0)' };
    case 'slide-right':
      return { from: 'transform:translateX(-12px)', to: 'transform:translateX(0)' };
    case 'squash':
      return { from: 'transform:scale(.88,1.12)', to: 'transform:scale(1)' };
    case 'tilt':
      return { from: 'transform:rotate(-7deg)', to: 'transform:rotate(7deg)' };
  }
}

function emphasisFrames(preset: AnimationPresetId, color: string) {
  switch (preset) {
    case 'fade-up':
      return {
        from: 'opacity:1;transform:translateY(0)',
        to: 'opacity:1;transform:translateY(-3px)',
      };
    case 'fade-out':
      return { from: 'opacity:1', to: 'opacity:.72' };
    case 'rise':
      return {
        from: 'opacity:1;transform:translateY(0)',
        to: 'opacity:1;transform:translateY(-3px)',
      };
    case 'pop':
      return { from: 'opacity:1;transform:scale(.96)', to: 'opacity:1;transform:scale(1.04)' };
    case 'wipe':
      return { from: 'clip-path:inset(0 4% 0 0)', to: 'clip-path:inset(0)' };
    case 'draw-stroke':
      return {
        from: 'stroke-dasharray:1000;stroke-dashoffset:2',
        to: 'stroke-dasharray:1000;stroke-dashoffset:0',
      };
    case 'sweep':
      return {
        from: 'opacity:1;transform:translateX(-2px)',
        to: 'opacity:1;transform:translateX(2px)',
      };
    case 'flash':
      return { from: 'opacity:.8', to: 'opacity:1' };
    case 'blur-in':
      return {
        from: 'opacity:1;filter:blur(0)',
        to: 'opacity:1;filter:drop-shadow(0 0 4px #ffffff)',
      };
    case 'glitch':
      return {
        from: 'opacity:.85;transform:translateX(-1px)',
        to: 'opacity:1;transform:translateX(1px)',
      };
    case 'shine':
      return {
        from: 'filter:brightness(1)',
        to: 'filter:brightness(1.25) drop-shadow(0 0 4px #ffffff)',
      };
    default:
      return presetFrames(preset, color);
  }
}

/** Build deterministic, cycle-based animations for the selected layout elements. */
export function compileElementMotion(
  config: ProfileConfig,
  component: string,
  template: string,
  layout: string,
  cycleSeconds: number,
  color: string,
): string {
  if (config.animationLevel === 'none') return '';
  const key = `${component}:${template}:${layout}`;
  const entries = config.motionOverrides?.[key] ?? {};
  const css: string[] = [];
  Object.entries(entries).forEach(([elementId, clips]) => {
    if (!Array.isArray(clips)) return;
    const valid = clips
      .slice(0, 4)
      .filter(
        (clip) =>
          clip &&
          /^[a-zA-Z0-9_-]{1,80}$/.test(clip.id) &&
          clip.preset in ANIMATION_PRESETS &&
          clip.startSeconds >= 0 &&
          clip.durationSeconds > 0 &&
          clip.startSeconds + clip.durationSeconds <= cycleSeconds,
      );
    const names: string[] = [];
    valid.forEach((clip, index) => {
      if (!/^[a-zA-Z0-9:_-]{1,100}$/.test(elementId)) return;
      const name = `motion-${component}-${elementId.replace(/[^a-zA-Z0-9_-]/g, '-')}-${index}-${clip.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
      const start = (clip.startSeconds / cycleSeconds) * 100;
      const end = ((clip.startSeconds + clip.durationSeconds) / cycleSeconds) * 100;
      const entrance = presetFrames(clip.preset, color);
      const emphasis = emphasisFrames(clip.preset, color);
      const frames = clip.phase === 'emphasis' || clip.phase === 'path' ? emphasis : entrance;
      const visible = [
        'fade-up',
        'fade-out',
        'rise',
        'pop',
        'sweep',
        'flash',
        'blur-in',
        'glitch',
      ].includes(clip.preset)
        ? 'opacity:1;transform:none;filter:none'
        : clip.preset === 'glow' || clip.preset === 'shine'
          ? 'filter:none'
          : clip.preset === 'wipe'
            ? 'clip-path:inset(0)'
            : clip.preset === 'draw-stroke'
              ? 'stroke-dasharray:1000;stroke-dashoffset:0'
              : 'transform:none';
      const hidden =
        clip.preset === 'fade-up' || clip.preset === 'rise'
          ? 'opacity:0;transform:translateY(10px)'
          : clip.preset === 'pop' || clip.preset === 'zoom'
            ? 'opacity:0;transform:scale(.78)'
            : clip.preset === 'fade-out' || clip.preset === 'flash'
              ? 'opacity:0'
              : clip.preset === 'wipe'
                ? 'clip-path:inset(0 100% 0 0)'
                : clip.preset === 'draw-stroke'
                  ? 'stroke-dasharray:1000;stroke-dashoffset:1000'
                  : clip.preset === 'blur-in'
                    ? 'opacity:0;filter:blur(4px)'
                    : clip.preset === 'glow' || clip.preset === 'shine'
                      ? 'filter:none'
                      : 'transform:none';
      const { from, to } =
        clip.phase === 'exit'
          ? { from: visible, to: hidden }
          : clip.phase === 'emphasis'
            ? { from: emphasis.from, to: emphasis.to }
            : frames;
      const hold =
        clip.phase === 'exit'
          ? visible
          : clip.phase === 'emphasis' || clip.phase === 'path'
            ? visible
            : hidden;
      const easing = EASINGS[clip.easing] ?? 'ease-out';
      const holdEnd = Math.max(0, start - 0.001);
      const points =
        clip.phase === 'emphasis' || clip.phase === 'path'
          ? [
              `0%,${holdEnd}%{${visible}}`,
              `${start}%{${visible}}`,
              `${start + (end - start) * 0.001}%{${from};animation-timing-function:${easing}}`,
              `${start + (end - start) * 0.5}%{${to};animation-timing-function:${easing}}`,
              `${end - (end - start) * 0.001}%{${from};animation-timing-function:${easing}}`,
              `${end}%{${visible}}`,
              `100%{${visible}}`,
            ]
          : [
              `0%,${holdEnd}%{${hold}}`,
              `${start}%{${from};animation-timing-function:${easing}}`,
              `${end}%{${to}}`,
              `100%{${clip.phase === 'exit' ? hidden : to}}`,
            ];
      const ownProperties = (declarations: string) =>
        declarations
          .split(';')
          .filter((declaration) => {
            const property = declaration.split(':')[0];
            return (
              property === 'animation-timing-function' ||
              ANIMATION_PRESETS[clip.preset].channels.some(
                (channel) =>
                  property === channel || (channel === 'stroke' && property.startsWith('stroke-')),
              )
            );
          })
          .join(';');
      const keyframes = `@keyframes ${name}{${points.join('')}}`.replace(
        /\{([^{}]*)\}/g,
        (_, declarations: string) => `{${ownProperties(declarations)}}`,
      );
      css.push(keyframes);
      names.push(`${name} ${cycleSeconds}s linear infinite both`);
    });
    if (names.length)
      css.push(
        `[data-motion-element="true"][data-element-id="${elementId}"]{animation:${names.join(',')};transform-box:fill-box;transform-origin:center}`,
      );
  });
  css.push(
    '@media(prefers-reduced-motion:reduce){[data-motion-element="true"]{animation:none!important;transform:none!important;opacity:1!important;filter:none!important}}',
  );
  return css.join('\n');
}
