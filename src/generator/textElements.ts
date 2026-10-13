import { ComponentId, ProfileConfig, RenderOptions } from '../types';
import { layoutElement } from './layoutElements';

export const HERO_TEXT_ELEMENTS = {
  'hero-name': { label: 'Name', field: 'name' },
  'hero-role': { label: 'Engineering role', field: 'role' },
  'hero-tagline': { label: 'Tagline', field: 'tagline' },
  'hero-position': { label: 'Player position', field: 'position' },
  'hero-jersey': { label: 'Jersey number', field: 'jersey' },
  'edition-text': { label: 'Edition note text', field: 'edition' },
} as const;

export function textElement(
  config: ProfileConfig,
  options: RenderOptions,
  component: ComponentId,
  template: string,
  element: keyof typeof HERO_TEXT_ELEMENTS,
  x: number,
  y: number,
  body: string,
) {
  return layoutElement(
    config,
    options,
    component,
    template,
    element,
    HERO_TEXT_ELEMENTS[element].label,
    x,
    y,
    body,
  );
}

export function editionNote(
  config: ProfileConfig,
  component: ComponentId,
  template: string,
  fallback: string,
) {
  return config.editionNotes?.[`${component}:${template}`] ?? fallback;
}
