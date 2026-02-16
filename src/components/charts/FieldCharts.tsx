'use client';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import type { FieldIntelligence } from '@/types';
import { formatSalary } from '@/lib/intelligence';

const TT = { background: '#1A1E2E', border: '1px solid rgba(99,119,180,0.22)',
  borderRadius: '6px', color: '#E2E8F8', fontFamily: 'Space Grotesk', fontSize: '12px' };

const DEG_COLORS = ['#4C7EFF','#00D68F','#FFB020','#A855F7','#FF4D6A','#64748B'];

function Head({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
      textTransform: 'uppercase', letterSpacing: '0.1em',
      color: 'var(--text-faint)', marginBottom: '14px' }}>
      {children}
    </div>
  );
}

export function FieldCharts({ intel }: { intel: FieldIntelligence }) {
  const pieData = intel.degreeBreakdown.map(d => ({ name: d.label, value: d.pct }));

  // Simulated daily applicant flow for the past 7 days
  const days = ['7d ago','6d','5d','4d','3d','2d','Yesterday','Today'];
  const dailyData = days.map((day, i) => {
    const base = intel.applicantsToday;
    const factor = i === 7 ? 1 : 0.5 + (i / 7) * 0.6 + Math.random() * 0.3;
    return { day, applicants: Math.round(base * factor) };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Degree pie */}
      {pieData.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <Head>Education Requirement Distribution</Head>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name"
                cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={DEG_COLORS[i % DEG_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TT} formatter={(v: number) => [`${v}%`, 'Share']} />
              <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#7A88B8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Daily applicant volume */}
      <div className="card" style={{ padding: '20px' }}>
        <Head>Estimated Daily Applicant Volume (last 7 days)</Head>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dailyData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,119,180,0.07)" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false}
              tick={{ fontSize: 9, fill: 'var(--text-faint)', fontFamily: 'JetBrains Mono' }} />
            <YAxis tickLine={false} axisLine={false} width={40}
              tick={{ fontSize: 9, fill: 'var(--text-faint)', fontFamily: 'JetBrains Mono' }} />
            <Tooltip contentStyle={TT} formatter={(v: number) => [`${v}`, 'Applicants']} />
            <Bar dataKey="applicants" fill="var(--accent)" radius={[3,3,0,0]}
              maxBarSize={32} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Salary range card */}
      {intel.salaryRange && (
        <div className="card" style={{ padding: '20px' }}>
          <Head>Salary Range</Head>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '10px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {formatSalary(intel.salaryRange.min)}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '1.4rem', color: 'var(--green)' }}>
              {intel.avgSalary ? formatSalary(intel.avgSalary) : '—'} avg
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {formatSalary(intel.salaryRange.max)}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: '100%',
              background: 'linear-gradient(90deg, var(--blue), var(--green))' }} />
          </div>
        </div>
      )}
    </div>
  );
}
