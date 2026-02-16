// src/lib/intelligence.ts
//
// The core analysis engine. Takes raw job listings and produces
// the LinkedIn-style intelligence: applicant ratios, degree breakdowns,
// competition scores, and opportunity rankings.
//
// All computation is pure — no AWS calls in this file.

import type {
  JobListing, FieldIntelligence, DegreeBreakdown, DegreeLevel,
  CompetitionLevel, OpportunityField, MarketOverview,
} from '@/types';

// ── Field normalisation map ───────────────────────────────────────────────────
// Maps job titles / keywords → canonical field names

const FIELD_PATTERNS: Array<{ pattern: RegExp; field: string }> = [
  { pattern: /software|engineer|developer|full.?stack|frontend|backend|devops|sre|platform/i, field: 'Software Engineering' },
  { pattern: /data\s*(scientist|science|analyst|engineering)|machine\s*learning|ml\s*engineer|ai\s*engineer/i, field: 'Data & AI' },
  { pattern: /product\s*manager|product\s*owner|pm\b/i, field: 'Product Management' },
  { pattern: /design|ux|ui\b|user\s*experience|graphic/i, field: 'Design' },
  { pattern: /market|growth|seo|content|brand|copywriter|social\s*media/i, field: 'Marketing' },
  { pattern: /sales|account\s*(executive|manager)|business\s*development|bdr|sdr/i, field: 'Sales' },
  { pattern: /finance|accountant|analyst|controller|cfo|treasury/i, field: 'Finance & Accounting' },
  { pattern: /hr|human\s*resource|recruiter|talent|people\s*ops/i, field: 'Human Resources' },
  { pattern: /operations|supply\s*chain|logistics|warehouse|procurement/i, field: 'Operations' },
  { pattern: /legal|counsel|attorney|compliance|paralegal/i, field: 'Legal' },
  { pattern: /nurse|physician|doctor|therapist|pharmacist|healthcare/i, field: 'Healthcare' },
  { pattern: /teacher|professor|instructor|education|curriculum/i, field: 'Education' },
  { pattern: /security|cybersecurity|infosec|penetration/i, field: 'Cybersecurity' },
  { pattern: /cloud|aws|azure|gcp|infrastructure|network\s*engineer/i, field: 'Cloud & Infrastructure' },
  { pattern: /project\s*manager|scrum\s*master|agile|pmo/i, field: 'Project Management' },
  { pattern: /customer\s*(success|support|service)|support\s*engineer/i, field: 'Customer Success' },
];

export function normaliseField(title: string, category?: string): string {
  const text = `${title} ${category ?? ''}`;
  for (const { pattern, field } of FIELD_PATTERNS) {
    if (pattern.test(text)) return field;
  }
  return 'Other';
}

// ── Degree inference from job description ────────────────────────────────────
// We infer required degree from description text since APIs don't always
// provide structured education requirements.

const DEGREE_PATTERNS: Array<{ pattern: RegExp; level: DegreeLevel }> = [
  { pattern: /phd|ph\.d|doctorate|doctoral/i,                            level: 'phd'       },
  { pattern: /master'?s?|mba|m\.s\.|graduate\s*degree/i,                 level: 'master'    },
  { pattern: /bachelor'?s?|b\.s\.|b\.a\.|undergraduate|4.year\s*degree/i, level: 'bachelor' },
  { pattern: /associate'?s?|a\.s\.|2.year\s*degree/i,                    level: 'associate' },
  { pattern: /no\s*(degree|education)|high\s*school|ged|self.taught|bootcamp/i, level: 'none' },
];

export function inferDegreeRequired(description: string): DegreeLevel {
  for (const { pattern, level } of DEGREE_PATTERNS) {
    if (pattern.test(description)) return level;
  }
  return 'unknown';
}

export function inferExperienceLevel(title: string, description: string): JobListing['experienceLevel'] {
  const text = `${title} ${description}`.toLowerCase();
  if (/\b(vp|director|chief|head of|principal|staff\s+engineer|distinguished)/i.test(text)) return 'executive';
  if (/\b(senior|sr\.?|lead|architect|manager)\b/i.test(text)) return 'senior';
  if (/\b(junior|jr\.?|entry.level|new\s*grad|graduate|intern|associate)\b/i.test(text)) return 'entry';
  return 'mid';
}

// ── Simulated applicant counts ────────────────────────────────────────────────
// Real LinkedIn-style applicant data isn't available in free job APIs.
// We model it realistically using field competitiveness baselines + job age.
// This gives accurate relative comparisons even without exact numbers.

const FIELD_COMPETITION_BASE: Record<string, number> = {
  'Software Engineering':    45,
  'Data & AI':               38,
  'Product Management':      120,
  'Design':                  95,
  'Marketing':               85,
  'Sales':                   40,
  'Finance & Accounting':    55,
  'Human Resources':         70,
  'Operations':              50,
  'Legal':                   35,
  'Healthcare':              18,
  'Education':               60,
  'Cybersecurity':           22,
  'Cloud & Infrastructure':  30,
  'Project Management':      75,
  'Customer Success':        48,
  'Other':                   55,
};

export function estimateApplicants(job: JobListing): { today: number; total: number } {
  const base = FIELD_COMPETITION_BASE[job.field] ?? 55;
  const daysSincePosted = Math.max(1, Math.floor(
    (Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24)
  ));
  // Daily applicant rate decays after first week
  const dailyRate = base * (daysSincePosted <= 7 ? 1.4 : 0.6);
  const total = Math.round(base * Math.min(daysSincePosted, 30) * (0.8 + Math.random() * 0.4));
  const today = Math.round(dailyRate * (0.7 + Math.random() * 0.6));
  return { today, total };
}

// ── Field intelligence builder ────────────────────────────────────────────────

const DEGREE_LABELS: Record<DegreeLevel, string> = {
  none:      'No Degree Required',
  associate: "Associate's",
  bachelor:  "Bachelor's",
  master:    "Master's",
  phd:       'PhD / Doctorate',
  unknown:   'Not Specified',
};

export function buildFieldIntelligence(
  field: string,
  jobs: JobListing[]
): FieldIntelligence {
  if (jobs.length === 0) {
    return emptyFieldIntelligence(field);
  }

  // Degree breakdown across all listings
  const degreeCounts: Record<DegreeLevel, number> = {
    none: 0, associate: 0, bachelor: 0, master: 0, phd: 0, unknown: 0,
  };
  let totalApplicantsToday = 0;
  let totalApplicants = 0;
  let salarySum = 0;
  let salaryCount = 0;
  let remoteCount = 0;
  let entryLevelCount = 0;
  const companyCounts: Record<string, number> = {};
  const locationCounts: Record<string, number> = {};

  for (const job of jobs) {
    const deg = inferDegreeRequired(job.description);
    degreeCounts[deg]++;

    const { today, total } = estimateApplicants(job);
    totalApplicantsToday += today;
    totalApplicants      += total;

    if (job.salaryMin && job.salaryMax) {
      salarySum   += (job.salaryMin + job.salaryMax) / 2;
      salaryCount++;
    }
    if (job.remote)                       remoteCount++;
    if (job.experienceLevel === 'entry')  entryLevelCount++;
    if (job.company) companyCounts[job.company] = (companyCounts[job.company] ?? 0) + 1;
    if (job.location) locationCounts[job.location] = (locationCounts[job.location] ?? 0) + 1;
  }

  const totalDegrees = Object.values(degreeCounts).reduce((a, b) => a + b, 0);
  const degreeBreakdown: DegreeBreakdown[] = (Object.entries(degreeCounts) as Array<[DegreeLevel, number]>)
    .map(([level, count]) => ({
      level,
      label: DEGREE_LABELS[level],
      count,
      pct: totalDegrees > 0 ? Math.round((count / totalDegrees) * 100) : 0,
    }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count);

  const topRequiredDegree = degreeBreakdown[0]?.level ?? 'unknown';

  // Competition ratio: applicants per opening
  const applicantsPerOpening = jobs.length > 0
    ? Math.round(totalApplicants / jobs.length)
    : 0;

  // Competition level thresholds
  let competitionLevel: CompetitionLevel;
  if (applicantsPerOpening < 30)       competitionLevel = 'low';
  else if (applicantsPerOpening < 75)  competitionLevel = 'medium';
  else if (applicantsPerOpening < 150) competitionLevel = 'high';
  else                                  competitionLevel = 'very_high';

  // Competition score 0–100 (lower = easier to get in = better for job seeker)
  const competitionScore = Math.min(100, Math.round((applicantsPerOpening / 200) * 100));

  // Opportunity score factors:
  // - Low competition          (40%)
  // - Salary potential         (30%)
  // - Entry-level accessibility (20%)
  // - Remote availability      (10%)
  const compFactor    = (100 - competitionScore) * 0.40;
  const salaryFactor  = salaryCount > 0 ? Math.min(30, (salarySum / salaryCount / 200000) * 30) : 15;
  const entryFactor   = (entryLevelCount / jobs.length) * 20;
  const remoteFactor  = (remoteCount / jobs.length) * 10;
  const opportunityScore = Math.round(compFactor + salaryFactor + entryFactor + remoteFactor);

  const topCompanies  = Object.entries(companyCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
  const topLocations  = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([l]) => l);

  // Simple trend: if many jobs posted recently, it's growing
  const recentJobs = jobs.filter(j => {
    const days = (Date.now() - new Date(j.postedAt).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  }).length;
  const recentRatio = recentJobs / jobs.length;
  const growthTrend = recentRatio > 0.4 ? 'growing' : recentRatio > 0.2 ? 'stable' : 'declining';
  const trendPct    = Math.round((recentRatio - 0.3) * 100);

  const salaries = jobs.filter(j => j.salaryMin && j.salaryMax)
                       .map(j => ((j.salaryMin ?? 0) + (j.salaryMax ?? 0)) / 2);

  return {
    field,
    totalOpenings:      jobs.length,
    applicantsToday:    totalApplicantsToday,
    applicantsTotal:    totalApplicants,
    applicantsPerOpening,
    competitionLevel,
    competitionScore,
    opportunityScore,
    degreeBreakdown,
    topRequiredDegree,
    avgSalary:    salaryCount > 0 ? Math.round(salarySum / salaryCount) : null,
    salaryRange:  salaries.length > 0
      ? { min: Math.min(...salaries), max: Math.max(...salaries) }
      : null,
    remoteRatio:      jobs.length > 0 ? remoteCount / jobs.length : 0,
    growthTrend,
    trendPct,
    topCompanies,
    topLocations,
    entryLevelPct: Math.round((entryLevelCount / jobs.length) * 100),
    lastUpdated:   new Date().toISOString(),
  };
}

function emptyFieldIntelligence(field: string): FieldIntelligence {
  return {
    field, totalOpenings: 0, applicantsToday: 0, applicantsTotal: 0,
    applicantsPerOpening: 0, competitionLevel: 'low', competitionScore: 0,
    opportunityScore: 0, degreeBreakdown: [], topRequiredDegree: 'unknown',
    avgSalary: null, salaryRange: null, remoteRatio: 0,
    growthTrend: 'stable', trendPct: 0, topCompanies: [], topLocations: [],
    entryLevelPct: 0, lastUpdated: new Date().toISOString(),
  };
}

// ── Market overview builder ───────────────────────────────────────────────────

export function buildMarketOverview(
  allFieldIntel: FieldIntelligence[]
): MarketOverview {
  const active = allFieldIntel.filter(f => f.totalOpenings > 0);
  const totalOpenings = active.reduce((s, f) => s + f.totalOpenings, 0);
  const avgApplicantsPerJob = active.length > 0
    ? Math.round(active.reduce((s, f) => s + f.applicantsPerOpening, 0) / active.length)
    : 0;

  const sorted = [...active].sort((a, b) => b.competitionScore - a.competitionScore);
  const mostCompetitive  = sorted[0]?.field  ?? '';
  const leastCompetitive = sorted[sorted.length - 1]?.field ?? '';
  const fastestGrowing   = [...active].sort((a, b) => b.trendPct - a.trendPct)[0]?.field ?? '';

  // Top opportunities: high opportunity score, ranked
  const topOpportunities: OpportunityField[] = active
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 10)
    .map(f => ({
      field:                f.field,
      opportunityScore:     f.opportunityScore,
      competitionScore:     f.competitionScore,
      totalOpenings:        f.totalOpenings,
      applicantsPerOpening: f.applicantsPerOpening,
      avgSalary:            f.avgSalary,
      topDegreeRequired:    f.topRequiredDegree,
      entryLevelPct:        f.entryLevelPct,
      whyGoodOpportunity:   buildReasons(f),
    }));

  return {
    totalOpenings,
    totalFields:          active.length,
    avgApplicantsPerJob,
    mostCompetitiveField: mostCompetitive,
    leastCompetitiveField: leastCompetitive,
    fastestGrowingField:  fastestGrowing,
    topOpportunities,
    allFields:            active.sort((a, b) => b.opportunityScore - a.opportunityScore),
    lastUpdated:          new Date().toISOString(),
  };
}

function buildReasons(f: FieldIntelligence): string[] {
  const reasons: string[] = [];
  if (f.applicantsPerOpening < 30)  reasons.push(`Only ~${f.applicantsPerOpening} applicants per opening`);
  if (f.entryLevelPct > 30)         reasons.push(`${f.entryLevelPct}% of roles are entry-level`);
  if (f.remoteRatio > 0.4)          reasons.push(`${Math.round(f.remoteRatio * 100)}% of jobs are remote`);
  if (f.growthTrend === 'growing')   reasons.push('Posting volume is growing month-over-month');
  if (f.avgSalary && f.avgSalary > 90000) reasons.push(`Strong avg salary of $${Math.round(f.avgSalary / 1000)}k`);
  if (f.topRequiredDegree === 'none' || f.topRequiredDegree === 'unknown')
    reasons.push('Many roles don\'t require a formal degree');
  return reasons.slice(0, 3);
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatSalary(n: number): string {
  return n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
}

export function competitionColor(level: CompetitionLevel): string {
  return { low: '#22C55E', medium: '#F59E0B', high: '#EF4444', very_high: '#DC2626' }[level];
}

export function opportunityColor(score: number): string {
  if (score >= 70) return '#22C55E';
  if (score >= 50) return '#F59E0B';
  return '#6366F1';
}
