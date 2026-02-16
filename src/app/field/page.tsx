// src/app/field/page.tsx
import type { Metadata } from 'next';
import { searchJobs } from '@/lib/search';
import { buildFieldIntelligence, competitionColor, opportunityColor, formatSalary } from '@/lib/intelligence';
import { FieldCharts } from '@/components/charts/FieldCharts';
import type { FieldIntelligence } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }: { searchParams: { name?: string } }): Promise<Metadata> {
  return { title: searchParams.name ? `${searchParams.name} Intelligence` : 'Field Intelligence' };
}

function DegreeBar({ label, pct, count, color }: { label: string; pct: number; count: number; color: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {count} roles · {pct}%
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const DEG_COLORS = ['#4C7EFF','#00D68F','#FFB020','#A855F7','#FF4D6A','#64748B'];

export default async function FieldPage({ searchParams }: { searchParams: { name?: string } }) {
  const fieldName = decodeURIComponent(searchParams.name ?? 'Software Engineering');

  let intel: FieldIntelligence | null = null;
  try {
    const result = await searchJobs({ query: fieldName, pageSize: 30 });
    intel = result.intelligence ?? buildFieldIntelligence(fieldName, result.jobs);
  } catch { /* empty */ }

  if (!intel) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center',
        fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
        Could not load intelligence for &quot;{fieldName}&quot;.
      </div>
    );
  }

  const compColor = competitionColor(intel.competitionLevel);
  const oppColor  = opportunityColor(intel.opportunityScore);

  const compLabel: Record<string, string> = {
    low: 'Low Competition', medium: 'Medium Competition',
    high: 'High Competition', very_high: 'Very High Competition',
  };

  return (
    <div>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: '32px' }}>
        <a href="/explore" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
          color: 'var(--text-faint)', textDecoration: 'none',
          display: 'inline-block', marginBottom: '12px' }}>
          ← All Fields
        </a>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '2rem', color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '8px' }}>
              {intel.field}
            </h1>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ padding: '3px 10px', borderRadius: '3px', fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)', color: compColor, background: `${compColor}18`,
                border: `1px solid ${compColor}28` }}>
                {compLabel[intel.competitionLevel]}
              </span>
              <span style={{ padding: '3px 10px', borderRadius: '3px', fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
                background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                {intel.growthTrend === 'growing' ? '↑' : intel.growthTrend === 'declining' ? '↓' : '→'}{' '}
                {intel.growthTrend} · {intel.trendPct > 0 ? '+' : ''}{intel.trendPct}% MoM
              </span>
            </div>
          </div>
          {/* Opportunity score hero */}
          <div style={{ textAlign: 'center', background: 'var(--bg-card)',
            border: `2px solid ${oppColor}40`, borderRadius: '12px', padding: '16px 24px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem',
              fontWeight: 700, color: oppColor, lineHeight: 1 }}>
              {intel.opportunityScore}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
              color: 'var(--text-faint)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginTop: '4px' }}>
              Opportunity Score
            </div>
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="fade-up d1" style={{ display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))',
        gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Total Openings',       value: intel.totalOpenings.toLocaleString(),  color: undefined },
          { label: 'Applicants Today',      value: intel.applicantsToday.toLocaleString(), color: undefined },
          { label: 'Total Applicants',      value: intel.applicantsTotal.toLocaleString(), color: undefined },
          { label: 'Applicants / Opening',  value: String(intel.applicantsPerOpening),    color: compColor },
          { label: 'Avg Salary',            value: intel.avgSalary ? formatSalary(intel.avgSalary) : 'N/A', color: 'var(--green)' },
          { label: 'Remote Jobs',           value: `${Math.round(intel.remoteRatio * 100)}%`, color: undefined },
          { label: 'Entry Level',           value: `${intel.entryLevelPct}%`,              color: 'var(--blue)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: '16px 18px' }}>
            <div className="stat-label" style={{ marginBottom: '6px' }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem',
              fontWeight: 700, color: color ?? 'var(--text)', lineHeight: 1 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Main grid: degree breakdown + charts */}
      <div className="fade-up d2" style={{ display: 'grid',
        gridTemplateColumns: '340px 1fr', gap: '20px', alignItems: 'start' }}>

        {/* Degree breakdown — this is the LinkedIn-style section */}
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'var(--text-faint)', marginBottom: '16px' }}>
            Degree Breakdown
            <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>← LinkedIn-style</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: 1.5 }}>
            Distribution of education levels required across all <strong style={{ color: 'var(--text)' }}>
              {intel.totalOpenings}</strong> openings in {intel.field}.
          </p>

          {intel.degreeBreakdown.length > 0 ? (
            intel.degreeBreakdown.map((d, i) => (
              <DegreeBar key={d.level} label={d.label} pct={d.pct}
                count={d.count} color={DEG_COLORS[i % DEG_COLORS.length]} />
            ))
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
              Insufficient data for degree breakdown.
            </p>
          )}

          {/* Insight callout */}
          {intel.topRequiredDegree !== 'unknown' && (
            <div style={{ marginTop: '18px', padding: '12px 14px',
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              💡 <strong style={{ color: 'var(--text)' }}>Most common requirement:</strong>{' '}
              {intel.degreeBreakdown[0]?.label ?? 'Not specified'} ({intel.degreeBreakdown[0]?.pct ?? 0}% of postings).
              {intel.entryLevelPct > 25 && ` ${intel.entryLevelPct}% of roles are entry-level — good for career changers.`}
            </div>
          )}

          {/* Top companies */}
          {intel.topCompanies.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: 'var(--text-faint)', marginBottom: '10px' }}>
                Top Hiring Companies
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {intel.topCompanies.map(c => (
                  <span key={c} style={{ padding: '3px 8px', borderRadius: '3px',
                    fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)', background: 'var(--bg-raised)',
                    border: '1px solid var(--border)' }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Charts */}
        <FieldCharts intel={intel} />
      </div>
    </div>
  );
}
