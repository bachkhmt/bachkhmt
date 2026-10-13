import { useEffect, useId, useState } from 'react';
import { HeroColorField, ProfileConfig, ThemeMode } from '../types';
import { CHARACTER_THEMES } from '../characters/themes';
import { characterColorway, COLORWAY_LABELS } from '../characters/colorways';
import {
  contrastRatio,
  isHexColor,
  readableHeroText,
  resolveHeroColors,
} from '../characters/heroColors';
import { getCardTemplate } from '../templates/registry';

function ColorField({
  label,
  value,
  defaultValue,
  custom,
  gradient,
  onChange,
  onReset,
}: {
  label: string;
  value: string;
  defaultValue: string;
  custom: boolean;
  gradient: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const errorId = useId();
  useEffect(() => setDraft(value), [value]);
  const invalid = !isHexColor(draft);
  return (
    <div className="hero-color-field">
      <div className="hero-color-field-title">
        <span>{label}</span>
        <small>{custom ? 'Custom' : gradient ? 'Default gradient' : 'Default'}</small>
      </div>
      <div className="hero-color-inputs">
        <input
          type="color"
          aria-label={`${label} — color picker`}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        <input
          aria-label={`${label} — HEX`}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          value={draft}
          spellCheck={false}
          onChange={(event) => {
            const next = event.currentTarget.value;
            setDraft(next);
            if (isHexColor(next)) onChange(next);
          }}
        />
        <button
          type="button"
          className="button"
          aria-label={`Reset ${label.toLowerCase()}`}
          disabled={!custom && !invalid}
          onClick={() => {
            setDraft(defaultValue);
            onReset();
          }}
        >
          Reset
        </button>
      </div>
      {invalid && (
        <p id={errorId} className="hero-color-error">
          Enter a six-digit HEX color, for example #8B5CF6. The current color is kept.
        </p>
      )}
    </div>
  );
}

export function HeroColorsEditor({
  config,
  theme,
  onChange,
}: {
  config: ProfileConfig;
  theme: ThemeMode;
  onChange: (next: ProfileConfig | ((current: ProfileConfig) => ProfileConfig)) => void;
}) {
  const template = getCardTemplate('hero', config.cardTemplates?.hero);
  const character = config.characterOverrides?.hero ?? config.character;
  const palette = resolveHeroColors(config, template.id, character, theme);
  const [resetEpoch, setResetEpoch] = useState(0);
  const labels: Record<HeroColorField, string> = {
    background: template.id === 'classic' ? 'Background' : 'Character background',
    surface: 'Information surface',
    accent: 'Accent',
    text: 'Text',
  };
  const updateColor = (field: HeroColorField, value?: string) =>
    onChange((current) => {
      const overrides = { ...current.heroColorOverrides };
      const colors = { ...overrides[palette.key] };
      if (value) colors[field] = value.toUpperCase();
      else delete colors[field];
      if (Object.keys(colors).length) overrides[palette.key] = colors;
      else delete overrides[palette.key];
      const next = { ...current };
      if (Object.keys(overrides).length) next.heroColorOverrides = overrides;
      else delete next.heroColorOverrides;
      return next;
    });
  const bodyContrast = Math.min(
    ...palette.textBackgrounds.flatMap((background) =>
      [palette.colors.text, palette.muted].map((color) => contrastRatio(color, background)),
    ),
  );
  const accentContrast = Math.min(
    ...palette.textBackgrounds.map((background) =>
      contrastRatio(palette.colors.accent, background),
    ),
  );
  const warnings = [
    bodyContrast < 4.5 ? `body and secondary text (${bodyContrast.toFixed(2)}:1)` : '',
    accentContrast < 4.5 ? `accent text (${accentContrast.toFixed(2)}:1)` : '',
  ].filter(Boolean);
  return (
    <section className="editor-card hero-colors-editor" aria-label="Hero Colors">
      <h3>Colors</h3>
      <p className="hero-color-scope">
        {CHARACTER_THEMES[character].name} · {COLORWAY_LABELS[characterColorway(config, character)]}{' '}
        · {template.name} · {theme === 'dark' ? 'Dark' : 'Light'}
      </p>
      <p className="field-hint">
        Colors save for this character, colorway, design and theme. Wide and compact share colors.
      </p>
      {palette.fields.map((field) => (
        <ColorField
          key={`${palette.key}:${field}:${resetEpoch}`}
          label={labels[field]}
          value={palette.colors[field]}
          defaultValue={palette.defaults[field]}
          custom={!!palette.overrides[field]}
          gradient={
            (template.id === 'classic' || template.id === 'poster') &&
            (field === 'background' || field === 'surface')
          }
          onChange={(value) => updateColor(field, value)}
          onReset={() => updateColor(field)}
        />
      ))}
      {warnings.length > 0 && (
        <p className="hero-color-warning" role="status">
          Low contrast: {warnings.join(', ')}. Target 4.5:1 on information surfaces; your selected
          colors are kept.
        </p>
      )}
      <button
        type="button"
        className="button full"
        onClick={() => updateColor('text', readableHeroText(palette.textBackgrounds))}
      >
        Suggest readable text
      </button>
      <button
        type="button"
        className="button full"
        onClick={() => {
          onChange((current) => {
            const overrides = { ...current.heroColorOverrides };
            delete overrides[palette.key];
            const next = { ...current };
            if (Object.keys(overrides).length) next.heroColorOverrides = overrides;
            else delete next.heroColorOverrides;
            return next;
          });
          setResetEpoch((value) => value + 1);
        }}
      >
        Reset this palette
      </button>
      <p className="field-hint">
        Character artwork keeps its original colors; these controls change SVG layers.
      </p>
    </section>
  );
}
