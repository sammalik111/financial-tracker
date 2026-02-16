// src/app/explore/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchAllFieldIntelligence } from '@/lib/search';
import { competitionColor, opportunityColor, formatSalary } from '@/lib/intelligence';
import type { FieldIntelligence } from '@/types';

export const metadata: Metadata = { title: 'Explore Fields' };
export const dynamic = 'force-dynamic';

const COMPETITION_LABEL: Record<string, string> = {
  low: 'Low', medium: 'Medium', high: 'High', very_high: 'Very High',
};

function FieldRow({ f }: { f: FieldIntelligence }) {
  const compColor = competitionColor(f.competitionLevel);
  const oppColor  = opportunityColor(f.opportunityScore);
  const topDeg    = f.degreeBreakdown[0];

  return (
    <Link href={`/field?name=${encodeURIComponent(f.field)}`}
      style={{ display: 'contents', textDecoration: 'none' }}>
      <tr style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        {/* Field name */}
        <td style={{ padding: '14px 16px', fontWeight: 500, color: 'var(--text)',
          whiteSpace: 'nowrap' }}>
          <div>{f.field}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
            color: 'var(--text-faint)', marginTop: '2px' }}>
            {f.growthTrend === 'growing' ? '↑' : f.growthTrend === 'declining' ? '↓' : '→'}{' '}
            {f.trendPct > 0 ? '+' : ''}{f.trendPct}% vs last month
          </div>
        </td>

        {/* Openings */}
        <td style={{ padding: '14px 12px', fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem', color: 'var(--text)', textAlign: 'right' }}>
          {f.totalOpenings.toLocaleString()}
        </td>

        {/* Applicants / role */}
        <td style={{ padding: '14px 12px', fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem', color: compColor, textAlign: 'right' }}>
          {f.applicantsPerOpening}
        </td>

        {/* Competition */}
        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
          <span style={{ padding: '3px 9px', borderRadius: '3px',
            fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
            color: compColor, background: `${compColor}18`,
            border: `1px solid ${compColor}28` }}>
            {COMPETITION_LABEL[f.competitionLevel]}
          </span>
        </td>

        {/* Top degree */}
        <td style={{ padding: '14px 12px', fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center',
          textTransform: 'capitalize' }}>
          {topDeg ? `${topDeg.label} (${topDeg.pct}%)` : '—'}
        </td>

        {/* Avg salary */}
        <td style={{ padding: '14px 12px', fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem', color: 'var(--text)', textAlign: 'right' }}>
          {f.avgSalary ? formatSalary(f.avgSalary) : '—'}
        </td>

        {/* Remote */}
        <td style={{ padding: '14px 12px', fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>
          {Math.round(f.remoteRatio * 100)}%
        </td>

        {/* Opportunity score */}
        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem',
            fontWeight: 700, color: oppColor }}>{f.opportunityScore}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
            color: 'var(--text-faint)', marginLeft: '3px' }}>/100</span>
        </td>
      </tr>
    </Link>
  );
}

export default async function ExplorePage() {
  let fields: FieldIntelligence[] = [];
  try { fields = await fetchAllFieldIntelligence(); } catch { /* empty */ }

  const sorted = [...fields].sort((a, b) => b.opportunityScore - a.opportunityScore);

  return (
    <div>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: '28px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
          color: 'var(--accent)', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: '8px' }}>
          Field Intelligence · {fields.length} fields tracked
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: '2rem', color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Explore All Fields
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '6px' }}>
          Sorted by opportunity score. Click any field for full breakdown.
        </p>
      </div>

      {/* Legend */}
      <div className="fade-up d1" style={{ display: 'flex', gap: '20px', marginBottom: '18px',
        flexWrap: 'wrap' }}>
        {[
          { color: 'var(--green)', label: 'Low competition' },
          { color: 'var(--amber)', label: 'Medium' },
          { color: 'var(--red)',   label: 'High' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {label}
            </span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
          color: 'var(--text-faint)' }}>
          Opp. Score: 0 = avoid · 100 = apply now
        </div>
      </div>

      {/* Table */}
      <div className="card fade-up d2" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-mid)' }}>
              {['Field', 'Openings', 'Applicants/Role', 'Competition',
                'Top Degree', 'Avg Salary', 'Remote', 'Opp. Score'].map((h, i) => (
                <th key={h} style={{
                  padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                  fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: 'var(--text-faint)', textAlign: i >= 1 ? 'right' : 'left',
                  whiteSpace: 'nowrap',
                  ...(i === 3 || i === 4 ? { textAlign: 'center' as const } : {}),
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(f => <FieldRow key={f.field} f={f} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
