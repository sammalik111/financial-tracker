// src/lib/upstream/jsearch.ts
//
// JSearch (RapidAPI) client — aggregates LinkedIn, Indeed, Glassdoor, ZipRecruiter, etc.
// Sign up at https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
// Set RAPIDAPI_KEY in your environment.

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { logger } from '@/lib/logger';
import { normaliseField, inferExperienceLevel } from '@/lib/intelligence';
import type { JobListing, SearchParams, DegreeLevel } from '@/types';

const TIMEOUT  = parseInt(process.env.HTTP_TIMEOUT_MS  ?? '8000');
const RETRIES  = parseInt(process.env.HTTP_RETRY_COUNT ?? '3');
const BASE_URL = 'https://jsearch.p.rapidapi.com';

const http = axios.create({ baseURL: BASE_URL, timeout: TIMEOUT });
axiosRetry(http, {
  retries: RETRIES,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: e => axiosRetry.isNetworkError(e) || (e.response?.status ?? 0) >= 500,
  onRetry: (n, e) => { logger.warn('jsearch_retry', { attempt: n, status: e.response?.status }); },
});

// ── JSearch response shapes ───────────────────────────────────────────────────

interface JSearchEducation {
  postgraduate_degree?: boolean;
  professional_certification?: boolean;
  high_school?: boolean;
  associates_degree?: boolean;
  bachelors_degree?: boolean;
  degree_mentioned?: boolean;
}

interface JSearchExperience {
  no_experience_required?: boolean;
  required_experience_in_months?: number | null;
  experience_mentioned?: boolean;
}

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_is_remote?: boolean;
  job_apply_link?: string;
  job_description?: string;
  job_posted_at_datetime_utc?: string;
  job_posted_at_timestamp?: number;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_currency?: string | null;
  job_salary_period?: string | null;
  job_employment_type?: string;
  job_publisher?: string;
  job_required_education?: JSearchEducation;
  job_required_experience?: JSearchExperience;
  job_naics_name?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// JSearch provides structured education data — much more accurate than text parsing.
function inferDegreeFromStruct(edu?: JSearchEducation): DegreeLevel | null {
  if (!edu || !edu.degree_mentioned) return null;
  if (edu.postgraduate_degree) return 'master';
  if (edu.bachelors_degree)    return 'bachelor';
  if (edu.associates_degree)   return 'associate';
  if (edu.high_school)         return 'none';
  return null;
}

function buildLocation(job: JSearchJob): string {
  return [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ');
}

// JSearch may return hourly/weekly/monthly salaries — normalize to annual.
function toAnnual(amount: number | null | undefined, period?: string | null): number | undefined {
  if (!amount) return undefined;
  switch (period) {
    case 'HOUR':  return Math.round(amount * 2080);   // 40 hrs × 52 weeks
    case 'WEEK':  return Math.round(amount * 52);
    case 'MONTH': return Math.round(amount * 12);
    default:      return Math.round(amount);           // assume annual
  }
}

function normalise(r: JSearchJob): JobListing {
  const field       = normaliseField(r.job_title, r.job_naics_name ?? undefined);
  const description = r.job_description ?? '';
  const period      = r.job_salary_period ?? undefined;
  const postedAt    = r.job_posted_at_datetime_utc
    ?? (r.job_posted_at_timestamp
        ? new Date(r.job_posted_at_timestamp * 1000).toISOString()
        : new Date().toISOString());

  return {
    id:              `jsearch-${r.job_id}`,
    title:           r.job_title,
    company:         r.employer_name ?? 'Unknown',
    location:        buildLocation(r),
    field,
    salaryMin:       toAnnual(r.job_min_salary, period),
    salaryMax:       toAnnual(r.job_max_salary, period),
    description,
    url:             r.job_apply_link ?? '',
    postedAt,
    source:          'jsearch',
    remote:          r.job_is_remote ?? /remote/i.test(r.job_title + description),
    contractType:    r.job_employment_type,
    experienceLevel: inferExperienceLevel(r.job_title, description),
    degreeHint:      inferDegreeFromStruct(r.job_required_education) ?? undefined,
  };
}

// ── Public fetch function ─────────────────────────────────────────────────────

export async function fetchJSearch(params: SearchParams): Promise<{ jobs: JobListing[]; total: number }> {
  const apiKey = process.env.RAPIDAPI_KEY ?? '';

  if (!apiKey) {
    logger.warn('jsearch_no_credentials');
    return { jobs: [], total: 0 };
  }

  const query = params.location
    ? `${params.query} in ${params.location}`
    : params.query;

  const qs = new URLSearchParams({
    query,
    page:       String(params.page ?? 1),
    num_pages:  '1',
    date_posted: 'month',
    ...(params.country  ? { country: params.country.toUpperCase() }  : {}),
    ...(params.remote   ? { remote_jobs_only: 'true' }               : {}),
  });

  const { data } = await http.get(`/search?${qs}`, {
    headers: {
      'X-RapidAPI-Key':  apiKey,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
  });

  if (data.status !== 'OK' || !Array.isArray(data.data)) {
    logger.warn('jsearch_bad_response', { status: data.status });
    return { jobs: [], total: 0 };
  }

  const jobs = (data.data as JSearchJob[]).map(normalise);
  logger.debug('jsearch_fetched', { query, count: jobs.length });
  return { jobs, total: jobs.length };
}
