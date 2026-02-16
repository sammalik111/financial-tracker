'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard',     icon: '▦', label: 'Dashboard'    },
  { href: '/transactions',  icon: '⇄', label: 'Transactions' },
  { href: '/accounts',      icon: '◎', label: 'Accounts'     },
];

export function SideNav() {
  const path = usePathname();

  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 0',
      position: 'sticky',
      top: 0,
      height: '100vh',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 24px 32px' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.4rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{
            width: '28px', height: '28px',
            background: 'var(--accent)',
            borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9rem',
          }}>₣</span>
          FinTrack
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map(({ href, icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: active ? 500 : 400,
              color: active ? 'var(--text)' : 'var(--text-muted)',
              background: active ? 'var(--bg-raised)' : 'transparent',
              borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 180ms ease',
            }}>
              <span style={{ fontSize: '1rem', opacity: active ? 1 : 0.5 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Health dot */}
      <div style={{ padding: '0 24px 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="pulse-dot" style={{
          width: '7px', height: '7px',
          borderRadius: '50%',
          background: 'var(--green)',
          display: 'inline-block',
        }} />
        <a href="/api/health" target="_blank" rel="noreferrer" style={{
          fontSize: '0.72rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-faint)',
          textDecoration: 'none',
        }}>
          health
        </a>
      </div>
    </aside>
  );
}
