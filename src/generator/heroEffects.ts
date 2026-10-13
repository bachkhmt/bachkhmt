import { CharacterFx, ColorTokens, ProfileConfig } from '../types';
import { createHeroBallMotion } from './heroBallMotion';

export const HERO_BALL_SCALE = 0.64;
export const HERO_BALL_RADIUS = 23 * HERO_BALL_SCALE;

export function heroBallEffects(
  prefix: string,
  t: ColorTokens,
  width: number,
  height: number,
  motion: ProfileConfig['animationLevel'],
  fx?: CharacterFx,
  cycleSeconds = 16,
) {
  const scale = HERO_BALL_SCALE,
    radius = HERO_BALL_RADIUS;
  const floor = height - 5,
    y = floor - radius,
    start = width - 76;
  const defs = `
    <radialGradient id="${prefix}-ball-sphere-3d" cx="32%" cy="26%" r="78%">
      <stop stop-color="${t.ballLight}"/><stop offset=".6" stop-color="${t.ballSoft}"/>
      <stop offset=".87" stop-color="${t.ballMid}"/><stop offset="1" stop-color="${t.ballEdge}"/>
    </radialGradient>
    <radialGradient id="${prefix}-ball-shadow-inner" cx="30%" cy="24%" r="85%">
      <stop stop-color="${t.ballShadowSoft}" stop-opacity="0"/><stop offset=".65" stop-color="${t.ballShadowSoft}" stop-opacity=".02"/>
      <stop offset="1" stop-color="${t.ballShadow}" stop-opacity=".28"/>
    </radialGradient>
    <radialGradient id="${prefix}-patch-gloss" cx="30%" cy="25%" r="75%">
      <stop stop-color="${t.ballSeamLight}"/><stop offset=".5" stop-color="${t.ballSeam}"/><stop offset="1" stop-color="${t.ballDark}"/>
    </radialGradient>
    <clipPath id="${prefix}-ball-silhouette"><circle r="23"/></clipPath>
    <g id="${prefix}-ball-panels">
      <polygon points="0,-7.5 7.13,-2.32 4.41,6.07 -4.41,6.07 -7.13,-2.32" fill="url(#${prefix}-patch-gloss)" stroke="${t.ballOutline}" stroke-width="1.1" />
      <path d="M -5.5 -16.5 L 5.5 -16.5 L 8 -21.5 C 3 -23 -3 -23 -8 -21.5 Z" fill="url(#${prefix}-patch-gloss)" stroke="${t.ballOutline}" stroke-width="0.9" />
      <path d="M 16.5 -3.5 L 12.8 -12 L 18 -15 C 21.5 -10 22.5 -5 21 0 Z" fill="url(#${prefix}-patch-gloss)" stroke="${t.ballOutline}" stroke-width="0.9" />
      <path d="M 8.5 13 L 16.8 6.5 L 21 10 C 19 15 15 19 10 21 Z" fill="url(#${prefix}-patch-gloss)" stroke="${t.ballOutline}" stroke-width="0.9" />
      <path d="M -8.5 13 L -10 21 C -15 19 -19 15 -21 10 L -16.8 6.5 Z" fill="url(#${prefix}-patch-gloss)" stroke="${t.ballOutline}" stroke-width="0.9" />
      <path d="M -16.5 -3.5 L -21 0 C -22.5 -5 -21.5 -10 -18 -15 L -12.8 -12 Z" fill="url(#${prefix}-patch-gloss)" stroke="${t.ballOutline}" stroke-width="0.9" />
      <line x1="0" y1="-7.5" x2="0" y2="-16.5" stroke="${t.ballSeam}" stroke-width="1.2" />
      <line x1="7.13" y1="-2.32" x2="16.5" y2="-3.5" stroke="${t.ballSeam}" stroke-width="1.2" />
      <line x1="4.41" y1="6.07" x2="8.5" y2="13" stroke="${t.ballSeam}" stroke-width="1.2" />
      <line x1="-4.41" y1="6.07" x2="-8.5" y2="13" stroke="${t.ballSeam}" stroke-width="1.2" />
      <line x1="-7.13" y1="-2.32" x2="-16.5" y2="-3.5" stroke="${t.ballSeam}" stroke-width="1.2" />
      <line x1="5.5" y1="-16.5" x2="12.8" y2="-12" stroke="${t.ballSeam}" stroke-width="1.1" />
      <line x1="-5.5" y1="-16.5" x2="-12.8" y2="-12" stroke="${t.ballSeam}" stroke-width="1.1" />
      <line x1="16.5" y1="-3.5" x2="16.8" y2="6.5" stroke="${t.ballSeam}" stroke-width="1.1" />
      <line x1="-16.5" y1="-3.5" x2="-16.8" y2="6.5" stroke="${t.ballSeam}" stroke-width="1.1" />
      <line x1="8.5" y1="13" x2="-8.5" y2="13" stroke="${t.ballSeam}" stroke-width="1.1" />
    </g>`;

  const full = motion === 'full' || motion === 'cinematic';
  const trajectory = createHeroBallMotion(width, y, radius, fx?.restitution, fx?.ball);
  const duration = Math.max(trajectory.duration, cycleSeconds);
  const frames = duration > trajectory.duration
    ? [...trajectory.frames, { time: duration, ...trajectory.at(duration) }]
    : trajectory.frames;
  const round = (value: number) => Number(value.toFixed(4));
  const key = (time: number) => Number(((time / duration) * 100).toFixed(6));
  const timing = (time: number) => {
    if (time === 0) return 'animation-timing-function:cubic-bezier(.45,0,.9,.25);';
    if (time === trajectory.fallTime || trajectory.bounces.some((bounce) => time === bounce.end))
      return 'animation-timing-function:cubic-bezier(.15,.72,.35,1);';
    if (trajectory.bounces.some((bounce) => time === bounce.apex))
      return 'animation-timing-function:cubic-bezier(.55,0,.9,.25);';
    if (time === trajectory.rollStart)
      return 'animation-timing-function:cubic-bezier(.12,.62,.34,1);';
    return '';
  };
  const yFrames = frames
    .map((frame) => `${key(frame.time)}%{transform:translateY(${round(frame.y)}px);${timing(frame.time)}}`)
    .join('');
  const xFrames = frames
    .map((frame) => `${key(frame.time)}%{transform:translateX(${round(frame.x)}px);}`)
    .join('');
  const spinFrames = frames
    .map((frame) => `${key(frame.time)}%{transform:rotate(${round(frame.angle)}deg);}`)
    .join('');
  const shadowFrames = frames
    .map((frame) => {
      const distance = Math.max(0, y - frame.y);
      const size = Math.max(0.2, 1 - distance / 80);
      const opacity = Math.max(0, 0.32 - distance / 160);
      return `${key(frame.time)}%{transform:translate(${round(frame.x)}px,${floor}px) scale(${round(size)},${round(Math.max(0.2, 1 - distance / 120))});opacity:${round(opacity)};}`;
    })
    .join('');
  const squashFrames = frames
    .map((frame) => {
      const hit = frame.time === trajectory.fallTime || trajectory.bounces.some((bounce) => frame.time === bounce.end);
      const apex = trajectory.bounces.some((bounce) => frame.time === bounce.apex);
      const squash = hit ? 'scale(1.16,.82)' : apex ? 'scale(.92,1.1)' : 'scale(1,1)';
      return `${key(frame.time)}%{transform:${squash};}`;
    })
    .join('');

  const rawImpacts = [trajectory.fallTime, ...trajectory.bounces.map((bounce) => bounce.end)];
  const impacts = rawImpacts.filter((time, index) => index === 0 || time - rawImpacts[index - 1] >= 0.5).slice(0, 5);
  const impactColor =
    fx?.impact === 'lightning' ? t.signal : fx?.impact === 'ink' ? t.royal : fx?.impact === 'shock' ? t.accent2 : t.glow;
  const impactStyles = impacts
    .map((time, index) => {
      const at = key(time);
      const before = Math.max(0, at - 0.45);
      const after = Math.min(100, at + 1.4);
      return `@keyframes ${prefix}-impact-${index}{0%,${before}%{opacity:0;transform:scale(.2)}${at}%{opacity:.8;transform:scale(1)}${after}%,100%{opacity:0;transform:scale(1.7)}}.hero-ball-impact-${index}{animation:${prefix}-impact-${index} ${duration}s linear infinite;}`;
    })
    .join('');
  const impactSvg =
    full && fx?.impact !== 'none'
      ? impacts
          .map((time, index) => {
            const contact = trajectory.at(time);
            const x = round(contact.x);
            const kind = fx?.impact ?? 'ring';
            const ring = `<circle cx="${x}" cy="${floor}" r="7" fill="none" stroke="${impactColor}" stroke-width="1.5"/>`;
            const shock = `<path d="M${x} ${floor - 14}V${floor - 8}M${x} ${floor + 8}v6M${x - 14} ${floor}h6M${x + 8} ${floor}h6M${x - 10} ${floor - 10}l5 5M${x + 5} ${floor + 5}l5 5M${x + 10} ${floor - 10}l-5 5M${x - 5} ${floor + 5}l-5 5" fill="none" stroke="${impactColor}" stroke-width="1.7" stroke-linecap="round"/>`;
            const lightning = `<path d="M${x + 2} ${floor - 15}l-8 12h6l-3 13 11-16h-7l4-9z" fill="${impactColor}"/>`;
            const ink = `<circle cx="${x - 7}" cy="${floor - 2}" r="4" fill="${impactColor}"/><circle cx="${x + 5}" cy="${floor - 7}" r="6" fill="${impactColor}"/><circle cx="${x + 10}" cy="${floor + 3}" r="3" fill="${impactColor}"/>`;
            const motif = kind === 'lightning' ? lightning : kind === 'ink' ? ink : `${ring}${kind === 'shock' ? shock : ''}`;
            return `<g class="hero-ball-impact-${index}" opacity="0">${motif}</g>`;
          })
          .join('')
      : '';
  const styles = `
    .hero-ball-travel{transform:translateX(${start}px);${full ? `animation:${prefix}-ball-x ${duration}s linear infinite;` : motion === 'none' ? '' : `animation:${prefix}-ball-run 15s linear infinite;`}}
    .hero-ball-bounce{transform:translateY(${y}px);${full ? `animation:${prefix}-ball-y ${duration}s linear infinite;` : ''}}
    .hero-ball-spin{transform-origin:0 0;${full ? `animation:${prefix}-ball-spin ${duration}s linear infinite;` : motion === 'none' ? '' : `animation:${prefix}-ball-slow-spin 15s linear infinite;`}}
    .hero-ball-squash{transform-box:fill-box;transform-origin:center bottom;${full ? `animation:${prefix}-ball-squash ${duration}s linear infinite;` : ''}}
    .hero-ball-shadow{transform:translate(${start}px,${floor}px);opacity:.32;${full ? `animation:${prefix}-ball-shadow ${duration}s linear infinite;` : ''}}
    ${impactStyles}
    @keyframes ${prefix}-ball-y{${yFrames}}
    @keyframes ${prefix}-ball-x{${xFrames}}
    @keyframes ${prefix}-ball-spin{${spinFrames}}
    @keyframes ${prefix}-ball-squash{${squashFrames}}
    @keyframes ${prefix}-ball-shadow{${shadowFrames}}
    @keyframes ${prefix}-ball-run{from{transform:translateX(-38px)}to{transform:translateX(${width + 38}px)}}
    @keyframes ${prefix}-ball-slow-spin{to{transform:rotate(${round((((width + 76) / radius) * 180) / Math.PI)}deg)}}
    @media(prefers-reduced-motion:reduce){
      .hero-ball-travel,.hero-ball-bounce,.hero-ball-spin,.hero-ball-squash,.hero-ball-shadow,.hero-ball-impact-0,.hero-ball-impact-1,.hero-ball-impact-2,.hero-ball-impact-3,.hero-ball-impact-4{animation:none!important}
      .hero-ball-travel{transform:translateX(${start}px)}.hero-ball-bounce{transform:translateY(${y}px)}
      .hero-ball-spin{transform:none}.hero-ball-squash{transform:none}.hero-ball-shadow{transform:translate(${start}px,${floor}px);opacity:.32}
    }`;
  const svg = `<g data-hero-ball-lane="true">
    <path d="M24 ${floor}H${width - 24}" stroke="${t.pitchLine}" opacity=".25"/>
    ${full ? `<ellipse class="hero-ball-shadow" rx="18" ry="2.5" fill="${t.ballShadowFill}"/>` : ''}
    ${impactSvg}
    <g class="hero-ball-travel" transform="translate(${start} 0)">
      ${!full ? `<ellipse cy="${floor}" rx="18" ry="2.5" fill="${t.ballShadowFill}" opacity=".32"/>` : ''}
      <g class="hero-ball-bounce" transform="translate(0 ${y})">
        <g class="hero-ball-squash">
          <g transform="scale(${scale})">
            <circle class="hero-ball-shell" r="23" fill="url(#${prefix}-ball-sphere-3d)"/>
            <g clip-path="url(#${prefix}-ball-silhouette)"><g class="hero-ball-spin"><use href="#${prefix}-ball-panels"/></g></g>
            <circle class="hero-ball-light" r="23" fill="url(#${prefix}-ball-shadow-inner)"/>
            <path d="M-13-13Q-7-20 4-19" stroke="${t.ballHighlight}" stroke-width="1.4" stroke-linecap="round" opacity=".65" fill="none"/>
            <circle r="22.5" fill="none" stroke="${t.ballOutlineLight}" stroke-width="1"/>
          </g>
        </g>
      </g>
    </g></g>`;
  return { defs, styles, svg };
}
