import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CHARACTER_IDS } from '../src/characters/themes';
import { DEFAULT_CONFIG } from '../src/data/defaultConfig';
import { parseConfig, serializeConfig } from '../src/data/configStore';
import { generateProfile } from './generate-profile';

const usage = `Ego Striker profile CLI

Commands:
  init                          Create profile.config.json in this folder
  generate [--character ID | --characters ID,ID | --all-characters] [--all-templates]
                                Generate SVGs, PROFILE-README.md and the sync workflow
  --readme-output root          Also update README.md in a profile repository
  --isagi-colorway ID          Choose default or deep-blue for Isagi cards
  --all-isagi-colorways        Include both Isagi colorways in generated assets
  help                          Show this guide

Characters: ${CHARACTER_IDS.join(', ')}
Run with: npx tsx scripts/cli.ts <command>`;

export async function runCli(args: string[], root = process.cwd()): Promise<void> {
  const [command = 'help', ...options] = args;
  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(usage);
    return;
  }
  if (!['init', 'generate'].includes(command))
    throw new Error(`Unknown command "${command}".\n\n${usage}`);
  const allowed =
    command === 'init'
      ? ['--character']
      : [
          '--character',
          '--characters',
          '--all-characters',
          '--all-templates',
          '--readme-output',
          '--isagi-colorway',
          '--all-isagi-colorways',
        ];
  const values = new Map<string, string>();
  for (let index = 0; index < options.length; index++) {
    const flag = options[index];
    if (!allowed.includes(flag)) throw new Error(`Unknown option "${flag}".`);
    if (values.has(flag)) throw new Error(`Option "${flag}" is repeated.`);
    if (
      flag === '--all-characters' ||
      flag === '--all-templates' ||
      flag === '--all-isagi-colorways'
    ) {
      values.set(flag, 'true');
      continue;
    }
    const value = options[++index];
    if (!value || value.startsWith('--')) throw new Error(`Option "${flag}" requires a value.`);
    values.set(flag, value);
  }
  const output =
    values.get('--readme-output') ??
    (process.env.README_OUTPUT || (process.env.OVERWRITE_README === 'true' ? 'root' : 'profile'));
  if (!['root', 'profile'].includes(output))
    throw new Error('--readme-output must be profile or root.');
  const isagiColorway = values.get('--isagi-colorway');
  if (isagiColorway !== undefined && !['default', 'deep-blue'].includes(isagiColorway))
    throw new Error('--isagi-colorway must be default or deep-blue.');
  if (command === 'init') {
    const configPath = join(root, 'profile.config.json');
    if (existsSync(configPath))
      throw new Error(
        'profile.config.json already exists. Import or edit it in the studio to preserve your profile.',
      );
    const characterIndex = options.indexOf('--character');
    const character = characterIndex >= 0 ? options[characterIndex + 1] : undefined;
    if (character && !CHARACTER_IDS.includes(character as (typeof CHARACTER_IDS)[number]))
      throw new Error(
        `Unknown character "${character}". Choose one of: ${CHARACTER_IDS.join(', ')}.`,
      );
    const config = parseConfig({
      ...structuredClone(DEFAULT_CONFIG),
      ...(character ? { character } : {}),
    });
    await mkdir(root, { recursive: true });
    await writeFile(configPath, serializeConfig(config), 'utf8');
    console.log(`Created ${configPath}. Edit the profile in the studio, then run generate.`);
    return;
  }
  if (command === 'generate') {
    const characterIndex = options.indexOf('--character');
    const character = characterIndex >= 0 ? options[characterIndex + 1] : undefined;
    const charactersIndex = options.indexOf('--characters');
    const characters =
      charactersIndex >= 0
        ? (options[charactersIndex + 1] ?? '').split(',').map((id) => id.trim())
        : undefined;
    const allCharacters = options.includes('--all-characters');
    const allTemplates = options.includes('--all-templates');
    if (character && !CHARACTER_IDS.includes(character as (typeof CHARACTER_IDS)[number]))
      throw new Error(
        `Unknown character "${character}". Choose one of: ${CHARACTER_IDS.join(', ')}.`,
      );
    if (character && (characters || allCharacters))
      throw new Error('Use only one of --character, --characters, or --all-characters.');
    if (characters && allCharacters)
      throw new Error('Use only one of --characters or --all-characters.');
    if (characters?.some((id) => !CHARACTER_IDS.includes(id as (typeof CHARACTER_IDS)[number])))
      throw new Error(
        `Unknown character in --characters. Choose one of: ${CHARACTER_IDS.join(', ')}.`,
      );
    if (characters && new Set(characters).size !== characters.length)
      throw new Error('The --characters list must not repeat a character.');
    await generateProfile({
      root,
      character: character as (typeof CHARACTER_IDS)[number] | undefined,
      characters: characters as (typeof CHARACTER_IDS)[number][] | undefined,
      allCharacters,
      allTemplates,
      isagiColorway: isagiColorway as 'default' | 'deep-blue' | undefined,
      allIsagiColorways: values.has('--all-isagi-colorways'),
      writeRootReadme: output === 'root',
    });
    return;
  }
  throw new Error(`Unknown command "${command}".\n\n${usage}`);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/cli.ts'))
  runCli(process.argv.slice(2)).catch((error) => {
    console.error((error as Error).message);
    process.exitCode = 1;
  });
