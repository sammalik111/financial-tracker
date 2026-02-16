// src/app/dashboard/page.tsx
import type { Metadata } from 'next';
import { listTransactions, listAccounts } from '@/lib/aws/dynamo';
import { buildDashboardSummary, formatCurrency } from '@/lib/analytics';
import { DashboardCharts } from '@/components/charts/DashboardCharts';
import { TransactionRow } from '@/components/ui/TransactionRow';
import type { DashboardSummary } from '@/types';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

function StatCard({
  label, value, sub, chipClass, delay,
}: {
  label: string; value: string; sub?: string; chipClass?: string; delay?: number;
}) {
  return (
    <div className={`card fade-up delay-${delay ?? 1}`} style={{ padding: '24px' }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'var(--text-muted)', marginBottom: '10px',
      }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '1.85rem',
        fontWeight: 800, lineHeight: 1, color: 'var(--text)',
      }}>{value}</div>
      {sub && (
        <div style={{ marginTop: '8px' }}>
          <span className={`${chipClass ?? 'chip-blue'}`}
            style={{ fontSize: '0.72rem', padding: '2px 8px', fontFamily: 'var(--font-mono)' }}>
            {sub}
          </span>
        </div>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  let summary: DashboardSummary | null = null;
  let error = false;

  try {
    const [txs, accs] = await Promise.all([
      listTransactions(undefined, 500),
      listAccounts(),
    ]);
    summary = buildDashboardSummary(txs, accs);
  } catch {
    error = true;
  }

  if (error || !summary) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
        ⚠ Could not reach database. Check your DynamoDB tables and IAM role.
      </div>
    );
  }

  const netChip = summary.monthNet >= 0
    ? { cls: 'chip-green', label: `+${formatCurrency(summary.monthNet)} net` }
    : { cls: 'chip-red',   label: `${formatCurrency(summary.monthNet)} net` };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: '36px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
          color: 'var(--text-faint)', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: '6px' }}>
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem',
          fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
          Overview
        </h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
        gap: '16px', marginBottom: '32px' }}>
        <StatCard delay={1} label="Total Balance"
          value={formatCurrency(summary.totalBalance)} chipClass="chip-blue"
          sub={`${summary.accounts.length} account${summary.accounts.length !== 1 ? 's' : ''}`} />
        <StatCard delay={2} label="Income This Month"
          value={formatCurrency(summary.monthIncome)} chipClass="chip-green"
          sub="this month" />
        <StatCard delay={3} label="Expenses This Month"
          value={formatCurrency(summary.monthExpenses)} chipClass="chip-red"
          sub="this month" />
        <StatCard delay={4} label="Net This Month"
          value={formatCurrency(Math.abs(summary.monthNet))}
          chipClass={netChip.cls} sub={netChip.label} />
      </div>

      {/* Charts (client-side hydration) */}
      <div className="fade-up delay-5">
        <DashboardCharts summary={summary} />
      </div>

      {/* Recent transactions */}
      <div className="card fade-up" style={{ marginTop: '28px', padding: '24px', animationDelay: '320ms', opacity: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>
            Recent Transactions
          </h2>
          <a href="/transactions" style={{ fontSize: '0.8rem', color: 'var(--accent)',
            textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
            view all →
          </a>
        </div>
        {summary.recentTransactions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '24px 0' }}>
            No transactions yet.{' '}
            <a href="/transactions" style={{ color: 'var(--accent)' }}>Add one →</a>
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {summary.recentTransactions.map(tx => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
