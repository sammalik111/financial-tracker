// src/app/transactions/page.tsx
import type { Metadata } from 'next';
import { listTransactions, listAccounts } from '@/lib/aws/dynamo';
import { TransactionRow } from '@/components/ui/TransactionRow';
import { AddTransactionPanel } from '@/components/forms/AddTransactionPanel';
import type { Account, Transaction } from '@/types';

export const metadata: Metadata = { title: 'Transactions' };
export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  let transactions: Transaction[] = [];
  let accounts: Account[] = [];

  try {
    [transactions, accounts] = await Promise.all([
      listTransactions(undefined, 200),
      listAccounts(),
    ]);
  } catch { /* render empty */ }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
            color: 'var(--text-faint)', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: '4px' }}>
            Ledger
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem',
            fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
            Transactions
          </h1>
        </div>
      </div>

      {/* Two-column layout: list + add panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

        {/* Transaction list */}
        <div className="card fade-up delay-1" style={{ padding: '8px' }}>
          {transactions.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center',
              color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No transactions yet. Add your first one →
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)}
            </div>
          )}
        </div>

        {/* Add transaction panel */}
        <div className="fade-up delay-2">
          <AddTransactionPanel accounts={accounts} />
        </div>
      </div>
    </div>
  );
}
