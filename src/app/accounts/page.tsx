// src/app/accounts/page.tsx
import type { Metadata } from 'next';
import { listAccounts } from '@/lib/aws/dynamo';
import { formatCurrency } from '@/lib/analytics';
import { AddAccountPanel } from '@/components/forms/AddAccountPanel';
import type { Account } from '@/types';

export const metadata: Metadata = { title: 'Accounts' };
export const dynamic = 'force-dynamic';

const TYPE_ICON: Record<Account['type'], string> = {
  checking: '🏦', savings: '💰', credit: '💳', investment: '📈', cash: '💵',
};

function AccountCard({ acc }: { acc: Account }) {
  const isNeg = acc.balance < 0;
  return (
    <div className="card" style={{ padding: '22px 24px', display: 'flex',
      alignItems: 'center', gap: '16px' }}>
      {/* Color dot */}
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
        background: `${acc.color}22`,
        border: `1px solid ${acc.color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.3rem',
      }}>
        {TYPE_ICON[acc.type] ?? '◎'}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text)' }}>
          {acc.name}
        </div>
        <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: '2px' }}>
          {acc.type} · {acc.currency}
        </div>
      </div>

      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem',
        color: isNeg ? 'var(--red)' : 'var(--text)', letterSpacing: '-0.02em',
      }}>
        {formatCurrency(acc.balance, acc.currency)}
      </div>
    </div>
  );
}

export default async function AccountsPage() {
  let accounts: Account[] = [];
  try { accounts = await listAccounts(); } catch { /* render empty */ }

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: '32px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
          color: 'var(--text-faint)', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: '4px' }}>
          Accounts
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem',
          fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
          Your Accounts
        </h1>
        {accounts.length > 0 && (
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 0',
            fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>
            Net worth: <strong style={{ color: 'var(--text)' }}>
              {formatCurrency(totalBalance)}
            </strong>
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
        {/* Account list */}
        <div className="fade-up delay-1" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {accounts.length === 0 ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center',
              color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No accounts yet. Create one to get started.
            </div>
          ) : (
            accounts.map(acc => <AccountCard key={acc.id} acc={acc} />)
          )}
        </div>

        {/* Add account panel */}
        <div className="fade-up delay-2">
          <AddAccountPanel />
        </div>
      </div>
    </div>
  );
}
