import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  AnimationSpec,
  ComponentId,
  DataSource,
  LayoutMode,
  ProfileConfig,
  MatchStats,
  ThemeMode,
  EditableTextField,
  TextEffectSettings,
} from '../types';
import { HeroColorsEditor } from './HeroColorsEditor';
import {
  applyPreset,
  arrangeFormation,
  CHARACTER_PRESETS,
  DEFAULT_CONFIG,
} from '../data/defaultConfig';
import { parseConfig, parseConfigWithMigration, serializeConfig } from '../data/configStore';
import { syncGithub } from '../data/github';
import { syncPublicGithubContributions } from '../data/githubContributions';
import { downloadFile } from '../browserIO';
import { COMPONENT_REGISTRY, svgDataUrl } from '../generator/svgGenerators';
import { CHARACTER_IDS, CHARACTER_THEMES } from '../characters/themes';
import {
  characterColorway,
  COLORWAY_LABELS,
  resolveCharacterPalette,
} from '../characters/colorways';
import { DESIGN_REFERENCE_SOURCES, getCardTemplate } from '../templates/registry';
import { layoutKey } from '../generator/layoutElements';
import { ANIMATION_PRESETS, availableAnimationPresets } from '../fx/presets';
import { safeHttpUrl } from '../readme/links';
import { HERO_TEXT_ELEMENTS, editionNote } from '../generator/textElements';
import { heroTaglines } from '../generator/text';

interface Props {
  config: ProfileConfig;
  selected: ComponentId;
  onChange: (next: ProfileConfig | ((c: ProfileConfig) => ProfileConfig)) => void;
  onReset: () => void;
  onImport: (config: ProfileConfig) => void;
  activeNodeId?: string;
  resetEpoch: number;
  sound: boolean;
  onSound: (v: boolean) => void;
  notify: (message: string, error?: boolean) => void;
  layoutEdit: boolean;
  onLayoutEdit: (value: boolean) => void;
  layout: LayoutMode;
  theme: ThemeMode;
  activeElementId: string;
  activeElementLabel: string;
  activeElementX: number;
  activeElementY: number;
  activeElementOriginX: number;
  activeElementOriginY: number;
  activeElementScale: number;
  activeElementRotation: number;
  onLayoutCommit: (
    elementId: string,
    x: number,
    y: number,
    scale?: number,
    rotation?: number,
  ) => void;
  onResetLayout: (elementId: string) => void;
}
function Field({
  label,
  value,
  onChange,
  multiline = false,
  deferred = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  deferred?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  useEffect(() => {
    setDraft(value);
    setError('');
  }, [value]);
  const url = label.includes('URL') && !label.includes('handle');
  const valid = (text: string) => !url || !text.trim() || !!safeHttpUrl(text);
  const change = (text: string) => {
    setDraft(text);
    setError('');
    if (!deferred && valid(text)) onChange(text);
  };
  const commit = () => {
    if (!valid(draft)) {
      setError('Use a valid http(s) URL. The last valid value is kept.');
      return;
    }
    if (deferred) onChange(draft);
  };
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          aria-label={label}
          rows={3}
          value={draft}
          aria-invalid={!!error}
          onChange={(e) => change(e.target.value)}
          onBlur={commit}
        />
      ) : (
        <input
          aria-label={label}
          value={draft}
          aria-invalid={!!error}
          onChange={(e) => change(e.target.value)}
          onBlur={commit}
        />
      )}
      {error && (
        <small className="error-text" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const number = draft.trim() ? Number(draft) : NaN;
    if (!Number.isFinite(number)) {
      setDraft(String(value));
      return;
    }
    const safe = Math.max(min, Math.min(max, number));
    setDraft(String(safe));
    if (safe !== value) onChange(safe);
  };
  return (
    <label className="field">
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={draft}
        onBlur={commit}
        onChange={(e) => {
          setDraft(e.target.value);
          const number = e.currentTarget.valueAsNumber;
          if (Number.isFinite(number) && number >= min && number <= max) onChange(number);
        }}
      />
    </label>
  );
}
function TextAnimationEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: TextEffectSettings;
  onChange: (value: TextEffectSettings | undefined) => void;
}) {
  const effect = value?.effect ?? 'theme';
  return (
    <div className="text-animation-editor">
      <label className="field">
        <span>{label}</span>
        <select
          aria-label={label}
          value={effect}
          onChange={(event) => {
            const next = event.currentTarget.value as TextEffectSettings['effect'];
            onChange(next === 'theme' ? undefined : { ...value, effect: next });
          }}
        >
          <option value="theme">Design default</option>
          <option value="typewriter">Typewriter / Gõ từng chữ</option>
          <option value="pop-up">Pop up / Bật lên từng chữ</option>
          <option value="blur-in">Blur in / Hiện dần</option>
          <option value="slide">Slide / Trượt từng chữ</option>
          <option value="glitch">Glitch / Nhấp nháy từng chữ</option>
          <option value="none">None / Không hiệu ứng</option>
        </select>
      </label>
      {effect !== 'theme' && effect !== 'none' && (
        <div className="field-pair">
          <NumberField
            label={`${label} delay (seconds)`}
            value={value?.delaySeconds ?? 0}
            min={0}
            max={3}
            step={0.1}
            onChange={(delaySeconds) => onChange({ ...value, effect, delaySeconds })}
          />
          <NumberField
            label={`${label} letter interval (seconds)`}
            value={value?.letterSeconds ?? 0.075}
            min={0.02}
            max={0.25}
            step={0.005}
            onChange={(letterSeconds) => onChange({ ...value, effect, letterSeconds })}
          />
        </div>
      )}
    </div>
  );
}

function SourceSelect({
  value,
  onChange,
  github = false,
  label = 'Data source',
}: {
  value: DataSource;
  onChange: (v: DataSource) => void;
  github?: boolean;
  label?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as DataSource)}
      >
        <option value="demo">Demo / sample data</option>
        <option value="manual">Manual / my data</option>
        {github && value === 'github' && <option value="github">GitHub API</option>}
      </select>
    </label>
  );
}

export function ConfigEditor({
  config: c,
  selected,
  onChange,
  onReset,
  onImport,
  activeNodeId,
  resetEpoch,
  sound,
  onSound,
  notify,
  layoutEdit,
  onLayoutEdit,
  layout,
  theme,
  activeElementId,
  activeElementLabel,
  activeElementX,
  activeElementY,
  activeElementOriginX,
  activeElementOriginY,
  activeElementScale,
  activeElementRotation,
  onLayoutCommit,
  onResetLayout,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null),
    [fetching, setFetching] = useState(false),
    [resetArmed, setResetArmed] = useState(false),
    [contributionFetching, setContributionFetching] = useState(false),
    [skinPreviewsOpen, setSkinPreviewsOpen] = useState(false),
    [styleOpen, setStyleOpen] = useState(false),
    [configurationOpen, setConfigurationOpen] = useState(false),
    [activityDraft, setActivityDraft] = useState<string | null>(null),
    [positionDraft, setPositionDraft] = useState({
      x: activeElementX,
      y: activeElementY,
      scale: activeElementScale,
      rotation: activeElementRotation,
    });
  useEffect(() => {
    setActivityDraft(null);
    setResetArmed(false);
  }, [resetEpoch]);
  const usernameRef = useRef(c.socials.github);
  usernameRef.current = c.socials.github;
  const calendarRef = useRef({ days: c.seasonDays, source: c.seasonSource, draft: activityDraft });
  calendarRef.current = { days: c.seasonDays, source: c.seasonSource, draft: activityDraft };
  const update = <K extends keyof ProfileConfig>(key: K, value: ProfileConfig[K]) =>
    onChange((current) => ({
      ...current,
      [key]: value,
      ...(key === 'skills'
        ? { skillSource: 'manual' as const }
        : key === 'languages'
          ? { languageSource: 'manual' as const }
          : key === 'projects'
            ? { projectSource: 'manual' as const }
            : {}),
    }));
  const text = (key: keyof ProfileConfig, label: string, multiline = false) => (
    <Field
      key={key}
      label={label}
      value={c[key] as string}
      onChange={(v) =>
        key === 'egoTagline' && selected === 'hero'
          ? onChange((current) => ({
              ...current,
              egoTagline: v,
              taglines: [],
              presentation: { ...current.presentation, shortTagline: undefined },
            }))
          : update(key, v as never)
      }
      multiline={multiline}
    />
  );
  const component = COMPONENT_REGISTRY.find((x) => x.id === selected)!;
  const selectedTemplate = getCardTemplate(selected, c.cardTemplates?.[selected]).id;
  const definition = getCardTemplate(selected, selectedTemplate);
  const hasEditionNote = !!definition.collection && selectedTemplate !== 'chapter-log';
  const editionKey = `${selected}:${selectedTemplate}`;
  const note = editionNote(
    c,
    selected,
    selectedTemplate,
    `EGO STRIKER / ${definition.collection?.toUpperCase()} EDITION`,
  );
  const updateTextEffect = (field: EditableTextField, value: TextEffectSettings | undefined) =>
    onChange((current) => {
      const settings = { ...current.textEffects };
      if (value) settings[field] = value;
      else delete settings[field];
      return { ...current, textEffects: Object.keys(settings).length ? settings : undefined };
    });
  const effectEditor = (field: EditableTextField, label: string) => (
    <TextAnimationEditor
      label={label}
      value={c.textEffects?.[field]}
      onChange={(value) => updateTextEffect(field, value)}
    />
  );
  const updateNote = (value: string | undefined) =>
    onChange((current) => {
      const notes = { ...current.editionNotes };
      if (value === undefined) delete notes[editionKey];
      else notes[editionKey] = value.slice(0, 200);
      return { ...current, editionNotes: Object.keys(notes).length ? notes : undefined };
    });
  const activeTextField =
    activeElementId === 'edition-note'
      ? 'edition'
      : HERO_TEXT_ELEMENTS[activeElementId as keyof typeof HERO_TEXT_ELEMENTS]?.field;
  const selectedTextContent =
    activeTextField === 'name'
      ? c.displayName
      : activeTextField === 'role'
        ? c.role
        : activeTextField === 'tagline'
          ? heroTaglines(c).join('\n')
          : activeTextField === 'position'
            ? c.positionName
            : activeTextField === 'jersey'
              ? c.jerseyNumber
              : note;
  const updateSelectedText = (value: string) => {
    if (activeTextField === 'name') update('displayName', value);
    else if (activeTextField === 'role') update('role', value);
    else if (activeTextField === 'position') update('positionName', value);
    else if (activeTextField === 'jersey') update('jerseyNumber', value);
    else if (activeTextField === 'edition') updateNote(value);
    else if (activeTextField === 'tagline')
      onChange((current) => ({
        ...current,
        taglines: value
          .split(/\r?\n/)
          .map((line) => line.trim().slice(0, 200))
          .filter(Boolean)
          .slice(0, 8),
        egoTagline: value.split(/\r?\n/)[0] ?? '',
        presentation: { ...current.presentation, shortTagline: undefined },
      }));
  };
  const skinPreviews = useMemo(() => {
    if (!skinPreviewsOpen) return [];
    return CHARACTER_IDS.map((id) => {
      const preview = structuredClone(DEFAULT_CONFIG);
      preview.character = id;
      preview.animationLevel = 'none';
      preview.heroColorOverrides = c.heroColorOverrides;
      preview.characterColorways = c.characterColorways;
      preview.cardTemplates = { ...preview.cardTemplates, [selected]: selectedTemplate };
      return {
        id,
        src: svgDataUrl(component.render(preview, theme, { layout, template: selectedTemplate })),
      };
    });
  }, [
    skinPreviewsOpen,
    component,
    selected,
    selectedTemplate,
    layout,
    theme,
    c.heroColorOverrides,
    c.characterColorways,
  ]);
  const designPreviews = useMemo(
    () =>
      !styleOpen
        ? []
        : component.templates.map((id) => {
            const preview = {
              ...c,
              animationLevel: 'none' as const,
              layoutOverrides: {},
              motionOverrides: {},
            };
            return {
              ...getCardTemplate(selected, id),
              src: svgDataUrl(component.render(preview, theme, { layout, template: id })),
            };
          }),
    [component, selected, c, layout, theme, styleOpen],
  );
  const motionKey = layoutKey(selected, selectedTemplate, layout);
  const pitchNode = activeNodeId !== undefined;
  const motionClips: AnimationSpec[] = activeElementId
    ? (c.motionOverrides?.[motionKey]?.[activeElementId] ?? [])
    : [];
  const cycleSeconds =
    c.motionCycleSeconds ??
    (c.animationLevel === 'cinematic' ? 20 : c.animationLevel === 'subtle' ? 18 : 16);
  const updateMotionClips = (clips: AnimationSpec[]) => {
    if (!activeElementId) return;
    const current = { ...c.motionOverrides?.[motionKey] };
    if (clips.length) current[activeElementId] = clips;
    else delete current[activeElementId];
    const all = { ...c.motionOverrides, [motionKey]: current };
    if (!Object.keys(current).length) delete all[motionKey];
    update('motionOverrides', all);
  };
  const availablePresets = availableAnimationPresets(motionClips);
  const channelsFor = (preset: keyof typeof ANIMATION_PRESETS) =>
    ANIMATION_PRESETS[preset].channels;
  useEffect(
    () =>
      setPositionDraft({
        x: activeElementX,
        y: activeElementY,
        scale: activeElementScale,
        rotation: activeElementRotation,
      }),
    [activeElementId, activeElementX, activeElementY, activeElementScale, activeElementRotation],
  );
  const shortened = useMemo(
    () => component.render({ ...c, animationLevel: 'none' }, theme, { layout }).includes('…'),
    [component, c, theme, layout],
  );
  const presentation = c.presentation ?? {};
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error('Configuration file must be smaller than 1 MB.');
      const result = parseConfigWithMigration(JSON.parse(await file.text()));
      onImport(result.config);
      setActivityDraft(null);
      notify(
        result.warnings.length
          ? `Configuration imported. ${result.warnings.join(' ')}`
          : result.migrated
            ? 'Configuration imported and upgraded to version 3.'
            : 'Configuration imported.',
      );
    } catch (e) {
      notify(`Import failed: ${(e as Error).message}`, true);
    }
    if (fileRef.current) fileRef.current.value = '';
  }
  async function sync() {
    setFetching(true);
    try {
      const snapshot = c,
        result = await syncGithub(snapshot);
      if (usernameRef.current.trim() !== snapshot.socials.github.trim()) {
        notify('Username changed during sync. Run sync again for the new account.');
        return;
      }
      onChange((current) =>
        current.socials.github.trim() === snapshot.socials.github.trim()
          ? {
              ...current,
              matchStats: { ...current.matchStats, matches: result.matchStats.matches },
              statSources: { ...current.statSources, matches: 'github' },
            }
          : current,
      );
      notify('Public repository count synced. Other edits were kept.');
    } catch (e) {
      notify(`${(e as Error).message} Your edits were kept.`, true);
    } finally {
      setFetching(false);
    }
  }
  async function syncContributions() {
    setContributionFetching(true);
    const snapshot = c;
    const originalDraft = calendarRef.current.draft;
    try {
      const result = await syncPublicGithubContributions(snapshot);
      if (usernameRef.current.trim() !== snapshot.socials.github.trim()) {
        notify('Username changed during sync. Run sync again for the new account.');
        return;
      }
      if (
        calendarRef.current.days !== snapshot.seasonDays ||
        calendarRef.current.source !== snapshot.seasonSource ||
        calendarRef.current.draft !== originalDraft
      ) {
        notify(
          'Activity changed during sync. Your edits were kept; sync again to load GitHub data.',
        );
        return;
      }
      onChange((current) =>
        current.socials.github.trim() === snapshot.socials.github.trim() &&
        current.seasonDays === snapshot.seasonDays &&
        current.seasonSource === snapshot.seasonSource
          ? {
              ...current,
              seasonDays: result.seasonDays,
              seasonSource: 'github',
              seasonSync: result.seasonSync,
            }
          : current,
      );
      setActivityDraft(null);
      notify(
        `GitHub calendar loaded for @${snapshot.socials.github.trim()}: ${result.seasonDays.reduce((sum, day) => sum + day.count, 0)} contributions.`,
      );
    } catch (error) {
      notify(`${(error as Error).message} Your saved calendar was kept.`, true);
    } finally {
      setContributionFetching(false);
    }
  }
  return (
    <aside className="config-panel" aria-label="Customize component">
      <div className="config-heading">
        <SlidersHorizontal size={16} />
        <h2>Customize</h2>
        <span className="micro-badge">LIVE</span>
      </div>
      <div className="config-content" key={resetEpoch}>
        <button
          className={`button full ${layoutEdit ? 'button-active' : ''}`}
          aria-pressed={layoutEdit}
          onClick={() => onLayoutEdit(!layoutEdit)}
        >
          <SlidersHorizontal size={14} />
          {layoutEdit ? 'Finish element layout' : 'Edit SVG elements'}
        </button>
        <details className="shared-section style-section" open={styleOpen}>
          <summary
            onClick={(event) => {
              event.preventDefault();
              setStyleOpen((value) => !value);
            }}
          >
            Style & motion <ChevronDown size={14} />
          </summary>
          <div>
            <label className="field">
              <span>Apply a preset</span>
              <select
                aria-label="Apply a preset"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    onChange(applyPreset(c, e.target.value));
                    notify('Preset applied. Your identity and projects were kept.');
                    e.target.value = '';
                  }
                }}
              >
                <option value="" disabled>
                  Choose preset…
                </option>
                <option value="ai">AI Engineer Demo / stack & ratings</option>
                {Object.entries(CHARACTER_PRESETS).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.label} / style
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Theme for {component.name}</span>
              <select
                aria-label={`Theme for ${component.name}`}
                value={c.characterOverrides?.[selected] ?? ''}
                onChange={(e) => {
                  const overrides = { ...c.characterOverrides };
                  if (e.target.value)
                    overrides[selected] = e.target.value as ProfileConfig['character'];
                  else delete overrides[selected];
                  update('characterOverrides', overrides);
                }}
              >
                <option value="">Use profile theme · {CHARACTER_THEMES[c.character].name}</option>
                {CHARACTER_IDS.map((id) => (
                  <option key={id} value={id}>
                    {CHARACTER_THEMES[id].name}
                  </option>
                ))}
              </select>
            </label>
            {(c.characterOverrides?.[selected] ?? c.character) === 'isagi' && (
              <div className="isagi-colorway-editor">
                <label className="field">
                  <span>Isagi colorway</span>
                  <select
                    aria-label="Isagi colorway"
                    value={characterColorway(c, 'isagi')}
                    onChange={(event) =>
                      update('characterColorways', {
                        ...c.characterColorways,
                        isagi: event.currentTarget.value as 'default' | 'deep-blue',
                      })
                    }
                  >
                    <option value="default">Default</option>
                    <option value="deep-blue">Deep Blue</option>
                  </select>
                </label>
                <div
                  className="colorway-swatches"
                  aria-label={`${COLORWAY_LABELS[characterColorway(c, 'isagi')]} palette`}
                >
                  {(
                    resolveCharacterPalette(c, 'isagi', theme).contributions ?? [
                      CHARACTER_THEMES.isagi.tokens[theme].cardBg,
                      CHARACTER_THEMES.isagi.tokens[theme].seasonLevel1,
                      CHARACTER_THEMES.isagi.tokens[theme].seasonLevel2,
                      CHARACTER_THEMES.isagi.tokens[theme].cyan,
                      CHARACTER_THEMES.isagi.tokens[theme].teal,
                    ]
                  ).map((color) => (
                    <span key={color} style={{ backgroundColor: color }} title={color} />
                  ))}
                </div>
                <p className="field-hint">
                  Applies to every Isagi card. Dark and Light each have their own palette. Character
                  artwork keeps its original colors.
                </p>
              </div>
            )}
            <details className="skin-gallery" open={skinPreviewsOpen}>
              <summary
                onClick={(event) => {
                  event.preventDefault();
                  setSkinPreviewsOpen((value) => !value);
                }}
              >
                Compare all eight character skins
              </summary>
              {skinPreviewsOpen && (
                <>
                  <p className="field-hint">
                    Static previews use sample profile data and the current card design.
                  </p>
                  <div className="skin-preview-grid">
                    {skinPreviews.map(({ id, src }) => {
                      const active = (c.characterOverrides?.[selected] ?? c.character) === id;
                      return (
                        <button
                          type="button"
                          className={`skin-preview ${active ? 'is-active' : ''}`}
                          key={id}
                          aria-pressed={active}
                          onClick={() => {
                            const overrides = { ...c.characterOverrides };
                            if (id === c.character) delete overrides[selected];
                            else overrides[selected] = id;
                            update('characterOverrides', overrides);
                          }}
                        >
                          <img
                            src={src}
                            alt={`${CHARACTER_THEMES[id].name} ${component.name} skin preview`}
                            loading="lazy"
                          />
                          <span>{CHARACTER_THEMES[id].name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </details>
            <button
              className="button full"
              onClick={() => {
                const character = c.characterOverrides?.[selected] ?? c.character;
                onChange({ ...c, character, characterOverrides: {} });
                notify(`${CHARACTER_THEMES[character].name} applied to every card.`);
              }}
            >
              Apply this character to all cards
            </button>
            {component.templates.length > 1 && (
              <div className="design-picker">
                <label className="field">
                  <span>Design for {component.name}</span>
                  <select
                    aria-label={`Design for ${component.name}`}
                    value={c.cardTemplates?.[selected] ?? component.templates[0]}
                    onChange={(event) =>
                      update('cardTemplates', {
                        ...c.cardTemplates,
                        [selected]: event.currentTarget.value,
                      })
                    }
                  >
                    {component.templates.map((id) => (
                      <option key={id} value={id}>
                        {getCardTemplate(selected, id).name}
                      </option>
                    ))}
                  </select>
                </label>
                <div
                  className="design-preview-grid"
                  aria-label={`Design previews for ${component.name}`}
                >
                  {designPreviews.map((design) => (
                    <button
                      key={design.id}
                      type="button"
                      className={`design-preview${design.id === selectedTemplate ? ' active' : ''}`}
                      aria-label={`Select design: ${design.name}`}
                      aria-pressed={design.id === selectedTemplate}
                      title={design.description}
                      onClick={() =>
                        update('cardTemplates', { ...c.cardTemplates, [selected]: design.id })
                      }
                    >
                      <img src={design.src} alt="" loading="lazy" />
                      <strong>{design.name}</strong>
                      <span>
                        {design.id === 'chapter-log'
                          ? 'Activity'
                          : (design.collection ?? 'Original')}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="design-description">
                  {getCardTemplate(selected, selectedTemplate).description}
                </p>
                {!!getCardTemplate(selected, selectedTemplate).references?.length && (
                  <p className="field-hint">
                    References:{' '}
                    {getCardTemplate(selected, selectedTemplate).references!.map((id, i) => (
                      <span key={id}>
                        {i > 0 ? ' · ' : ''}
                        <a href={DESIGN_REFERENCE_SOURCES[id].url} target="_blank" rel="noreferrer">
                          {DESIGN_REFERENCE_SOURCES[id].title}
                        </a>
                      </span>
                    ))}
                  </p>
                )}
              </div>
            )}
            {selected === 'hero' && (
              <HeroColorsEditor config={c} theme={theme} onChange={onChange} />
            )}
            <label className="field">
              <span>Animation level</span>
              <select
                aria-label="Animation level"
                value={c.animationLevel}
                onChange={(e) => {
                  const animationLevel = e.target.value as ProfileConfig['animationLevel'];
                  const minimumCycle = Object.values(c.motionOverrides ?? {})
                    .flatMap((group) => Object.values(group).flat())
                    .reduce(
                      (end, clip) => Math.max(end, clip.startSeconds + clip.durationSeconds),
                      0,
                    );
                  const levelCycle =
                    animationLevel === 'cinematic' ? 20 : animationLevel === 'subtle' ? 18 : 16;
                  onChange({
                    ...c,
                    animationLevel,
                    ...(!c.motionCycleSeconds && minimumCycle > levelCycle
                      ? { motionCycleSeconds: Math.ceil(minimumCycle * 10) / 10 }
                      : {}),
                  });
                }}
              >
                <option value="full">Full / Blue Lock energy</option>
                <option value="subtle">Subtle / aura & passing</option>
                <option value="cinematic">Cinematic / extended intro</option>
                <option value="none">None / static</option>
              </select>
            </label>
            <NumberField
              label={`Animation cycle (${cycleSeconds}s)`}
              value={cycleSeconds}
              min={8}
              max={30}
              onChange={(value) => {
                const latestClip = Object.values(c.motionOverrides ?? {})
                  .flatMap((group) => Object.values(group).flat())
                  .reduce(
                    (end, clip) => Math.max(end, clip.startSeconds + clip.durationSeconds),
                    0,
                  );
                if (value < latestClip) {
                  notify(
                    `Keep the cycle at ${latestClip.toFixed(1)} seconds or longer to preserve the current clips.`,
                    true,
                  );
                  return;
                }
                update('motionCycleSeconds', value);
              }}
            />
            <div className="editor-card motion-editor">
              <div className="card-actions">
                <span>ELEMENT TIMELINE</span>
                <span>{activeElementLabel || 'Choose an element in the preview'}</span>
              </div>
              {activeElementId ? (
                <>
                  {activeTextField && (
                    <div className="editor-card" role="region" aria-label="Selected text editor">
                      <Field
                        label="Selected text content"
                        value={selectedTextContent}
                        onChange={updateSelectedText}
                        multiline={activeTextField === 'tagline'}
                        deferred={activeTextField === 'tagline'}
                      />
                      {activeTextField !== 'name' ? (
                        effectEditor(activeTextField, 'Selected text animation')
                      ) : (
                        <label className="field">
                          <span>Selected text animation</span>
                          <select
                            aria-label="Selected text animation"
                            value={c.nameAnimation ?? 'theme'}
                            onChange={(event) =>
                              update(
                                'nameAnimation',
                                event.currentTarget.value as ProfileConfig['nameAnimation'],
                              )
                            }
                          >
                            <option value="theme">Character default</option>
                            <option value="typewriter">Typewriter</option>
                            <option value="pop-up">Pop up</option>
                            <option value="none">None</option>
                          </select>
                        </label>
                      )}
                      <p className="field-hint">
                        Edit this text independently. Motion preview shows its animation; SVG
                        exports include it.
                      </p>
                    </div>
                  )}
                  <div className="motion-position-controls">
                    <NumberField
                      label="Canvas X"
                      value={positionDraft.x}
                      min={-400}
                      max={1200}
                      onChange={(x) => setPositionDraft((position) => ({ ...position, x }))}
                    />
                    <NumberField
                      label="Canvas Y"
                      value={positionDraft.y}
                      min={-400}
                      max={1500}
                      onChange={(y) => setPositionDraft((position) => ({ ...position, y }))}
                    />
                    <NumberField
                      label="Scale"
                      disabled={pitchNode}
                      value={positionDraft.scale}
                      min={0.1}
                      max={4}
                      step={0.1}
                      onChange={(scale) => setPositionDraft((position) => ({ ...position, scale }))}
                    />
                    <NumberField
                      label="Rotation°"
                      disabled={pitchNode}
                      value={positionDraft.rotation}
                      min={-360}
                      max={360}
                      onChange={(rotation) =>
                        setPositionDraft((position) => ({ ...position, rotation }))
                      }
                    />
                    <button
                      className="button"
                      onClick={() =>
                        onLayoutCommit(
                          activeElementId,
                          positionDraft.x,
                          positionDraft.y,
                          positionDraft.scale,
                          positionDraft.rotation,
                        )
                      }
                    >
                      Apply transform
                    </button>
                    <button
                      className="button"
                      onClick={() => {
                        onResetLayout(activeElementId);
                        setPositionDraft({
                          x: activeElementOriginX,
                          y: activeElementOriginY,
                          scale: 1,
                          rotation: 0,
                        });
                      }}
                    >
                      Reset position
                    </button>
                    {pitchNode && (
                      <p className="field-hint">
                        Pitch node scale and rotation are fixed to the tactical data model.
                      </p>
                    )}
                  </div>
                  <div
                    className="motion-timeline"
                    aria-label={`${cycleSeconds} second animation timeline`}
                  >
                    {motionClips.map((clip) => (
                      <span
                        key={clip.id}
                        className={`motion-clip motion-${clip.preset}`}
                        style={{
                          left: `${(clip.startSeconds / cycleSeconds) * 100}%`,
                          width: `${(clip.durationSeconds / cycleSeconds) * 100}%`,
                        }}
                        title={`${ANIMATION_PRESETS[clip.preset].label}: ${clip.startSeconds}s–${clip.startSeconds + clip.durationSeconds}s`}
                      />
                    ))}
                  </div>
                  {motionClips.map((clip, index) => (
                    <div className="motion-clip-editor" key={clip.id}>
                      <label className="field">
                        <span>Preset</span>
                        <select
                          aria-label={`Animation preset ${index + 1}`}
                          value={clip.preset}
                          onChange={(event) => {
                            const preset = event.currentTarget.value as AnimationSpec['preset'];
                            const channels = channelsFor(preset);
                            if (
                              motionClips.some(
                                (other, otherIndex) =>
                                  otherIndex !== index &&
                                  channels.some((channel) =>
                                    channelsFor(other.preset).includes(channel),
                                  ),
                              )
                            ) {
                              notify(
                                'This element already has an animation using the same visual channel.',
                                true,
                              );
                              return;
                            }
                            updateMotionClips(
                              motionClips.map((item, i) =>
                                i === index ? { ...item, preset } : item,
                              ),
                            );
                          }}
                        >
                          {Object.entries(ANIMATION_PRESETS)
                            .filter(
                              ([preset]) =>
                                !motionClips.some(
                                  (other, otherIndex) =>
                                    otherIndex !== index &&
                                    channelsFor(preset as AnimationSpec['preset']).some((channel) =>
                                      channelsFor(other.preset).includes(channel),
                                    ),
                                ),
                            )
                            .map(([id, preset]) => (
                              <option key={id} value={id}>
                                {preset.label}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Phase</span>
                        <select
                          aria-label={`Animation phase ${index + 1}`}
                          value={clip.phase}
                          onChange={(event) =>
                            updateMotionClips(
                              motionClips.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      phase: event.currentTarget.value as AnimationSpec['phase'],
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          <option value="entrance">Entrance</option>
                          <option value="emphasis">Emphasis</option>
                          <option value="exit">Exit</option>
                          <option value="path">Path</option>
                        </select>
                      </label>
                      <NumberField
                        label="Start (seconds)"
                        step={0.1}
                        value={clip.startSeconds}
                        min={0}
                        max={Math.max(0, cycleSeconds - clip.durationSeconds)}
                        onChange={(value) =>
                          updateMotionClips(
                            motionClips.map((item, i) =>
                              i === index ? { ...item, startSeconds: value } : item,
                            ),
                          )
                        }
                      />
                      <NumberField
                        label="Duration (seconds)"
                        step={0.1}
                        value={clip.durationSeconds}
                        min={0.1}
                        max={Math.max(0.1, cycleSeconds - clip.startSeconds)}
                        onChange={(value) =>
                          updateMotionClips(
                            motionClips.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    durationSeconds: Math.min(
                                      value,
                                      cycleSeconds - item.startSeconds,
                                    ),
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                      <label className="field">
                        <span>Easing</span>
                        <select
                          aria-label={`Animation easing ${index + 1}`}
                          value={clip.easing}
                          onChange={(event) =>
                            updateMotionClips(
                              motionClips.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      easing: event.currentTarget.value as AnimationSpec['easing'],
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          <option value="ease-out">Ease out</option>
                          <option value="linear">Linear</option>
                          <option value="ease-in-out">Ease in/out</option>
                          <option value="back-out">Back out</option>
                        </select>
                      </label>
                      <button
                        className="icon-button"
                        aria-label={`Remove animation ${index + 1}`}
                        onClick={() => updateMotionClips(motionClips.filter((_, i) => i !== index))}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="button full"
                    disabled={
                      motionClips.length >= 4 ||
                      !availablePresets.length ||
                      c.animationLevel === 'none'
                    }
                    onClick={() =>
                      updateMotionClips([
                        ...motionClips,
                        {
                          id: `clip-${crypto.randomUUID()}`,
                          preset: availablePresets[0],
                          phase: 'entrance',
                          startSeconds: 0,
                          durationSeconds: Math.min(1.5, cycleSeconds),
                          easing: 'ease-out',
                        },
                      ])
                    }
                  >
                    <Plus size={14} />
                    Add timeline clip
                  </button>
                  {!availablePresets.length && (
                    <p className="field-hint">
                      All visual channels are in use. Remove a clip to add another.
                    </p>
                  )}
                  {c.animationLevel === 'none' && (
                    <p className="field-hint">
                      Enable motion above to preview and export these clips.
                    </p>
                  )}
                </>
              ) : (
                <p className="field-hint">
                  Turn on Edit SVG elements, then select or drag a labeled group in the preview to
                  add timed motion.
                </p>
              )}
            </div>
            {layoutEdit && (
              <p className="field-hint">
                Drag the labeled SVG groups in the preview. Moves save by card, design and canvas
                size.
              </p>
            )}
            <label className="toggle-field">
              <input type="checkbox" checked={sound} onChange={(e) => onSound(e.target.checked)} />
              Interface sound
            </label>
          </div>
        </details>
        <div className="config-section">
          <p className="section-label">{component.name}</p>
          {selected === 'hero' && (
            <>
              {text('egoTagline', 'Ego tagline', true)}
              {effectEditor('tagline', 'Tagline animation')}
              {text('positionName', 'Player position')}
              {effectEditor('position', 'Player position animation')}
            </>
          )}
          {selected === 'player-card' && (
            <>
              <SourceSelect
                label="Rating source"
                value={c.skillSource}
                onChange={(v) => update('skillSource', v as 'demo' | 'manual')}
              />
              <p className="field-hint">Manual ratings are your own self-assessment.</p>
              {text('philosophy', 'Philosophy', true)}
              {text('favoriteClub', 'Club')}
              {c.skills.map((s, i) => (
                <div className="editor-card" key={i}>
                  <div className="card-actions">
                    <span>CAPABILITY {i + 1}</span>
                    <button
                      className="icon-button"
                      aria-label={`Remove skill ${i + 1}`}
                      onClick={() =>
                        update(
                          'skills',
                          c.skills.filter((_, n) => n !== i),
                        )
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <Field
                    label="Capability"
                    value={s.name}
                    onChange={(v) =>
                      update(
                        'skills',
                        c.skills.map((s, n) => (n === i ? { ...s, name: v } : s)),
                      )
                    }
                  />
                  <Field
                    label="Description"
                    value={s.description}
                    onChange={(v) =>
                      update(
                        'skills',
                        c.skills.map((s, n) => (n === i ? { ...s, description: v } : s)),
                      )
                    }
                  />
                  <label className="range-field">
                    <span>
                      Rating <b>{s.value}</b>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="99"
                      value={s.value}
                      onChange={(e) =>
                        update(
                          'skills',
                          c.skills.map((s, n) =>
                            n === i ? { ...s, value: Number(e.target.value) } : s,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
              ))}
              <button
                className="button full"
                disabled={c.skills.length >= 12}
                onClick={() =>
                  update('skills', [
                    ...c.skills,
                    {
                      id: `skill-${crypto.randomUUID()}`,
                      name: 'NEW CAPABILITY',
                      description: '',
                      value: 50,
                    },
                  ])
                }
              >
                <Plus size={14} />
                Add capability
              </button>
            </>
          )}
          {selected === 'tech-pitch' && (
            <>
              {text('presetLabel', 'Stack label')}
              <label className="field">
                <span>Formation</span>
                <select
                  aria-label="Formation"
                  value={c.pitchFormation}
                  onChange={(e) => {
                    const formation = e.target.value as ProfileConfig['pitchFormation'];
                    onChange({
                      ...c,
                      pitchFormation: formation,
                      pitchTechs: arrangeFormation(c.pitchTechs, formation),
                    });
                  }}
                >
                  <option>4-3-3</option>
                  <option>4-4-2</option>
                </select>
              </label>
              <p className="field-hint">
                FW apps · MF models · DF quality & serving · GK runtime. Coordinates use a vertical
                pitch: X moves across the field; Y moves from attack to goalkeeper.
              </p>
              {c.pitchTechs.map((n, i) => (
                <details className="node-editor" key={n.id}>
                  <summary>
                    <span className={`role-chip role-${n.role}`}>{n.role}</span>
                    <span>{n.tech || 'Untitled tech'}</span>
                    <ChevronDown size={13} />
                  </summary>
                  <div>
                    <Field
                      label="Technology"
                      value={n.tech}
                      onChange={(v) =>
                        update(
                          'pitchTechs',
                          c.pitchTechs.map((n, j) => (j === i ? { ...n, tech: v } : n)),
                        )
                      }
                    />
                    <Field
                      label="Description"
                      value={n.subTech ?? ''}
                      onChange={(v) =>
                        update(
                          'pitchTechs',
                          c.pitchTechs.map((n, j) => (j === i ? { ...n, subTech: v } : n)),
                        )
                      }
                    />
                    <label className="field">
                      <span>Position</span>
                      <select
                        value={n.role}
                        onChange={(e) =>
                          update(
                            'pitchTechs',
                            c.pitchTechs.map((n, j) =>
                              j === i ? { ...n, role: e.target.value as typeof n.role } : n,
                            ),
                          )
                        }
                      >
                        {['FW', 'MF', 'DF', 'GK'].map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                    <div className="field-pair">
                      <NumberField
                        label="X (%)"
                        value={n.x}
                        max={100}
                        onChange={(v) =>
                          update(
                            'pitchTechs',
                            c.pitchTechs.map((n, j) => (j === i ? { ...n, x: v } : n)),
                          )
                        }
                      />
                      <NumberField
                        label="Y (%)"
                        value={n.y}
                        max={100}
                        onChange={(v) =>
                          update(
                            'pitchTechs',
                            c.pitchTechs.map((n, j) => (j === i ? { ...n, y: v } : n)),
                          )
                        }
                      />
                    </div>
                  </div>
                </details>
              ))}
            </>
          )}
          {selected === 'match-stats' && (
            <>
              <p className="field-hint">
                Sources are shown next to each value. GitHub sync updates public repository count
                only.
              </p>
              {(
                [
                  ['goals', 'Goals / commits'],
                  ['assists', 'Assists / pull requests'],
                  ['mvpVotes', 'MVP / stars'],
                  ['matches', 'Matches / public repositories'],
                  ['winStreak', 'Streak / days'],
                ] as [keyof MatchStats, string][]
              ).map(([key, label]) => (
                <div className="editor-card" key={key}>
                  <NumberField
                    label={label}
                    value={c.matchStats[key]}
                    onChange={(v) =>
                      onChange({
                        ...c,
                        matchStats: { ...c.matchStats, [key]: v },
                        statSources: { ...c.statSources, [key]: 'manual' },
                      })
                    }
                  />
                  <SourceSelect
                    value={c.statSources[key]}
                    github
                    onChange={(v) => update('statSources', { ...c.statSources, [key]: v })}
                  />
                </div>
              ))}
              <NumberField
                label="Goal celebration threshold (0 = off)"
                value={c.matchStats.goalThreshold}
                onChange={(v) => update('matchStats', { ...c.matchStats, goalThreshold: v })}
              />
              <Field
                label="GitHub username"
                value={c.socials.github}
                onChange={(v) => update('socials', { ...c.socials, github: v })}
              />
              <button className="button full" disabled={fetching} onClick={sync}>
                <RefreshCw size={14} className={fetching ? 'spinning' : ''} />
                {fetching ? 'Syncing…' : 'Sync public repo count'}
              </button>
            </>
          )}
          {selected === 'league-table' && (
            <>
              <SourceSelect
                value={c.languageSource}
                github
                onChange={(v) => update('languageSource', v)}
              />
              <p className="field-hint">Percentages describe language share, not proficiency.</p>
              {c.languages.map((l, i) => (
                <div className="editor-card" key={i}>
                  <div className="card-actions">
                    <span>LANGUAGE {i + 1}</span>
                    <button
                      className="icon-button"
                      aria-label={`Remove language ${i + 1}`}
                      onClick={() =>
                        update(
                          'languages',
                          c.languages.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <Field
                    label="Language"
                    value={l.name}
                    onChange={(v) =>
                      update(
                        'languages',
                        c.languages.map((l, j) => (j === i ? { ...l, name: v } : l)),
                      )
                    }
                  />
                  <div className="field-pair">
                    <NumberField
                      label="Share (%)"
                      value={l.percent}
                      max={100}
                      onChange={(v) =>
                        update(
                          'languages',
                          c.languages.map((l, j) => (j === i ? { ...l, percent: v } : l)),
                        )
                      }
                    />
                    <label className="field">
                      <span>Color</span>
                      <input
                        type="color"
                        value={l.color}
                        onChange={(e) =>
                          update(
                            'languages',
                            c.languages.map((l, j) =>
                              j === i ? { ...l, color: e.target.value } : l,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
              <button
                className="button full"
                disabled={c.languages.length >= 20}
                onClick={() =>
                  update('languages', [
                    ...c.languages,
                    {
                      id: `language-${crypto.randomUUID()}`,
                      name: 'New language',
                      percent: 0,
                      color: '#608bff',
                      trend: 'same',
                      rank: c.languages.length + 1,
                    },
                  ])
                }
              >
                <Plus size={14} />
                Add language
              </button>
            </>
          )}
          {selected === 'projects' && (
            <>
              <SourceSelect
                value={c.projectSource}
                onChange={(v) => update('projectSource', v as 'demo' | 'manual')}
              />
              {c.projects.map((p, i) => (
                <details className="node-editor" key={p.id} open>
                  <summary>
                    <span className="role-chip">{p.number}</span>
                    <span>{p.name || 'Untitled project'}</span>
                    <ChevronDown size={13} />
                  </summary>
                  <div>
                    {(['name', 'description', 'primaryTech', 'url'] as const).map((key) => (
                      <Field
                        key={key}
                        label={
                          {
                            name: 'Project name',
                            description: 'Problem / description',
                            primaryTech: 'Technology stack',
                            url: 'Repository URL',
                          }[key]
                        }
                        value={p[key]}
                        multiline={key === 'description'}
                        onChange={(v) =>
                          update(
                            'projects',
                            c.projects.map((p, j) => (j === i ? { ...p, [key]: v } : p)),
                          )
                        }
                      />
                    ))}
                    {p.url && !/^https?:\/\//i.test(p.url) && (
                      <p className="field-hint error-text">
                        Use an http(s) URL. Invalid links are omitted from snippets.
                      </p>
                    )}
                    <label className="field">
                      <span>Status</span>
                      <select
                        value={p.status}
                        onChange={(e) =>
                          update(
                            'projects',
                            c.projects.map((p, j) =>
                              j === i ? { ...p, status: e.target.value as typeof p.status } : p,
                            ),
                          )
                        }
                      >
                        <option>ACTIVE</option>
                        <option>CHAMPION</option>
                        <option>EVOLVING</option>
                      </select>
                    </label>
                    <div className="field-pair">
                      <NumberField
                        label="Stars"
                        value={p.stars}
                        onChange={(v) =>
                          update(
                            'projects',
                            c.projects.map((p, j) => (j === i ? { ...p, stars: v } : p)),
                          )
                        }
                      />
                      <NumberField
                        label="Forks"
                        value={p.forks}
                        onChange={(v) =>
                          update(
                            'projects',
                            c.projects.map((p, j) => (j === i ? { ...p, forks: v } : p)),
                          )
                        }
                      />
                    </div>
                    <button
                      className="button danger full"
                      onClick={() =>
                        update(
                          'projects',
                          c.projects.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <Trash2 size={13} />
                      Remove project
                    </button>
                  </div>
                </details>
              ))}
              <button
                className="button full"
                disabled={c.projects.length >= 12}
                onClick={() =>
                  update('projects', [
                    ...c.projects,
                    {
                      id: crypto.randomUUID(),
                      number: String(c.projects.length + 1).padStart(2, '0'),
                      name: 'New project',
                      description: '',
                      primaryTech: '',
                      url: '',
                      stars: 0,
                      forks: 0,
                      rating: '',
                      status: 'ACTIVE',
                    },
                  ])
                }
              >
                <Plus size={14} />
                Add project
              </button>
            </>
          )}
          {selected === 'season' && (
            <>
              <Field
                label="GitHub username"
                value={c.socials.github}
                onChange={(value) => update('socials', { ...c.socials, github: value })}
              />
              <button
                className="button primary full"
                disabled={contributionFetching}
                onClick={syncContributions}
              >
                <RefreshCw size={14} className={contributionFetching ? 'spinning' : ''} />
                {contributionFetching ? 'Syncing contributions…' : 'Sync GitHub contributions'}
              </button>
              <p className="field-hint">
                Loads your public GitHub contribution calendar. No token required; data may be
                cached for one hour.
              </p>
              {c.seasonSource === 'github' && c.seasonSync && (
                <p className="field-hint">
                  Calendar synced for @{c.seasonSync.username} · {c.seasonDays.length} days.
                  {c.seasonSync.username.toLowerCase() !== c.socials.github.trim().toLowerCase() &&
                    ' Username has changed; sync again to load this account.'}
                </p>
              )}
              <SourceSelect
                github
                value={c.seasonSource}
                onChange={(v) => update('seasonSource', v)}
              />
              <p className="field-hint">
                {c.seasonSource === 'demo'
                  ? 'Demo generates simulated activity.'
                  : c.seasonSource === 'github'
                    ? 'Showing saved GitHub contributions. Sync again to refresh, or use the profile workflow for scheduled updates.'
                    : 'Manual shows a 52-week calendar ending with your latest recorded date.'}
              </p>
              <label className="field">
                <span>Daily activity JSON</span>
                <textarea
                  aria-label="Daily activity JSON"
                  rows={8}
                  value={activityDraft ?? JSON.stringify(c.seasonDays, null, 2)}
                  placeholder={'[{"date":"2026-10-09","count":3}]'}
                  onChange={(e) => setActivityDraft(e.target.value)}
                />
              </label>
              <button
                className="button full"
                onClick={() => {
                  try {
                    const days = JSON.parse(activityDraft ?? JSON.stringify(c.seasonDays));
                    const next = parseConfig({ ...c, seasonDays: days, seasonSource: 'manual' });
                    onChange(next);
                    setActivityDraft(null);
                    notify('Manual activity applied.');
                  } catch (e) {
                    notify((e as Error).message, true);
                  }
                }}
              >
                Apply activity dates
              </button>
            </>
          )}
          {selected === 'footer' && (
            <>
              <label className="field">
                <span>Collaboration status</span>
                <select
                  aria-label="Collaboration status"
                  value={c.transferStatus}
                  onChange={(e) =>
                    update('transferStatus', e.target.value as ProfileConfig['transferStatus'])
                  }
                >
                  <option value="OPEN">Open to collaborate</option>
                  <option value="NEGOTIATING">Let’s talk</option>
                  <option value="CLOSED">Focused on current work</option>
                </select>
              </label>
              {(['github', 'email', 'linkedin', 'portfolio', 'twitter'] as const).map((key) => (
                <Field
                  key={key}
                  label={
                    {
                      github: 'GitHub username',
                      email: 'Email',
                      linkedin: 'LinkedIn handle or URL',
                      portfolio: 'Portfolio URL',
                      twitter: 'X / Twitter handle or URL',
                    }[key]
                  }
                  value={c.socials[key] ?? ''}
                  onChange={(v) => update('socials', { ...c.socials, [key]: v })}
                />
              ))}
            </>
          )}
        </div>
        {hasEditionNote && (
          <div className="config-section">
            <p className="section-label">Edition note</p>
            <Field label="Edition note" value={note} onChange={updateNote} />
            {effectEditor('edition', 'Edition note animation')}
            <button className="button" onClick={() => updateNote(undefined)}>
              Reset edition note
            </button>
            <p className="field-hint">
              Content saves for this card design. Clear the text to hide it.
            </p>
          </div>
        )}
        {shortened && (
          <p className="field-hint" role="status">
            Some display text is shortened to fit the card. Use Presentation for a shorter label;
            your original content is kept.
          </p>
        )}
        {['hero', 'projects', 'tech-pitch'].includes(selected) && (
          <details className="shared-section">
            <summary>
              Presentation <ChevronDown size={14} />
            </summary>
            <div>
              <p className="field-hint">
                Optional display text. Leave blank to use the original content.
              </p>
              {selected === 'hero' && (
                <Field
                  label="Short display tagline"
                  value={presentation.shortTagline ?? ''}
                  onChange={(v) =>
                    update('presentation', { ...presentation, shortTagline: v || undefined })
                  }
                />
              )}
              {selected === 'tech-pitch' &&
                c.pitchTechs.map((n) => (
                  <Field
                    key={n.id}
                    label={`Display label / ${n.tech}`}
                    value={presentation.techLabels?.[n.id] ?? ''}
                    onChange={(v) => {
                      const labels = { ...presentation.techLabels };
                      if (v) labels[n.id] = v;
                      else delete labels[n.id];
                      update('presentation', { ...presentation, techLabels: labels });
                    }}
                  />
                ))}
              {selected === 'projects' &&
                c.projects.map((p) => (
                  <div className="editor-card" key={p.id}>
                    <p className="field-hint">{p.name}</p>
                    {(['wide', 'compact'] as const).map((layout) => (
                      <Field
                        key={layout}
                        label={`${layout} summary / ${p.name}`}
                        value={presentation.projectSummaries?.[p.id]?.[layout] ?? ''}
                        onChange={(v) =>
                          update('presentation', {
                            ...presentation,
                            projectSummaries: {
                              ...presentation.projectSummaries,
                              [p.id]: {
                                ...presentation.projectSummaries?.[p.id],
                                [layout]: v || undefined,
                              },
                            },
                          })
                        }
                      />
                    ))}
                  </div>
                ))}
            </div>
          </details>
        )}
        <details className="shared-section" open={selected === 'hero'} key={selected}>
          <summary>
            Shared identity <ChevronDown size={14} />
          </summary>
          <div>
            {text('displayName', 'Display name')}
            {selected === 'hero' && (
              <>
                <label className="field">
                  <span>Name animation</span>
                  <select
                    aria-label="Name animation"
                    value={c.nameAnimation ?? 'theme'}
                    onChange={(e) =>
                      update('nameAnimation', e.target.value as ProfileConfig['nameAnimation'])
                    }
                  >
                    <option value="theme">Character default</option>
                    <option value="typewriter">Typewriter / Gõ từng chữ</option>
                    <option value="pop-up">Pop up / Bật lên từng chữ</option>
                    <option value="none">None / Không hiệu ứng</option>
                  </select>
                </label>
                <p className="field-hint">
                  Applies to all Hero designs and SVG exports. In element edit mode, use Motion
                  preview to watch it.
                  {c.animationLevel === 'none' && ' Enable animation in Style & motion to play it.'}
                </p>
              </>
            )}
            {text('role', 'Engineering role')}
            {selected === 'hero' && effectEditor('role', 'Engineering role animation')}
            {text('jerseyNumber', 'Jersey number')}
            {selected === 'hero' && effectEditor('jersey', 'Jersey number animation')}
            <Field
              label="Taglines (one per line)"
              deferred
              value={(c.taglines ?? []).join('\n')}
              onChange={(value) =>
                update(
                  'taglines',
                  value
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean),
                )
              }
              multiline
            />
            <p className="field-hint">
              Taglines apply when you leave the field. Up to eight lines, 200 characters each.
            </p>
          </div>
        </details>
        <details className="shared-section" open={configurationOpen}>
          <summary
            onClick={(event) => {
              event.preventDefault();
              setConfigurationOpen((value) => !value);
            }}
          >
            Configuration <ChevronDown size={14} />
          </summary>
          <div>
            <p className="field-hint">
              Edits save on this device. Export JSON for a portable backup.
            </p>
            <input
              type="file"
              accept=".json,application/json"
              ref={fileRef}
              hidden
              onChange={(e) => importFile(e.target.files?.[0])}
            />
            <button className="button full" onClick={() => fileRef.current?.click()}>
              <Upload size={14} />
              Import JSON
            </button>
            <button
              className="button full"
              onClick={() => {
                try {
                  parseConfig(c);
                  downloadFile(serializeConfig(c), 'profile.config.json', 'application/json');
                  notify('Configuration exported.');
                } catch (e) {
                  notify((e as Error).message, true);
                }
              }}
            >
              <Download size={14} />
              Export JSON
            </button>
            {resetArmed ? (
              <div className="reset-confirm">
                <p>Reset all components and personal edits to the demo?</p>
                <div className="field-pair">
                  <button
                    className="button danger"
                    onClick={() => {
                      onReset();
                      setActivityDraft(null);
                      setResetArmed(false);
                    }}
                  >
                    Reset all
                  </button>
                  <button className="button" onClick={() => setResetArmed(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button className="button danger full" onClick={() => setResetArmed(true)}>
                <RotateCcw size={14} />
                Reset to demo
              </button>
            )}
          </div>
        </details>
      </div>
    </aside>
  );
}
