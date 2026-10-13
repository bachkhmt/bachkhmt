import { ProfileConfig, RenderOptions } from '../types';
import { esc } from './text';

export const layoutKey = (component: string, template: string, layout: string) =>
  `${component}:${template}:${layout}`;

export function stableElementId(id: string): string {
  if (/^[a-zA-Z0-9:_-]{1,100}$/.test(id)) return id;
  let hash = 2166136261;
  for (let index = 0; index < id.length; index++)
    hash = Math.imul(hash ^ id.charCodeAt(index), 16777619);
  const prefix =
    id
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'item';
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

/** Wrap a meaningful SVG group with stable editor metadata and saved canvas coordinates. */
export function layoutElement(
  config: ProfileConfig,
  options: RenderOptions,
  component: string,
  template: string,
  id: string,
  label: string,
  x: number,
  y: number,
  content: string,
): string {
  const safeId = stableElementId(id);
  const saved = config.layoutOverrides?.[layoutKey(component, template, options.layout)]?.[safeId];
  const resolvedX = saved?.x ?? x;
  const resolvedY = saved?.y ?? y;
  const resolvedDx = resolvedX - x;
  const resolvedDy = resolvedY - y;
  const scale = saved?.scale ?? 1;
  const rotation = saved?.rotation ?? 0;
  const transform = elementTransform(x, y, resolvedX, resolvedY, scale, rotation);
  const nodeId = id.startsWith('pitch-node:') ? id.slice('pitch-node:'.length) : undefined;
  return `<g data-layout-element="true"${nodeId !== undefined ? ` data-node-id="${esc(nodeId)}"` : ''} data-element-id="${esc(safeId)}" data-element-label="${esc(label)}" data-origin-x="${x}" data-origin-y="${y}" data-layout-x="${resolvedX}" data-layout-y="${resolvedY}" data-layout-scale="${scale}" data-layout-rotation="${rotation}" transform="${transform}" tabindex="-1" role="group" aria-label="${esc(label)}"><g data-motion-element="true" data-element-id="${esc(safeId)}">${content}</g></g>`;
}

/** Rotate/scale about the original anchor, then translate to the saved anchor. */
export function elementTransform(
  originX: number,
  originY: number,
  x: number,
  y: number,
  scale = 1,
  rotation = 0,
): string {
  return `translate(${(x - originX).toFixed(2)} ${(y - originY).toFixed(2)}) translate(${originX} ${originY}) rotate(${rotation}) scale(${scale}) translate(${-originX} ${-originY})`;
}
