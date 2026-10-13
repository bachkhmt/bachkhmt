import { ProfileConfig } from '../types';

export async function syncGithub(
  config: ProfileConfig,
  request: typeof fetch = fetch,
): Promise<ProfileConfig> {
  const username = config.socials.github.trim();
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username))
    throw new Error('Enter a valid GitHub username.');
  const response = await request(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    signal: AbortSignal.timeout(10000),
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? 'GitHub user not found.'
        : response.status === 403 || response.status === 429
          ? 'GitHub rate limit reached. Try again later.'
          : 'GitHub request failed. Your edits were kept.',
    );
  const data = await response.json();
  if (!Number.isInteger(data.public_repos) || data.public_repos < 0)
    throw new Error('GitHub returned invalid repository data.');
  return {
    ...config,
    matchStats: { ...config.matchStats, matches: data.public_repos },
    statSources: { ...config.statSources, matches: 'github' },
  };
}
