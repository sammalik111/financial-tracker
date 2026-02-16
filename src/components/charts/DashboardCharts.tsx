'use client';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { DashboardSummary } from '@/types';
import { formatCurrency } from '@/lib/analytics';
import { format, parseISO } from 'date-fns';

const GREEN  = '#22C55E';
const RED    = '#EF4444';
const BLUE   = '#6366F1';
const COLORS = ['#6366F1','#22C55E','#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899','#14B8A6'];

const TT_STYLE = {
  background: '#1E1E2E', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px', color: '#F0F0F8', fontFamily: 'IBM Plex Sans',
  fontSize: '13px', padding: '10px 14px',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
      color: 'var(--text)', margin: '0 0 18px',
      paddingBottom: '10px', borderBottom: '1px solid var(--border)',
    }}>{children}</h2>
  );
}

export function DashboardCharts({ summary }: { summary: DashboardSummary }) {
  const trendData = summary.monthlyTrend.map(m => ({
    ...m,
    label: format(parseISO(`${m.month}-01`), 'MMM'),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Row 1: bar + line */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Income vs Expenses bar chart */}
        <div className="card" style={{ padding: '24px' }}>
          <SectionTitle>Income vs Expenses</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false}
                tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: '#7A7A9A' }} />
              <YAxis tickLine={false} axisLine={false} width={48}
                tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: '#7A7A9A' }}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TT_STYLE}
                formatter={(v: number, name: string) => [formatCurrency(v), name]} />
              <Bar dataKey="income"   name="Income"   fill={GREEN} radius={[3,3,0,0]} maxBarSize={24} />
              <Bar dataKey="expenses" name="Expenses" fill={RED}   radius={[3,3,0,0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Net line chart */}
        <div className="card" style={{ padding: '24px' }}>
          <SectionTitle>Monthly Net</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false}
                tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: '#7A7A9A' }} />
              <YAxis tickLine={false} axisLine={false} width={48}
                tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: '#7A7A9A' }}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TT_STYLE}
                formatter={(v: number) => [formatCurrency(v), 'Net']} />
              <Line type="monotone" dataKey="net" stroke={BLUE} strokeWidth={2.5}
                dot={{ r: 4, fill: BLUE, stroke: '#0A0A0F', strokeWidth: 2 }}
                activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: spending by category */}
      {summary.categoryBreakdown.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Pie chart */}
          <div className="card" style={{ padding: '24px' }}>
            <SectionTitle>Spending by Category</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={summary.categoryBreakdown} dataKey="amount" nameKey="category"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {summary.categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: '#7A7A9A' }} />
                <Tooltip contentStyle={TT_STYLE}
                  formatter={(v: number) => [formatCurrency(v), 'Spent']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category breakdown list */}
          <div className="card" style={{ padding: '24px' }}>
            <SectionTitle>Top Categories</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {summary.categoryBreakdown.slice(0, 6).map((cat, i) => (
                <div key={cat.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.82rem', marginBottom: '4px' }}>
                    <span style={{ textTransform: 'capitalize', color: 'var(--text)' }}>
                      {cat.category}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {formatCurrency(cat.amount)} · {cat.pct}%
                    </span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--bg-raised)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${cat.pct}%`, height: '100%',
                      background: COLORS[i % COLORS.length],
                      borderRadius: '2px',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
