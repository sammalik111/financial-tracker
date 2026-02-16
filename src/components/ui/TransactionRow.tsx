import type { Transaction } from '@/types';
import { formatCurrency } from '@/lib/analytics';

const CATEGORY_ICONS: Record<string, string> = {
  housing: '🏠', food: '🍔', transport: '🚗', utilities: '⚡',
  health: '❤️', entertainment: '🎬', shopping: '🛍', savings: '💰',
  salary: '💼', investment: '📈', freelance: '💻', other: '◦',
};

export function TransactionRow({ tx }: { tx: Transaction }) {
  const isIncome = tx.type === 'income';
  const icon = CATEGORY_ICONS[tx.category] ?? '◦';
  const dateStr = new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '10px 12px', borderRadius: '8px',
      transition: 'background 180ms ease', cursor: 'default',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-raised)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Icon bubble */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
        background: isIncome ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem',
      }}>{icon}</div>

      {/* Description + category */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500,
          color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden',
          textOverflow: 'ellipsis' }}>
          {tx.description}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)', textTransform: 'capitalize',
          marginTop: '1px' }}>
          {tx.category}
        </div>
      </div>

      {/* Date */}
      <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)',
        fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
        {dateStr}
      </div>

      {/* Amount */}
      <div style={{
        fontSize: '0.925rem', fontWeight: 600, flexShrink: 0,
        fontFamily: 'var(--font-mono)',
        color: isIncome ? 'var(--green)' : 'var(--red)',
      }}>
        {isIncome ? '+' : '−'}{formatCurrency(tx.amount)}
      </div>
    </div>
  );
}
