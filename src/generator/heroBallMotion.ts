import { BallPathKind } from '../types';

// SVG coordinates increase downward. Units are pixels and seconds.
export function createHeroBallMotion(
  width: number,
  ground: number,
  radius: number,
  bounceFactor = 0.32,
  pathKind: BallPathKind = 'drop-bounce-roll',
) {
  if (![width, ground, radius, bounceFactor].every(Number.isFinite) || width <= 0 || radius <= 0)
    throw new RangeError('Ball motion requires positive dimensions and finite physics values.');

  // Slow motion scales acceleration as well as velocity, preserving the same parabola.
  const timeScale = 2.2;
  const gravity = 600 / timeScale ** 2;
  const restitution = Math.min(0.75, Math.max(0.1, bounceFactor));
  const initialVelocityY = pathKind === 'volley' ? -8 / timeScale : 140 / timeScale;
  const initialY = pathKind === 'volley' ? -46 : -24;
  const initialX = -24;
  const fallTime =
    (-initialVelocityY + Math.sqrt(initialVelocityY ** 2 + 2 * gravity * (ground - initialY))) /
    gravity;
  const targetX =
    pathKind === 'sprint' ? width * 0.52 : pathKind === 'volley' ? width * 0.56 : width / 4;
  const velocityX = (targetX - initialX) / fallTime;
  const impactSpeed = initialVelocityY + gravity * fallTime;
  const bounces: { start: number; end: number; apex: number; speed: number }[] = [];
  let time = fallTime;
  let speed = impactSpeed * restitution;
  // The guard protects malformed/extreme configurations from unbounded keyframe generation.
  while (pathKind !== 'trap' && pathKind !== 'sprint' && bounces.length < 32 && speed ** 2 / (2 * gravity) >= 0.25) {
    const end = time + (2 * speed) / gravity;
    bounces.push({ start: time, end, apex: time + speed / gravity, speed });
    time = end;
    speed *= restitution;
  }
  const rollStart = pathKind === 'trap' ? fallTime : time;
  const rollX = initialX + velocityX * rollStart;
  const exitX = width + radius + 24;
  const trapDuration = 0.65;
  const rollDistance =
    pathKind === 'trap'
      ? Math.max(1, (velocityX * trapDuration) / 2)
      : Math.max(1, exitX - rollX);
  const exitVelocity = pathKind === 'trap' ? 0 : velocityX * (pathKind === 'sprint' ? 0.65 : 0.4);
  const rollAcceleration = (exitVelocity ** 2 - velocityX ** 2) / (2 * rollDistance);
  const rollDuration = Math.max(0, (exitVelocity - velocityX) / rollAcceleration);
  const exitTime = rollStart + rollDuration;
  const duration = exitTime + (pathKind === 'trap' ? 14 : 1.2);

  const at = (seconds: number) => {
    const elapsed = Math.min(Math.max(seconds, 0), exitTime);
    const rollTime = Math.max(0, elapsed - rollStart);
    const baseX =
      initialX +
      velocityX * elapsed +
      (rollAcceleration * rollTime ** 2) / 2;
    let y = ground;
    if (elapsed < fallTime)
      y = initialY + initialVelocityY * elapsed + (gravity * elapsed ** 2) / 2;
    else {
      const bounce = bounces.find((item) => elapsed >= item.start && elapsed < item.end);
      if (bounce) {
        const dt = elapsed - bounce.start;
        y = ground - bounce.speed * dt + (gravity * dt ** 2) / 2;
      }
    }

    let x = baseX;
    if (pathKind === 'curve' && elapsed < fallTime)
      x += Math.sin((Math.PI * elapsed) / fallTime) ** 2 * Math.min(56, width * 0.08);
    if (pathKind === 'zigzag') {
      const progress = Math.min(1, elapsed / exitTime);
      x += Math.sin(progress * Math.PI * 6) * Math.sin(progress * Math.PI) ** 2 * Math.min(30, width * 0.06);
    }
    // Angular travel follows actual horizontal distance for the standard rolling path.
    return { x, y, angle: (((x - initialX) / radius) * 180) / Math.PI };
  };

  const times = new Set([0, fallTime, rollStart, exitTime, duration]);
  times.add(rollStart + rollDuration / 3);
  times.add(rollStart + (rollDuration * 2) / 3);
  if (pathKind === 'curve' || pathKind === 'zigzag') {
    const segments = pathKind === 'curve' ? 8 : 12;
    for (let i = 1; i < segments; i++) times.add((exitTime * i) / segments);
  }
  for (const bounce of bounces) {
    times.add(bounce.start);
    times.add(bounce.apex);
    times.add(bounce.end);
  }
  const frames = [...times]
    .sort((a, b) => a - b)
    .map((frameTime) => ({ time: frameTime, ...at(frameTime) }));

  return {
    gravity,
    restitution,
    velocityX,
    fallTime,
    bounces,
    rollStart,
    rollX,
    rollAcceleration,
    rollDuration,
    exitTime,
    duration,
    frames,
    at,
  };
}
