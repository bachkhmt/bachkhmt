import { ProfileConfig } from '../types';

export const GITHUB_CONTRIBUTIONS_QUERY = `
  query EgoStrikerContributions($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalPullRequestContributions
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

type ContributionResponse = {
  data?: {
    user?: {
      contributionsCollection?: {
        totalCommitContributions?: number;
        totalPullRequestContributions?: number;
        contributionCalendar?: {
          totalContributions?: number;
          weeks?: { contributionDays?: { date?: string; contributionCount?: number }[] }[];
        };
      } | null;
    } | null;
  };
  errors?: { message?: string }[];
};

const validCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

function consecutiveStreak(days: { date: string; count: number }[], today: string): number {
  const counts = new Map(days.map((day) => [day.date, day.count]));
  let cursor = new Date(`${today}T00:00:00.000Z`);
  if ((counts.get(today) ?? 0) === 0) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (counts.get(cursor.toISOString().slice(0, 10))! > 0) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/** Fetches an account's contribution calendar without changing unrelated profile fields. */
export async function syncGithubContributions(
  config: ProfileConfig,
  token: string,
  request: typeof fetch = fetch,
  now = new Date(),
): Promise<ProfileConfig> {
  const username = config.socials.github.trim();
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username))
    throw new Error('Enter a valid GitHub username before syncing contributions.');
  if (!token.trim()) throw new Error('A GitHub token is required to sync contributions.');

  const toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - 365);
  const to = now.toISOString();
  const from = fromDate.toISOString();
  const response = await request('https://api.github.com/graphql', {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: GITHUB_CONTRIBUTIONS_QUERY,
      variables: { login: username, from, to },
    }),
  });
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 403
        ? 'GitHub rejected the token or its permissions.'
        : response.status === 429
          ? 'GitHub rate limit reached. Try again later.'
          : 'GitHub contribution request failed.',
    );

  const payload = (await response.json()) as ContributionResponse;
  if (payload.errors?.length)
    throw new Error(
      payload.errors
        .map((item) => item.message)
        .filter(Boolean)
        .join('; '),
    );
  const collection = payload.data?.user?.contributionsCollection;
  const calendar = collection?.contributionCalendar;
  if (
    !collection ||
    !calendar ||
    !validCount(collection.totalCommitContributions) ||
    !validCount(collection.totalPullRequestContributions) ||
    !validCount(calendar.totalContributions) ||
    !Array.isArray(calendar.weeks)
  )
    throw new Error('GitHub returned an incomplete contribution calendar.');

  if (
    !calendar.weeks.length ||
    !calendar.weeks.every(
      (week) =>
        week &&
        Array.isArray(week.contributionDays) &&
        week.contributionDays.every(
          (day) =>
            day &&
            typeof day.date === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(day.date) &&
            !Number.isNaN(Date.parse(day.date)) &&
            new Date(day.date).toISOString().slice(0, 10) === day.date &&
            validCount(day.contributionCount),
        ),
    )
  )
    throw new Error(
      'GitHub returned invalid contribution dates or counts. Saved metrics were kept.',
    );

  const fromDay = from.slice(0, 10);
  const toDay = to.slice(0, 10);
  const seasonDays = calendar.weeks
    .flatMap((week) => week.contributionDays ?? [])
    .filter(
      (day): day is { date: string; contributionCount: number } =>
        typeof day.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(day.date) &&
        day.date >= fromDay &&
        day.date <= toDay &&
        validCount(day.contributionCount),
    )
    .map(({ date, contributionCount }) => ({ date, count: contributionCount }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (new Set(seasonDays.map((day) => day.date)).size !== seasonDays.length)
    throw new Error('GitHub returned duplicate contribution dates.');

  return {
    ...config,
    matchStats: {
      ...config.matchStats,
      goals: collection.totalCommitContributions,
      assists: collection.totalPullRequestContributions,
      winStreak: consecutiveStreak(seasonDays, toDay),
    },
    statSources: {
      ...config.statSources,
      goals: 'github',
      assists: 'github',
      winStreak: 'github',
    },
    seasonDays,
    seasonSource: 'github',
    seasonSync: { username, at: now.toISOString(), method: 'github-graphql' },
  };
}

/** Public profile calendar, via the CORS-enabled github-contributions-api service. No token is sent. */
export async function syncPublicGithubContributions(
  config: ProfileConfig,
  request: typeof fetch = fetch,
  now = new Date(),
): Promise<ProfileConfig> {
  const username = config.socials.github.trim();
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username))
    throw new Error('Enter a valid GitHub username before syncing contributions.');
  const response = await request(
    `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`,
    {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/json' },
      credentials: 'omit',
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? 'GitHub user not found.'
        : response.status === 429
          ? 'Contribution service rate limit reached. Try again later.'
          : 'Public GitHub calendar could not be loaded. Try again later.',
    );
  const payload = (await response.json()) as { contributions?: unknown; error?: unknown } | null;
  const days = payload?.contributions;
  if (
    !Array.isArray(days) ||
    !days.length ||
    days.length > 400 ||
    !days.every(
      (day) =>
        day &&
        typeof day === 'object' &&
        typeof day.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(day.date) &&
        !Number.isNaN(Date.parse(day.date)) &&
        new Date(day.date).toISOString().slice(0, 10) === day.date &&
        validCount(day.count) &&
        Number.isSafeInteger(day.count),
    )
  )
    throw new Error('Contribution service returned an invalid calendar. Saved activity was kept.');
  if (new Set(days.map((day) => day.date)).size !== days.length)
    throw new Error('Contribution service returned duplicate dates. Saved activity was kept.');
  const end = now.toISOString().slice(0, 10);
  const startDate = new Date(`${end}T00:00:00.000Z`);
  startDate.setUTCDate(startDate.getUTCDate() - 365);
  const start = startDate.toISOString().slice(0, 10);
  const seasonDays = days
    .filter((day) => day.date >= start && day.date <= end)
    .map(({ date, count }) => ({ date: date as string, count: count as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!seasonDays.length)
    throw new Error('Contribution service returned no recent dates. Saved activity was kept.');
  return {
    ...config,
    seasonDays,
    seasonSource: 'github',
    seasonSync: { username, at: now.toISOString(), method: 'public-calendar' },
  };
}
