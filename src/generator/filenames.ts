import { CharacterColorway, CharacterId, ComponentId, LayoutMode, ThemeMode } from '../types';
import { colorwaySuffix } from '../characters/colorways';
import { DEFAULT_CARD_TEMPLATE } from '../templates/registry';

export const svgFilename = (
  id: ComponentId,
  theme: ThemeMode,
  layout: LayoutMode,
  page = 0,
  character: CharacterId = 'isagi',
  template?: string,
  colorway: CharacterColorway = 'default',
) =>
  `${id}${template && template !== DEFAULT_CARD_TEMPLATE[id] ? `.${template}` : ''}.${character}${colorwaySuffix(colorway)}.${theme}.${layout}${page > 0 ? `.p${String(page + 1).padStart(2, '0')}` : ''}.svg`;
