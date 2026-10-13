import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_CONFIG } from '../src/data/defaultConfig';
import { syncGithub } from '../src/data/github';
import { syncGithubContributions } from '../src/data/githubContributions';
import { parseConfig, parseConfigWithMigration, serializeConfig } from '../src/data/configStore';
import { COMPONENT_REGISTRY, pageCount } from '../src/generator/svgGenerators';
import { createExportZip } from '../src/generator/exportZip';
import { assertAssetReferences } from '../src/generator/exportManifest';
import { carouselFilename, renderCarouselSvg } from '../src/generator/carousel';
import { generateFullReadme } from '../src/readme';
import { PROFILE_SYNC_WORKFLOW } from '../src/readme/workflowTemplates';
import { ProfileConfig } from '../src/types';
import { CHARACTER_IDS, CHARACTER_THEMES } from '../src/characters/themes';

export interface GenerateProfileOptions {
  root?: string;
  character?: ProfileConfig['character'];
  characters?: ProfileConfig['character'][];
  allCharacters?: boolean;
  allTemplates?: boolean;
  isagiColorway?: 'default' | 'deep-blue';
  allIsagiColorways?: boolean;
  writeRootReadme?: boolean;
  token?: string;
  request?: typeof fetch;
}

const OUTPUT_MANIFEST = '.ego-striker-manifest.json';
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

async function readOutputManifest(path: string): Promise<Record<string, string>> {
  if (!existsSync(path)) return {};
  try {
    const manifest = JSON.parse(await readFile(path, 'utf8')) as {
      version?: unknown;
      files?: unknown;
    };
    if (
      manifest.version !== 1 ||
      !manifest.files ||
      typeof manifest.files !== 'object' ||
      Array.isArray(manifest.files)
    )
      throw new Error('Unsupported generator output manifest.');
    return Object.fromEntries(
      Object.entries(manifest.files).filter(
        ([name, hash]) =>
          /^[a-z0-9.-]+\.svg$/i.test(name) &&
          typeof hash === 'string' &&
          /^[a-f0-9]{64}$/.test(hash),
      ),
    );
  } catch (error) {
    console.warn(`Output manifest ignored; no files will be cleaned: ${(error as Error).message}`);
    return {};
  }
}

export async function generateProfile(options: GenerateProfileOptions = {}) {
  const root = options.root ?? process.cwd();
  const configPath = join(root, 'profile.config.json');
  let config: ProfileConfig;
  let configChanged = false;

  if (existsSync(configPath)) {
    try {
      const result = parseConfigWithMigration(JSON.parse(await readFile(configPath, 'utf8')));
      config = result.config;
      configChanged = result.migrated;
      result.warnings.forEach((warning) => console.warn(`Configuration migration: ${warning}`));
      console.log('Loaded profile.config.json');
    } catch (error) {
      throw new Error(
        `Could not read profile.config.json; the file was left untouched. ${(error as Error).message}`,
      );
    }
  } else {
    config = structuredClone(DEFAULT_CONFIG);
    configChanged = true;
    console.log('Created profile.config.json');
  }

  if (options.character) {
    config = parseConfig({ ...config, character: options.character, characterOverrides: {} });
    configChanged = true;
  }

  if (
    (options.allCharacters && options.characters?.length) ||
    (options.characters && options.characters.some((id) => !CHARACTER_IDS.includes(id)))
  )
    throw new Error('Choose either --all-characters or a valid --characters list, not both.');
  const exportCharacters = options.allCharacters
    ? CHARACTER_IDS
    : [
        ...new Set([
          config.character,
          ...Object.values(config.characterOverrides ?? {}),
          ...(options.characters ?? []),
        ]),
      ];
  if (!exportCharacters.length || new Set(exportCharacters).size !== exportCharacters.length)
    throw new Error('Select at least one unique character to export.');

  if (options.isagiColorway !== undefined) {
    config = parseConfig({
      ...config,
      characterColorways: { ...config.characterColorways, isagi: options.isagiColorway },
    });
    configChanged = true;
  }
  const request = options.request ?? fetch;
  const token = options.token ?? process.env.GITHUB_TOKEN;
  if (config.socials.github.trim() && token) {
    try {
      config = await syncGithub(config, request);
      configChanged = true;
      console.log('Synced public repository count from GitHub.');
    } catch (error) {
      console.warn(`GitHub repository sync skipped: ${(error as Error).message}`);
    }
    try {
      config = await syncGithubContributions(config, token, request);
      configChanged = true;
      console.log('Synced contribution calendar and GitHub stats.');
    } catch (error) {
      console.warn(
        `GitHub contributions sync skipped; saved metrics were kept: ${(error as Error).message}`,
      );
    }
  }

  // Build and validate every output before touching the target directory.
  const zip = await createExportZip(
    config,
    COMPONENT_REGISTRY.map((c) => c.id),
    {
      characters: options.allCharacters ? CHARACTER_IDS : options.characters,
      allTemplates: options.allTemplates,
      allIsagiColorways: options.allIsagiColorways,
    },
  );
  const readmeContent = generateFullReadme(config);
  assertAssetReferences(readmeContent, Object.keys(zip.files));
  const prepared = new Map<string, string>();
  for (const entry of Object.values(zip.files))
    if (!entry.dir) prepared.set(entry.name, await entry.async('string'));
  const assetsDir = join(root, 'assets', 'ego-striker');
  const previousManifest = await readOutputManifest(join(assetsDir, OUTPUT_MANIFEST));
  await mkdir(assetsDir, { recursive: true });
  if (configChanged) await writeFile(configPath, serializeConfig(config), 'utf8');
  let svgCount = 0;
  const writtenFiles: Record<string, string> = {};
  for (const [name, content] of prepared) {
    if (name === 'profile.config.json' || name === 'profile.config.ts') continue;
    await writeFile(join(root, name), content, 'utf8');
    if (name.endsWith('.svg')) {
      writtenFiles[name.slice('assets/ego-striker/'.length)] = sha256(content);
      svgCount++;
    }
  }
  // Clean only unchanged files recorded by an earlier successful generator run.
  for (const [filename, previousHash] of Object.entries(previousManifest)) {
    if (writtenFiles[filename] || filename.startsWith('hero-anime.')) continue;
    const path = join(assetsDir, filename);
    if (!existsSync(path)) continue;
    try {
      const content = await readFile(path, 'utf8');
      if (sha256(content) === previousHash) await rm(path);
      else
        console.warn(
          `Preserved edited asset ${filename}; its contents no longer match the output manifest.`,
        );
    } catch (error) {
      console.warn(`Could not clean ${filename}: ${(error as Error).message}`);
    }
  }
  await writeFile(
    join(assetsDir, OUTPUT_MANIFEST),
    JSON.stringify({ version: 1, files: writtenFiles }, null, 2),
    'utf8',
  );

  await writeFile(join(root, 'PROFILE-README.md'), readmeContent, 'utf8');
  if (options.writeRootReadme) await writeFile(join(root, 'README.md'), readmeContent, 'utf8');

  const workflowDir = join(root, '.github', 'workflows');
  await mkdir(workflowDir, { recursive: true });
  const workflowPath = join(workflowDir, 'ego-striker-sync.yml');
  if (!existsSync(workflowPath)) {
    await writeFile(workflowPath, PROFILE_SYNC_WORKFLOW, { encoding: 'utf8', flag: 'wx' });
    console.log('Created .github/workflows/ego-striker-sync.yml (daily sync).');
  } else {
    console.log('Kept the existing sync workflow and its schedule.');
  }

  const charactersSummary = exportCharacters.map((id) => CHARACTER_THEMES[id].name).join(', ');
  console.log(`Generated ${svgCount} SVG cards for ${charactersSummary} in assets/ego-striker/`);
  console.log('Generated PROFILE-README.md');
  if (options.writeRootReadme) console.log('Updated README.md');
  return { config, svgCount };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  import('./cli')
    .then(({ runCli }) => runCli(['generate', ...process.argv.slice(2)], process.cwd()))
    .catch((error) => {
      console.error('Profile generation failed:', (error as Error).message);
      process.exitCode = 1;
    });
}
