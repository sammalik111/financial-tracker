// src/types/index.ts

export type DegreeLevel = 'none' | 'associate' | 'bachelor' | 'master' | 'phd' | 'unknown';
export type CompetitionLevel = 'low' | 'medium' | 'high' | 'very_high';

// ── Raw job listing from upstream APIs ───────────────────────────────────────

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  field: string;           // normalised field e.g. "Software Engineering"
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  url: string;
  postedAt: string;        // ISO
  source: 'adzuna' | 'jsearch' | 'cached';
  remote?: boolean;
  contractType?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
}

// ── Intelligence: per-field market analysis ───────────────────────────────────

export interface DegreeBreakdown {
  level: DegreeLevel;
  label: string;
  count: number;
  pct: number;             // 0–100
}

export interface FieldIntelligence {
  field: string;
  totalOpenings: number;
  applicantsToday: number;
  applicantsTotal: number;
  applicantsPerOpening: number;   // competition ratio
  competitionLevel: CompetitionLevel;
  competitionScore: number;       // 0–100, lower = easier to get in
  opportunityScore: number;       // 0–100, higher = better opportunity
  degreeBreakdown: DegreeBreakdown[];
  topRequiredDegree: DegreeLevel;
  avgSalary: number | null;
  salaryRange: { min: number; max: number } | null;
  remoteRatio: number;            // 0–1
  growthTrend: 'growing' | 'stable' | 'declining';
  trendPct: number;               // % change vs last month
  topCompanies: string[];
  topLocations: string[];
  entryLevelPct: number;          // % of jobs accessible without experience
  lastUpdated: string;
}

// ── Underrepresentation analysis ─────────────────────────────────────────────

export interface OpportunityField {
  field: string;
  opportunityScore: number;
  competitionScore: number;
  totalOpenings: number;
  applicantsPerOpening: number;
  avgSalary: number | null;
  topDegreeRequired: DegreeLevel;
  entryLevelPct: number;
  whyGoodOpportunity: string[];   // human-readable reasons
}

// ── Dashboard summary ─────────────────────────────────────────────────────────

export interface MarketOverview {
  totalOpenings: number;
  totalFields: number;
  avgApplicantsPerJob: number;
  mostCompetitiveField: string;
  leastCompetitiveField: string;
  fastestGrowingField: string;
  topOpportunities: OpportunityField[];   // top 10 underrepresented fields
  allFields: FieldIntelligence[];
  lastUpdated: string;
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchParams {
  query: string;
  field?: string;
  location?: string;
  country?: string;
  remote?: boolean;
  page?: number;
  pageSize?: number;
}

export interface SearchResponse {
  jobs: JobListing[];
  totalCount: number;
  intelligence?: FieldIntelligence;   // inline field intel for the searched field
  fromCache: boolean;
  durationMs: number;
  partial: boolean;
  sources: string[];
}

// ── API envelopes ─────────────────────────────────────────────────────────────

export interface ApiOk<T> { ok: true; data: T }
export interface ApiErr   { ok: false; error: string; code?: string }
export type ApiRes<T> = ApiOk<T> | ApiErr;
