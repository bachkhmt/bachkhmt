import { DEFAULT_CONFIG } from './defaultConfig';
import {
  ProfileConfig,
  MatchStats,
  DataSource,
  CharacterId,
  ComponentId,
  HeroColorField,
} from '../types';
import { CHARACTER_IDS } from '../characters/themes';
import { isCardTemplate } from '../templates/registry';
import { ANIMATION_PRESETS } from '../fx/presets';
import { HERO_COLOR_FIELDS, isHexColor } from '../characters/heroColors';
import { validCharacterColorway } from '../characters/colorways';

export const STORAGE_KEY = 'ego-striker:studio:v3';
export const LEGACY_STORAGE_KEY = 'ego-striker:studio:v2';
const string = (v: unknown): v is string => typeof v === 'string';
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const source = (v: unknown): v is DataSource => ['demo', 'manual', 'github'].includes(v as string);
const componentIds: ComponentId[] = [
  'hero',
  'player-card',
  'tech-pitch',
  'match-stats',
  'league-table',
  'projects',
  'season',
  'footer',
];
const strings = (o: Record<string, unknown>, keys: string[]) => keys.every((k) => string(o[k]));
const nonnegative = (v: unknown): v is number => finite(v) && v >= 0;
function validLayoutOverrides(value: unknown): boolean {
  if (!object(value) || Object.keys(value).length > 64) return false;
  let total = 0;
  for (const [key, entries] of Object.entries(value)) {
    const [component, template, layout, ...extra] = key.split(':');
    if (
      extra.length ||
      !componentIds.includes(component as ComponentId) ||
      !isCardTemplate(component as ComponentId, template) ||
      !['wide', 'compact'].includes(layout ?? '') ||
      !object(entries)
    )
      return false;
    total += Object.keys(entries).length;
    if (
      Object.entries(entries).some(
        ([id, position]) =>
          !/^[a-zA-Z0-9:_-]{1,100}$/.test(id) ||
          !object(position) ||
          !finite(position.x) ||
          !finite(position.y) ||
          Math.abs(position.x) > 4096 ||
          Math.abs(position.y) > 4096 ||
          (position.scale !== undefined &&
            (!finite(position.scale) || position.scale < 0.1 || position.scale > 4)) ||
          (position.rotation !== undefined &&
            (!finite(position.rotation) || Math.abs(position.rotation) > 360)),
      )
    )
      return false;
  }
  return total <= 256;
}
function validMotionOverrides(value: unknown, cycleSeconds: number): boolean {
  if (!object(value) || Object.keys(value).length > 64) return false;
  let total = 0;
  for (const [key, elements] of Object.entries(value)) {
    const [component, template, layout, ...extra] = key.split(':');
    if (
      extra.length ||
      !componentIds.includes(component as ComponentId) ||
      !isCardTemplate(component as ComponentId, template) ||
      !['wide', 'compact'].includes(layout ?? '') ||
      !object(elements)
    )
      return false;
    for (const [elementId, clips] of Object.entries(elements)) {
      if (!/^[a-zA-Z0-9:_-]{1,100}$/.test(elementId) || !Array.isArray(clips) || clips.length > 4)
        return false;
      total += clips.length;
      const ids = new Set<string>();
      const channels = new Set<string>();
      for (const clip of clips) {
        if (
          !object(clip) ||
          !string(clip.id) ||
          !/^[a-zA-Z0-9_-]{1,80}$/.test(clip.id) ||
          ids.has(clip.id) ||
          !string(clip.preset) ||
          !Object.hasOwn(ANIMATION_PRESETS, clip.preset) ||
          !['entrance', 'emphasis', 'exit', 'path'].includes(clip.phase as string) ||
          !['linear', 'ease-out', 'ease-in-out', 'back-out'].includes(clip.easing as string) ||
          !finite(clip.startSeconds) ||
          clip.startSeconds < 0 ||
          !finite(clip.durationSeconds) ||
          clip.durationSeconds <= 0 ||
          clip.startSeconds + clip.durationSeconds > cycleSeconds
        )
          return false;
        ids.add(clip.id);
        const preset = ANIMATION_PRESETS[clip.preset as keyof typeof ANIMATION_PRESETS];
        if (preset.channels.some((channel) => channels.has(channel))) return false;
        preset.channels.forEach((channel) => channels.add(channel));
      }
    }
  }
  return total <= 256;
}
const url = (v: unknown) => {
  if (!string(v)) return false;
  if (!v) return true;
  try {
    return ['http:', 'https:'].includes(new URL(v).protocol);
  } catch {
    return false;
  }
};

export interface ConfigReadResult {
  config: ProfileConfig;
  migrated: boolean;
  warnings: string[];
}

function migrateConfigInput(input: unknown): {
  value: unknown;
  migrated: boolean;
  warnings: string[];
} {
  if (!object(input)) return { value: input, migrated: false, warnings: [] };
  if (input.version !== undefined && input.version !== 2 && input.version !== 3)
    throw new Error('Unsupported configuration version. Expected version 2 or 3.');
  const envelope = object(input.config);
  const raw = structuredClone(envelope ? input.config : input) as Record<string, unknown>;
  const version = input.version;
  const legacyElementIds =
    (Array.isArray(raw.skills) && raw.skills.some((skill) => object(skill) && !string(skill.id))) ||
    (Array.isArray(raw.languages) &&
      raw.languages.some((language) => object(language) && !string(language.id)));
  if (Array.isArray(raw.skills))
    raw.skills = raw.skills.map((skill, index) =>
      object(skill) && !string(skill.id) ? { ...skill, id: `skill-${index + 1}` } : skill,
    );
  if (Array.isArray(raw.languages))
    raw.languages = raw.languages.map((language, index) =>
      object(language) && !string(language.id)
        ? { ...language, id: `language-${index + 1}` }
        : language,
    );
  const hasOldComponent =
    (Array.isArray(raw.readmeSettings) && raw.readmeSettings.includes('hero-anime')) ||
    (object(raw.readmeSettings) &&
      Array.isArray(raw.readmeSettings.selectedCards) &&
      raw.readmeSettings.selectedCards.includes('hero-anime')) ||
    (object(raw.characterOverrides) && 'hero-anime' in raw.characterOverrides);
  const legacyReadmeAttributes =
    object(raw.readmeSettings) &&
    ['egoWeapon', 'nelRank', 'currentBid'].some(
      (key) => key in (raw.readmeSettings as Record<string, unknown>),
    );
  const migrated = version !== 3 || hasOldComponent || legacyElementIds || !!legacyReadmeAttributes;
  const warnings: string[] = [];

  if (object(raw.readmeSettings) && Array.isArray(raw.readmeSettings.selectedCards)) {
    const cards = raw.readmeSettings.selectedCards as unknown[];
    const heroIndex = cards.indexOf('hero');
    const posterIndex = cards.indexOf('hero-anime');
    if (posterIndex >= 0) {
      const template = raw.cardTemplates;
      const explicitTemplate =
        object(template) && isCardTemplate('hero', template.hero) ? template.hero : undefined;
      if (!explicitTemplate)
        raw.cardTemplates = {
          ...(object(template) ? template : {}),
          hero: heroIndex < 0 || posterIndex < heroIndex ? 'poster' : 'classic',
        };
      if (heroIndex >= 0 && posterIndex >= 0)
        warnings.push('The two legacy heroes were merged using their first selected order.');
      const seen = new Set<unknown>();
      const merged: unknown[] = [];
      for (const id of cards) {
        const normalized = id === 'hero-anime' ? 'hero' : id;
        if (!seen.has(normalized)) {
          seen.add(normalized);
          merged.push(normalized);
        }
      }
      raw.readmeSettings.selectedCards = merged;
    }
  }

  if (object(raw.characterOverrides) && 'hero-anime' in raw.characterOverrides) {
    const overrides = { ...raw.characterOverrides };
    const posterCharacter = overrides['hero-anime'];
    const heroCharacter = overrides.hero;
    delete overrides['hero-anime'];
    const selectedTemplate = object(raw.cardTemplates) ? raw.cardTemplates.hero : undefined;
    if (!isCardTemplate('hero', selectedTemplate))
      raw.cardTemplates = {
        ...(object(raw.cardTemplates) ? raw.cardTemplates : {}),
        hero: 'poster',
      };
    if (heroCharacter === undefined || selectedTemplate === 'poster')
      overrides.hero = posterCharacter;
    if (heroCharacter !== undefined && posterCharacter !== heroCharacter)
      warnings.push('Legacy hero character overrides were merged using the selected design.');
    raw.characterOverrides = overrides;
  }

  return {
    value: envelope ? { version: 3, config: raw } : raw,
    migrated,
    warnings,
  };
}

/** Also accepts the previous profile.config shape; all new provenance defaults to demo. */
function validateConfig(input: unknown): ProfileConfig {
  if (!object(input)) throw new Error('Configuration must be a JSON object.');
  if (input.version !== undefined && input.version !== 2 && input.version !== 3)
    throw new Error('Unsupported configuration version. Expected version 2 or 3.');
  const raw = object(input.config) ? input.config : input;
  if (
    ![
      'displayName',
      'socials',
      'skills',
      'pitchTechs',
      'matchStats',
      'languages',
      'projects',
    ].every((key) => key in raw)
  )
    throw new Error(
      'Configuration is missing required profile fields. Import a profile.config.json backup.',
    );
  const c = { ...structuredClone(DEFAULT_CONFIG), ...raw } as unknown as ProfileConfig;
  if (!CHARACTER_IDS.includes(c.character))
    throw new Error('character must be a supported profile theme.');
  if (
    c.seasonSync !== undefined &&
    (!object(c.seasonSync) ||
      !string(c.seasonSync.username) ||
      !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(c.seasonSync.username) ||
      !string(c.seasonSync.at) ||
      Number.isNaN(Date.parse(c.seasonSync.at)) ||
      new Date(c.seasonSync.at).toISOString() !== c.seasonSync.at ||
      !['public-calendar', 'github-graphql'].includes(c.seasonSync.method as string))
  )
    throw new Error(
      'seasonSync requires a valid GitHub username, ISO timestamp and calendar provider.',
    );
  if (
    c.nameAnimation !== undefined &&
    !['theme', 'typewriter', 'pop-up', 'none'].includes(c.nameAnimation)
  )
    throw new Error('nameAnimation must be theme, typewriter, pop-up or none.');
  if (
    c.motionCycleSeconds !== undefined &&
    (!finite(c.motionCycleSeconds) || c.motionCycleSeconds < 8 || c.motionCycleSeconds > 30)
  )
    throw new Error('motionCycleSeconds must be a number between 8 and 30.');
  if (
    c.textEffects !== undefined &&
    (!object(c.textEffects) ||
      !Object.entries(c.textEffects).every(
        ([field, setting]) =>
          ['role', 'tagline', 'position', 'jersey', 'edition'].includes(field) &&
          object(setting) &&
          ['theme', 'none', 'typewriter', 'pop-up', 'blur-in', 'slide', 'glitch'].includes(
            setting.effect as string,
          ) &&
          Object.keys(setting).every((key) =>
            ['effect', 'delaySeconds', 'letterSeconds'].includes(key),
          ) &&
          (setting.delaySeconds === undefined ||
            (finite(setting.delaySeconds) &&
              setting.delaySeconds >= 0 &&
              setting.delaySeconds <= 3)) &&
          (setting.letterSeconds === undefined ||
            (finite(setting.letterSeconds) &&
              setting.letterSeconds >= 0.02 &&
              setting.letterSeconds <= 0.25)),
      ))
  )
    throw new Error(
      'textEffects require supported fields/effects, delay 0–3 seconds and letter timing 0.02–0.25 seconds.',
    );
  if (
    c.editionNotes !== undefined &&
    (!object(c.editionNotes) ||
      Object.keys(c.editionNotes).length > 32 ||
      !Object.entries(c.editionNotes).every(([key, value]) => {
        const [component, template, ...extra] = key.split(':');
        return (
          !extra.length &&
          componentIds.includes(component as ComponentId) &&
          isCardTemplate(component as ComponentId, template) &&
          string(value) &&
          value.length <= 200
        );
      }))
  )
    throw new Error(
      'editionNotes require a supported card/design and up to 200 characters per note.',
    );
  if (c.layoutOverrides !== undefined && !validLayoutOverrides(c.layoutOverrides))
    throw new Error(
      'layoutOverrides require supported card/design/layout keys and finite positions, scale 0.1–4, rotation −360–360.',
    );
  if (
    c.motionOverrides !== undefined &&
    !validMotionOverrides(
      c.motionOverrides,
      c.motionCycleSeconds ??
        (c.animationLevel === 'cinematic' ? 20 : c.animationLevel === 'subtle' ? 18 : 16),
    )
  )
    throw new Error(
      'motionOverrides require up to four clips per element, unique channels and valid timing inside the animation cycle.',
    );
  if (
    c.taglines !== undefined &&
    (!Array.isArray(c.taglines) ||
      c.taglines.length > 8 ||
      !c.taglines.every((value) => string(value) && value.length <= 200))
  )
    throw new Error('taglines allow up to eight lines of 200 characters each.');
  if (
    c.characterColorways !== undefined &&
    (!object(c.characterColorways) ||
      !Object.entries(c.characterColorways).every(
        ([id, value]) =>
          CHARACTER_IDS.includes(id as CharacterId) && validCharacterColorway(id, value),
      ))
  )
    throw new Error(
      'characterColorways require a supported character and colorway; Deep Blue is available for Isagi.',
    );
  if (c.heroColorOverrides !== undefined) {
    if (
      !object(c.heroColorOverrides) ||
      Object.keys(c.heroColorOverrides).length > 72 ||
      !Object.entries(c.heroColorOverrides).every(([key, colors]) => {
        const [template, character, mode, colorway, ...extra] = key.split(':');
        return (
          !extra.length &&
          (colorway === undefined || (character === 'isagi' && colorway === 'deep-blue')) &&
          Object.hasOwn(HERO_COLOR_FIELDS, template) &&
          CHARACTER_IDS.includes(character as CharacterId) &&
          ['dark', 'light'].includes(mode) &&
          object(colors) &&
          Object.entries(colors).every(
            ([field, color]) =>
              HERO_COLOR_FIELDS[template].includes(field as HeroColorField) && isHexColor(color),
          )
        );
      })
    )
      throw new Error(
        'Hero colors require a supported style, character, dark/light mode and #RRGGBB values.',
      );
    c.heroColorOverrides = Object.fromEntries(
      Object.entries(c.heroColorOverrides).map(([key, colors]) => [
        key,
        Object.fromEntries(
          Object.entries(colors).map(([field, color]) => [field, color.toUpperCase()]),
        ),
      ]),
    );
  }
  if (c.presentation !== undefined) {
    const p = c.presentation;
    if (
      !object(p) ||
      (p.shortTagline !== undefined && !string(p.shortTagline)) ||
      (p.techLabels !== undefined &&
        (!object(p.techLabels) || !Object.values(p.techLabels).every(string))) ||
      (p.projectSummaries !== undefined &&
        (!object(p.projectSummaries) ||
          !Object.values(p.projectSummaries).every(
            (s) =>
              object(s) &&
              (s.wide === undefined || string(s.wide)) &&
              (s.compact === undefined || string(s.compact)),
          )))
    )
      throw new Error('Presentation overrides must contain text only.');
  }
  if (
    !strings(c as unknown as Record<string, unknown>, [
      'displayName',
      'egoTagline',
      'role',
      'jerseyNumber',
      'positionName',
      'philosophy',
      'favoriteClub',
      'avatarSeed',
      'presetLabel',
    ])
  )
    throw new Error('Profile text fields must be strings.');
  if (
    !CHARACTER_IDS.includes(c.character as CharacterId) ||
    (c.motionCycleSeconds !== undefined &&
      (!finite(c.motionCycleSeconds) || c.motionCycleSeconds < 8 || c.motionCycleSeconds > 30)) ||
    (c.motionOverrides !== undefined &&
      !validMotionOverrides(
        c.motionOverrides,
        c.motionCycleSeconds ??
          (c.animationLevel === 'cinematic' ? 20 : c.animationLevel === 'subtle' ? 18 : 16),
      )) ||
    (c.characterOverrides !== undefined &&
      (!object(c.characterOverrides) ||
        !Object.entries(c.characterOverrides).every(
          ([component, character]) =>
            componentIds.includes(component as ComponentId) &&
            CHARACTER_IDS.includes(character as CharacterId),
        ))) ||
    (c.cardTemplates !== undefined &&
      (!object(c.cardTemplates) ||
        !Object.entries(c.cardTemplates).every(
          ([component, template]) =>
            componentIds.includes(component as ComponentId) &&
            isCardTemplate(component as ComponentId, template),
        ))) ||
    (c.layoutOverrides !== undefined && !validLayoutOverrides(c.layoutOverrides)) ||
    (c.taglines !== undefined &&
      (!Array.isArray(c.taglines) ||
        c.taglines.length > 8 ||
        !c.taglines.every((tagline) => string(tagline) && tagline.length <= 200)))
  )
    throw new Error('Character selection or tagline list is invalid.');
  if (
    !['OPEN', 'CLOSED', 'NEGOTIATING'].includes(c.transferStatus) ||
    !['full', 'subtle', 'none', 'cinematic'].includes(c.animationLevel) ||
    !['4-3-3', '4-4-2'].includes(c.pitchFormation)
  )
    throw new Error('Invalid status, animation or formation.');
  if (
    !object(c.socials) ||
    !string(c.socials.github) ||
    !(['twitter', 'linkedin', 'email', 'portfolio'] as const).every(
      (k) => c.socials[k] === undefined || string(c.socials[k]),
    ) ||
    (c.socials.portfolio && !url(c.socials.portfolio))
  )
    throw new Error('Invalid contact fields. Portfolio must use http(s).');
  if (
    !Array.isArray(c.skills) ||
    c.skills.length > 12 ||
    !c.skills.every(
      (s) =>
        object(s) &&
        strings(s, ['name', 'description']) &&
        (s.id === undefined || (string(s.id) && /^[a-zA-Z0-9_-]{1,80}$/.test(s.id))) &&
        finite(s.value) &&
        s.value >= 0 &&
        s.value <= 99,
    ) ||
    new Set(c.skills.flatMap((skill) => (skill.id ? [skill.id] : []))).size !==
      c.skills.filter((skill) => skill.id).length
  )
    throw new Error('Skills require text and scores from 0 to 99 (maximum 12).');
  if (
    !Array.isArray(c.pitchTechs) ||
    c.pitchTechs.length > 11 ||
    !c.pitchTechs.every(
      (n) =>
        object(n) &&
        strings(n, ['id', 'role', 'positionName', 'tech']) &&
        ['GK', 'DF', 'MF', 'FW'].includes(n.role as string) &&
        (n.subTech === undefined || string(n.subTech)) &&
        finite(n.x) &&
        finite(n.y) &&
        n.x >= 0 &&
        n.x <= 100 &&
        n.y >= 0 &&
        n.y <= 100,
    ) ||
    new Set(c.pitchTechs.map((n) => n.id)).size !== c.pitchTechs.length
  )
    throw new Error('Pitch requires up to 11 unique nodes with coordinates from 0 to 100.');
  if (
    !object(c.matchStats) ||
    !Object.keys(DEFAULT_CONFIG.matchStats).every((k) =>
      nonnegative(c.matchStats[k as keyof MatchStats]),
    )
  )
    throw new Error('Statistics must be finite, non-negative numbers.');
  if (
    !object(c.statSources) ||
    !Object.keys(DEFAULT_CONFIG.matchStats).every((k) =>
      source(c.statSources[k as keyof MatchStats]),
    )
  )
    throw new Error('Invalid statistic sources.');
  if (
    !Array.isArray(c.languages) ||
    c.languages.length > 20 ||
    !c.languages.every(
      (l) =>
        object(l) &&
        (l.id === undefined || (string(l.id) && /^[a-zA-Z0-9_-]{1,80}$/.test(l.id))) &&
        string(l.name) &&
        finite(l.percent) &&
        l.percent >= 0 &&
        l.percent <= 100 &&
        /^#[\da-f]{6}$/i.test(l.color as string) &&
        ['up', 'down', 'same'].includes(l.trend as string) &&
        nonnegative(l.rank),
    ) ||
    new Set(c.languages.flatMap((language) => (language.id ? [language.id] : []))).size !==
      c.languages.filter((language) => language.id).length
  )
    throw new Error('Invalid language name, percentage or hex color.');
  if (
    !Array.isArray(c.projects) ||
    c.projects.length > 12 ||
    !c.projects.every(
      (p) =>
        object(p) &&
        strings(p, ['id', 'number', 'name', 'description', 'primaryTech', 'rating']) &&
        url(p.url) &&
        nonnegative(p.stars) &&
        nonnegative(p.forks) &&
        ['ACTIVE', 'CHAMPION', 'EVOLVING'].includes(p.status as string),
    ) ||
    new Set(c.projects.map((p) => p.id)).size !== c.projects.length
  )
    throw new Error('Projects require unique IDs, valid fields and http(s) URLs.');
  if (
    !['demo', 'manual'].includes(c.skillSource) ||
    !source(c.languageSource) ||
    !['demo', 'manual'].includes(c.projectSource) ||
    !source(c.seasonSource)
  )
    throw new Error('Invalid data provenance.');
  if (
    !Array.isArray(c.seasonDays) ||
    c.seasonDays.length > 366 ||
    !c.seasonDays.every(
      (d) =>
        object(d) &&
        string(d.date) &&
        /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
        !Number.isNaN(Date.parse(d.date)) &&
        new Date(d.date).toISOString().slice(0, 10) === d.date &&
        nonnegative(d.count) &&
        Number.isInteger(d.count),
    ) ||
    new Set(c.seasonDays.map((d) => d.date)).size !== c.seasonDays.length
  )
    throw new Error(
      'Activity requires unique valid YYYY-MM-DD dates and integer counts (maximum 366).',
    );
  if (c.egoWeapon !== undefined && !string(c.egoWeapon))
    throw new Error('Ego weapon must be a string.');
  if (c.nelRank !== undefined && !string(c.nelRank)) throw new Error('NEL rank must be a string.');
  if (c.currentBid !== undefined && !string(c.currentBid))
    throw new Error('Current bid must be a string.');
  if (c.readmeSettings !== undefined) {
    const settings = c.readmeSettings;
    if (
      !object(settings) ||
      (settings.template !== undefined &&
        !['striker', 'playmaker', 'all-star', 'minimal'].includes(settings.template)) ||
      (settings.embedMode !== undefined &&
        !['relative', 'raw', 'jsdelivr'].includes(settings.embedMode)) ||
      (settings.repoPath !== undefined && !string(settings.repoPath)) ||
      (settings.branch !== undefined && !string(settings.branch)) ||
      (settings.selectedCards !== undefined &&
        (!Array.isArray(settings.selectedCards) ||
          !settings.selectedCards.every((id) => componentIds.includes(id as ComponentId)) ||
          new Set(settings.selectedCards).size !== settings.selectedCards.length)) ||
      (['showBadges', 'showQuote', 'showBio', 'showTactics'] as const).some(
        (key) => settings[key] !== undefined && typeof settings[key] !== 'boolean',
      ) ||
      (settings.align !== undefined && !['center', 'left'].includes(settings.align))
    )
      throw new Error(
        'README settings contain an invalid template, card, flag, alignment or path.',
      );
  }
  if (c.readmeSettings) {
    for (const key of ['egoWeapon', 'nelRank', 'currentBid'] as const) {
      const value = c.readmeSettings[key];
      if (value !== undefined && !string(value))
        throw new Error(`readmeSettings.${key} must be a string.`);
      if (value !== undefined) c[key] = value;
    }
    const { egoWeapon, nelRank, currentBid, ...settings } = c.readmeSettings;
    c.readmeSettings = settings;
  }
  return c;
}

export function parseConfigWithMigration(input: unknown): ConfigReadResult {
  const migrated = migrateConfigInput(input);
  return { ...migrated, config: validateConfig(migrated.value) };
}

export function parseConfig(input: unknown): ProfileConfig {
  return parseConfigWithMigration(input).config;
}

export function serializeConfig(config: ProfileConfig): string {
  const normalized = validateConfig(config);
  return JSON.stringify({ version: 3, config: normalized }, null, 2);
}

export function readStoredConfig(
  storage: Pick<Storage, 'getItem'>,
): ConfigReadResult & { error?: string } {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (saved) return parseConfigWithMigration(JSON.parse(saved));
    const legacy = storage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const result = parseConfigWithMigration(JSON.parse(legacy));
      return { ...result, migrated: true };
    }
    return { config: structuredClone(DEFAULT_CONFIG), migrated: false, warnings: [] };
  } catch {
    return {
      config: structuredClone(DEFAULT_CONFIG),
      migrated: false,
      warnings: [],
      error:
        'Saved configuration could not be read. Default demo loaded; import a backup to recover.',
    };
  }
}
