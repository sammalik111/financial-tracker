// src/lib/upstream/adzuna.ts
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { logger } from '@/lib/logger';
import { normaliseField, inferExperienceLevel } from '@/lib/intelligence';
import type { JobListing, SearchParams } from '@/types';

const TIMEOUT  = parseInt(process.env.HTTP_TIMEOUT_MS  ?? '8000');
const RETRIES  = parseInt(process.env.HTTP_RETRY_COUNT ?? '3');
const BASE_URL = 'https://api.adzuna.com/v1/api';

const http = axios.create({ baseURL: BASE_URL, timeout: TIMEOUT });
axiosRetry(http, {
  retries: RETRIES,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: e => axiosRetry.isNetworkError(e) || (e.response?.status ?? 0) >= 500,
  onRetry: (n, e) => logger.warn('adzuna_retry', { attempt: n, status: e.response?.status }),
});

interface AdzunaJob {
  id: string; title: string;
  company: { display_name: string };
  location: { display_name: string };
  salary_min?: number; salary_max?: number;
  description: string; redirect_url: string;
  created: string; category: { label: string };
  contract_type?: string;
}

function normalise(r: AdzunaJob): JobListing {
  const field = normaliseField(r.title, r.category?.label);
  return {
    id: `adzuna-${r.id}`,
    title: r.title,
    company: r.company?.display_name ?? 'Unknown',
    location: r.location?.display_name ?? '',
    field,
    salaryMin: r.salary_min,
    salaryMax: r.salary_max,
    description: r.description ?? '',
    url: r.redirect_url,
    postedAt: r.created,
    source: 'adzuna',
    remote: /remote/i.test(r.title + r.description),
    contractType: r.contract_type,
    experienceLevel: inferExperienceLevel(r.title, r.description ?? ''),
  };
}

export async function fetchAdzuna(params: SearchParams): Promise<{ jobs: JobListing[]; total: number }> {
  const appId  = process.env.ADZUNA_APP_ID  ?? '';
  const appKey = process.env.ADZUNA_API_KEY ?? '';

  if (!appId || !appKey) {
    logger.warn('adzuna_no_credentials');
    return { jobs: [], total: 0 };
  }

  const country = (params.country ?? 'us').toLowerCase();
  const qs = new URLSearchParams({
    app_id: appId, app_key: appKey,
    what: params.query, results_per_page: String(params.pageSize ?? 20),
    page: String(params.page ?? 1),
    ...(params.location ? { where: params.location } : {}),
    content_type: 'application/json',
  });

  const { data } = await http.get(`/jobs/${country}/search/1?${qs}`);
  return { jobs: (data.results ?? []).map(normalise), total: data.count ?? 0 };
}
