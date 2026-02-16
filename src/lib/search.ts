// src/lib/search.ts
import { cacheGet, cacheSet, logEvent } from '@/lib/aws/dynamo';
import { fetchAdzuna } from '@/lib/upstream/adzuna';
import { normaliseField, inferExperienceLevel, buildFieldIntelligence } from '@/lib/intelligence';
import { logger } from '@/lib/logger';
import type { JobListing, SearchParams, SearchResponse, FieldIntelligence } from '@/types';

function cacheKey(p: SearchParams): string {
  return ['search', p.query.toLowerCase().replace(/\s+/g,'-'),
    p.field ?? 'all', p.location ?? 'any', p.page ?? 1].join(':');
}

function dedup(jobs: JobListing[]): JobListing[] {
  const seen = new Set<string>();
  return jobs.filter(j => {
    const k = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
    return seen.has(k) ? false : (seen.add(k), true);
  });
}

// Fetch from multiple sources with graceful degradation
async function fetchAll(params: SearchParams): Promise<{ jobs: JobListing[]; sources: string[]; partial: boolean }> {
  const results = await Promise.allSettled([
    fetchAdzuna(params),
    // Add more sources here (jsearch, etc.) following the same pattern
  ]);

  const jobs: JobListing[] = [];
  const sources: string[] = [];
  let partial = false;

  results.forEach((r, i) => {
    const name = ['adzuna'][i];
    if (r.status === 'fulfilled') {
      jobs.push(...r.value.jobs);
      sources.push(name);
    } else {
      logger.warn('upstream_failed', { source: name, error: String(r.reason) });
      partial = true;
    }
  });

  return { jobs: dedup(jobs), sources, partial };
}

export async function searchJobs(params: SearchParams): Promise<SearchResponse> {
  const start = Date.now();
  const key   = cacheKey(params);

  // Cache check
  const cached = await cacheGet<SearchResponse>(key);
  if (cached) {
    logEvent('search_cache_hit', { query: params.query });
    return { ...cached, fromCache: true };
  }

  const { jobs, sources, partial } = await fetchAll(params);
  const durationMs = Date.now() - start;

  // Build inline field intelligence for the searched field
  const fieldJobs = params.field
    ? jobs.filter(j => j.field === params.field)
    : jobs;
  const intelligence = buildFieldIntelligence(params.field ?? params.query, fieldJobs);

  const response: SearchResponse = {
    jobs,
    totalCount: jobs.length,
    intelligence,
    fromCache: false,
    durationMs,
    partial,
    sources,
  };

  cacheSet(key, response).catch(() => {});
  logEvent('search_complete', { query: params.query, resultCount: jobs.length, durationMs });
  logger.info('search_complete', { query: params.query, count: jobs.length, durationMs });

  return response;
}

// Fetch intelligence for ALL known fields at once (used for the overview dashboard)
export async function fetchAllFieldIntelligence(): Promise<FieldIntelligence[]> {
  const FIELDS = [
    'Software Engineering', 'Data & AI', 'Product Management', 'Design',
    'Marketing', 'Sales', 'Finance & Accounting', 'Human Resources',
    'Operations', 'Cybersecurity', 'Cloud & Infrastructure',
    'Project Management', 'Customer Success', 'Healthcare', 'Legal',
  ];

  const key = 'overview:all-fields';
  const cached = await cacheGet<FieldIntelligence[]>(key);
  if (cached) return cached;

  // Fetch a sample for each field concurrently
  const settled = await Promise.allSettled(
    FIELDS.map(field => fetchAdzuna({ query: field, pageSize: 20 }))
  );

  const intelligence: FieldIntelligence[] = FIELDS.map((field, i) => {
    const result = settled[i];
    const jobs = result.status === 'fulfilled' ? result.value.jobs : [];
    // Tag all jobs with their canonical field
    jobs.forEach(j => { j.field = field; });
    return buildFieldIntelligence(field, jobs);
  });

  cacheSet(key, intelligence, 900).catch(() => {}); // 15 min cache
  return intelligence;
}
