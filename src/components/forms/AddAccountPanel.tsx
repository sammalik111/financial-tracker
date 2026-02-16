'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const COLORS = ['#6366F1','#22C55E','#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899','#14B8A6'];

export function AddAccountPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'checking', balance: '', currency: 'USD', color: COLORS[0],
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setError(null); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, balance: parseFloat(form.balance || '0') }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) { setError(json.error ?? 'Something went wrong'); return; }
    setSuccess(true);
    setForm({ name: '', type: 'checking', balance: '', currency: 'USD', color: COLORS[0] });
    router.refresh();
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem',
        fontWeight: 700, margin: '0 0 20px', color: 'var(--text)' }}>
        New Account
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        <div>
          <label className="label">Account Name</label>
          <input className="input" type="text" placeholder="e.g. Chase Checking"
            value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>

        <div>
          <label className="label">Account Type</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
            {['checking','savings','credit','investment','cash'].map(t => (
              <option key={t} value={t} style={{ textTransform: 'capitalize' }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Starting Balance</label>
          <input className="input" type="number" step="0.01" placeholder="0.00"
            value={form.balance} onChange={e => set('balance', e.target.value)} />
        </div>

        <div>
          <label className="label">Currency</label>
          <select className="input" value={form.currency} onChange={e => set('currency', e.target.value)}>
            {['USD','EUR','GBP','CAD','AUD','JPY'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="label" style={{ marginBottom: '8px' }}>Color</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <button key={c} type="button" title={c}
                onClick={() => set('color', c)}
                style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: c, border: `2px solid ${form.color === c ? '#fff' : 'transparent'}`,
                  cursor: 'pointer', transition: 'border-color 180ms ease',
                  boxShadow: form.color === c ? `0 0 0 2px ${c}66` : 'none',
                }} />
            ))}
          </div>
        </div>

        {error && (
          <div style={{ fontSize: '0.8rem', color: 'var(--red)', fontFamily: 'var(--font-mono)',
            padding: '10px 12px', background: 'var(--red-dim)', borderRadius: '6px' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ fontSize: '0.8rem', color: 'var(--green)', fontFamily: 'var(--font-mono)',
            padding: '10px 12px', background: 'var(--green-dim)', borderRadius: '6px' }}>
            ✓ Account created
          </div>
        )}

        <button type="submit" className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}>
          {loading ? 'Creating…' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}
