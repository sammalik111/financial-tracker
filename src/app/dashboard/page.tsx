// src/app/dashboard/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchAllFieldIntelligence } from '@/lib/search';
import { buildMarketOverview, competitionColor, opportunityColor, formatSalary } from '@/lib/intelligence';
import { MarketCharts } from '@/components/charts/MarketCharts';
import type { MarketOverview } from '@/types';

export const metadata: Metadata = { title: 'Market Overview' };
export const dynamic = 'force-dynamic';

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <div className="stat-label" style={{ marginBottom: '8px' }}>{label}</div>
      <div className="stat-value" style={{ color: color ?? 'var(--text)', fontSize: '1.6rem' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '5px',
        fontFamily: 'var(--font-mono)' }}>{sub}</div>}
    </div>
  );
}

function OpportunityCard({ field, rank }: { field: MarketOverview['topOpportunities'][0]; rank: number }) {
  const oppColor = opportunityColor(field.opportunityScore);
  const compColor = competitionColor(
    field.competitionScore < 30 ? 'low' : field.competitionScore < 60 ? 'medium' : 'high'
  );

  return (
    <Link href={`/field?name=${encodeURIComponent(field.field)}`}
      style={{ textDecoration: 'none', display: 'block' }}>
      <div className="card" style={{ padding: '18px 20px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
        {/* Rank watermark */}
        <span style={{ position: 'absolute', top: '10px', right: '14px',
          fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 700,
          color: 'var(--text-faint)', opacity: 0.15, lineHeight: 1 }}>
          #{rank}
        </span>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '4px' }}>
              {field.field}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {field.totalOpenings.toLocaleString()} openings · {field.applicantsPerOpening} applicants/role
            </div>
          </div>
          {/* Opportunity score */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700,
              color: oppColor, lineHeight: 1 }}>{field.opportunityScore}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
              color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              opp. score
            </div>
          </div>
        </div>

        {/* Why good */}
        {field.whyGoodOpportunity.length > 0 && (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '12px' }}>
            {field.whyGoodOpportunity.map((r, i) => (
              <li key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ color: 'var(--green)', flexShrink: 0, marginTop: '1px' }}>✓</span>
                {r}
              </li>
            ))}
          </ul>
        )}

        {/* Bottom row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {field.avgSalary && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
              color: 'var(--green)', background: 'var(--green-dim)',
              border: '1px solid rgba(0,214,143,0.2)', padding: '2px 7px', borderRadius: '3px' }}>
              {formatSalary(field.avgSalary)} avg
            </span>
          )}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
            color: compColor, background: `${compColor}18`,
            border: `1px solid ${compColor}30`, padding: '2px 7px', borderRadius: '3px' }}>
            {field.competitionScore < 30 ? 'Low' : field.competitionScore < 60 ? 'Med' : 'High'} competition
          </span>
          {field.entryLevelPct > 25 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
              color: 'var(--blue)', background: 'var(--blue-dim)',
              border: '1px solid rgba(76,126,255,0.2)', padding: '2px 7px', borderRadius: '3px' }}>
              {field.entryLevelPct}% entry-level
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  let overview: MarketOverview | null = null;
  let error = false;

  try {
    const fields = await fetchAllFieldIntelligence();
    overview = buildMarketOverview(fields);
  } catch { error = true; }

  if (error || !overview) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center',
        fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        ⚠ Could not load market data. Check your Adzuna API credentials in SSM.
      </div>
    );
  }

  return (
    <div>
      {/* Hero header */}
      <div className="fade-up" style={{ marginBottom: '36px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--accent)',
          letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Live Market Intelligence · Updated {new Date().toLocaleTimeString()}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', color: 'var(--text)',
          letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '10px' }}>
          Where are your best odds<br />
          <span style={{ color: 'var(--accent)' }}>right now?</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '520px' }}>
          We analyse applicant-to-opening ratios, degree requirements, and growth trends
          across {overview.totalFields} fields to surface where you&apos;re most likely to
          stand out.
        </p>
      </div>

      {/* Stat cards */}
      <div className="fade-up d1" style={{ display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '12px', marginBottom: '28px' }}>
        <StatCard label="Total Openings" value={overview.totalOpenings.toLocaleString()} sub="across all fields" />
        <StatCard label="Fields Tracked" value={String(overview.totalFields)} sub="canonical fields" />
        <StatCard label="Avg Applicants / Role" value={String(overview.avgApplicantsPerJob)} sub="market average" />
        <StatCard label="Most Competitive" value={overview.mostCompetitiveField.split(' ')[0]}
          sub={overview.mostCompetitiveField} color="var(--red)" />
        <StatCard label="Best Opportunity" value={overview.leastCompetitiveField.split(' ')[0]}
          sub={overview.leastCompetitiveField} color="var(--green)" />
        <StatCard label="Fastest Growing" value={overview.fastestGrowingField.split(' ')[0]}
          sub={overview.fastestGrowingField} color="var(--blue)" />
      </div>

      {/* Charts */}
      <div className="fade-up d2" style={{ marginBottom: '36px' }}>
        <MarketCharts fields={overview.allFields} />
      </div>

      {/* Top opportunities grid */}
      <div className="fade-up d3">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem' }}>
            Top Opportunities
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 400,
              color: 'var(--text-muted)', marginLeft: '10px' }}>
              lowest competition · highest upside
            </span>
          </h2>
          <Link href="/explore" className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>
            Explore all →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '12px' }}>
          {overview.topOpportunities.map((f, i) => (
            <div key={f.field} className={`fade-up d${Math.min(i + 2, 6)}`} style={{ opacity: 0 }}>
              <OpportunityCard field={f} rank={i + 1} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
