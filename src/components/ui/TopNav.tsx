'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/explore',   label: 'Explore Fields' },
];

export function TopNav() {
  const path = usePathname();
  return (
    <header style={{ background: 'rgba(12,14,20,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '0 28px',
        height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '26px', height: '26px', background: 'var(--accent)',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
            JS
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Job<span style={{ color: 'var(--accent)' }}>Signal</span>
          </span>
        </Link>

        <nav style={{ display: 'flex', gap: '4px' }}>
          {NAV.map(({ href, label }) => {
            const active = path.startsWith(href);
            return (
              <Link key={href} href={href} style={{
                padding: '5px 12px', borderRadius: '5px', textDecoration: 'none',
                fontSize: '0.85rem', fontWeight: active ? 600 : 400,
                color: active ? 'var(--text)' : 'var(--text-muted)',
                background: active ? 'var(--bg-raised)' : 'transparent',
                transition: 'all var(--t)',
              }}>{label}</Link>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--green)', display: 'block',
            boxShadow: '0 0 6px var(--green)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-faint)' }}>
            LIVE
          </span>
        </div>
      </div>
    </header>
  );
}
