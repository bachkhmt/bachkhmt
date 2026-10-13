import { ComponentId, ProfileConfig, RenderContext, RenderOptions, ThemeMode } from '../types';
import { getCharacterTheme } from '../characters/themes';
import { createFxTimeline } from '../fx/timeline';
import { DEFAULT_CARD_TEMPLATE } from '../templates/registry';
import { resolveHeroColors } from '../characters/heroColors';
import { resolveCharacterPalette } from '../characters/colorways';

export function createRenderContext(
  config: ProfileConfig,
  component: ComponentId,
  mode: ThemeMode,
  options: RenderOptions = { layout: 'wide' },
): RenderContext {
  const characterId = config.characterOverrides?.[component] ?? config.character;
  const character = getCharacterTheme(characterId);
  const palette = resolveCharacterPalette(config, characterId, mode);
  const template =
    options.template ?? config.cardTemplates?.[component] ?? DEFAULT_CARD_TEMPLATE[component];
  return {
    config,
    component,
    template,
    mode,
    layout: options.layout,
    page: options.page ?? 0,
    character,
    tokens:
      component === 'hero'
        ? resolveHeroColors(config, template, characterId, mode).tokens
        : palette.tokens,
    fx: character.fx,
    timeline: createFxTimeline(character, config.animationLevel, config.motionCycleSeconds),
    uid: `${component}-${character.id}${palette.colorway === 'default' ? '' : `-${palette.colorway}`}-${mode}-${options.layout}`,
  };
}
