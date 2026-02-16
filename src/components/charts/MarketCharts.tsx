'use client';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar, Cell, LabelList } from 'recharts';
import type { FieldIntelligence } from '@/types';
import { competitionColor } from '@/lib/intelligence';

const TT = { background: '#1A1E2E', border: '1px solid rgba(99,119,180,0.22)',
  borderRadius: '6px', color: '#E2E8F8', fontFamily: 'Space Grotesk', fontSize: '12px' };

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
      textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)',
      marginBottom: '14px' }}>
      {children}
    </div>
  );
}

export function MarketCharts({ fields }: { fields: FieldIntelligence[] }) {
  const scatterData = fields.map(f => ({
    x: f.competitionScore,
    y: f.opportunityScore,
    name: f.field,
    openings: f.totalOpenings,
  }));

  const barData = [...fields]
    .sort((a, b) => b.applicantsPerOpening - a.applicantsPerOpening)
    .slice(0, 12)
    .map(f => ({ field: f.field.split(' ')[0], applicants: f.applicantsPerOpening,
      level: f.competitionLevel }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

      {/* Scatter: Competition vs Opportunity */}
      <div className="card" style={{ padding: '20px' }}>
        <SectionHead>Competition Score vs Opportunity Score (per field)</SectionHead>
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,119,180,0.07)" />
            <XAxis type="number" dataKey="x" name="Competition" domain={[0, 100]}
              label={{ value: 'Competition →', position: 'insideBottom', offset: -2,
                fill: 'var(--text-faint)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              tick={{ fontSize: 9, fill: 'var(--text-faint)', fontFamily: 'JetBrains Mono' }}
              tickLine={false} axisLine={false} />
            <YAxis type="number" dataKey="y" name="Opportunity" domain={[0, 100]}
              label={{ value: 'Opportunity ↑', angle: -90, position: 'insideLeft',
                fill: 'var(--text-faint)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              tick={{ fontSize: 9, fill: 'var(--text-faint)', fontFamily: 'JetBrains Mono' }}
              tickLine={false} axisLine={false} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={TT}
              formatter={(val: number, name: string) => [`${val}`, name === 'x' ? 'Competition' : 'Opportunity']}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ''} />
            <Scatter data={scatterData} fill="var(--accent)" opacity={0.8}
              shape={(props: any) => {
                const { cx, cy, payload } = props;
                const color = payload.y > 60 ? 'var(--green)' : payload.y > 40 ? 'var(--amber)' : 'var(--accent)';
                const size  = Math.max(5, Math.min(14, payload.openings / 3));
                return <circle cx={cx} cy={cy} r={size} fill={color} fillOpacity={0.75} stroke="none" />;
              }} />
          </ScatterChart>
        </ResponsiveContainer>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)',
          marginTop: '6px', textAlign: 'center' }}>
          ● size = number of openings · top-left quadrant = best opportunity
        </div>
      </div>

      {/* Bar: Applicants per opening */}
      <div className="card" style={{ padding: '20px' }}>
        <SectionHead>Applicants per Opening (lower = less competition)</SectionHead>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,119,180,0.07)" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false}
              tick={{ fontSize: 9, fill: 'var(--text-faint)', fontFamily: 'JetBrains Mono' }} />
            <YAxis type="category" dataKey="field" width={90} tickLine={false} axisLine={false}
              tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'Space Grotesk' }} />
            <Tooltip contentStyle={TT} formatter={(v: number) => [`${v} applicants/role`, '']} />
            <Bar dataKey="applicants" radius={[0, 3, 3, 0]} maxBarSize={18}>
              <LabelList dataKey="applicants" position="right"
                style={{ fontSize: '9px', fontFamily: 'JetBrains Mono', fill: 'var(--text-faint)' }} />
              {barData.map((entry, i) => (
                <Cell key={i} fill={competitionColor(entry.level as any)} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
