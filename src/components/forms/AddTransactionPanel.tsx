'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Account } from '@/types';

const CATEGORIES = [
  'housing','food','transport','utilities','health',
  'entertainment','shopping','savings','salary','investment','freelance','other',
];

interface Props { accounts: Account[]; }

export function AddTransactionPanel({ accounts }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    accountId:   accounts[0]?.id ?? '',
    type:        'expense' as 'income' | 'expense',
    category:    'other',
    amount:      '',
    description: '',
    date:        new Date().toISOString().slice(0, 10),
    notes:       '',
  });

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    setError(null);
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.accountId) { setError('Please add an account first.'); return; }

    setLoading(true);
    setError(null);

    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    const json = await res.json();

    setLoading(false);

    if (!json.ok) {
      setError(json.error ?? 'Something went wrong');
      return;
    }

    setSuccess(true);
    setForm(f => ({ ...f, amount: '', description: '', notes: '' }));
    router.refresh();
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem',
        fontWeight: 700, margin: '0 0 20px', color: 'var(--text)' }}>
        Add Transaction
      </h2>

      {accounts.length === 0 && (
        <div style={{ padding: '12px 14px', background: 'var(--amber-dim)',
          border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px',
          fontSize: '0.8rem', color: 'var(--amber)', marginBottom: '16px',
          fontFamily: 'var(--font-mono)' }}>
          ⚠ Create an account first
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Type toggle */}
        <div>
          <div className="label">Type</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['income', 'expense'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => set('type', t)}
                style={{
                  flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer',
                  border: `1px solid ${form.type === t
                    ? (t === 'income' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)')
                    : 'var(--border)'}`,
                  background: form.type === t
                    ? (t === 'income' ? 'var(--green-dim)' : 'var(--red-dim)')
                    : 'var(--bg-raised)',
                  color: form.type === t
                    ? (t === 'income' ? 'var(--green)' : 'var(--red)')
                    : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)', fontWeight: 500,
                  fontSize: '0.825rem', textTransform: 'capitalize',
                  transition: 'all 180ms ease',
                }}>
                {t === 'income' ? '↑ Income' : '↓ Expense'}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="label">Amount (USD)</label>
          <input className="input" type="number" min="0.01" step="0.01"
            placeholder="0.00" value={form.amount}
            onChange={e => set('amount', e.target.value)} required />
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <input className="input" type="text" placeholder="e.g. Netflix subscription"
            value={form.description}
            onChange={e => set('description', e.target.value)} required />
        </div>

        {/* Category */}
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category}
            onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c} value={c} style={{ textTransform: 'capitalize' }}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Account */}
        <div>
          <label className="label">Account</label>
          <select className="input" value={form.accountId}
            onChange={e => set('accountId', e.target.value)}
            disabled={accounts.length === 0}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={form.date}
            onChange={e => set('date', e.target.value)} required />
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input" rows={2} placeholder="Any additional context…"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            style={{ resize: 'none' }} />
        </div>

        {/* Error / success */}
        {error && (
          <div style={{ fontSize: '0.8rem', color: 'var(--red)',
            fontFamily: 'var(--font-mono)', padding: '10px 12px',
            background: 'var(--red-dim)', borderRadius: '6px' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ fontSize: '0.8rem', color: 'var(--green)',
            fontFamily: 'var(--font-mono)', padding: '10px 12px',
            background: 'var(--green-dim)', borderRadius: '6px' }}>
            ✓ Transaction added
          </div>
        )}

        <button type="submit" className="btn btn-primary"
          disabled={loading || accounts.length === 0}
          style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}>
          {loading ? 'Saving…' : 'Add Transaction'}
        </button>
      </form>
    </div>
  );
}
