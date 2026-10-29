import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Search, Briefcase } from 'lucide-react';

// Simulated user roles for the "View as" switcher
const DEMO_USERS = [
  { name: 'Marc Brown', role: 'PMD', filter: 'owner' },
  { name: 'Sarah Chen', role: 'Partner', filter: 'owner' },
  { name: 'Strategic Finance', role: 'Finance', filter: 'all' },
  { name: 'Approver', role: 'Approver', filter: 'approver' },
];

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('runway-theme');
    return stored === 'light' ? 'light' : 'dark';
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'light' ? 'light' : '';
    localStorage.setItem('runway-theme', theme);
  }, [theme]);
  return { theme, toggle: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')) };
}

interface Engagement {
  id: string;
  name: string;
  clientName: string;
  status: string;
  engagementOwner: string;
}

export function AppLayout() {
  const [currentUser, setCurrentUser] = useState(DEMO_USERS[0]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const location = useLocation();
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    fetch('/api/engagements')
      .then(r => r.json())
      .then(d => { if (d.success) setEngagements(d.data); })
      .catch(() => {});
  }, []);

  const sidebarActive = location.pathname === '/' || location.pathname.startsWith('/engagements');

  return (
    /* .sky — radial glow, page padding */
    <div
      style={{
        position: 'relative',
        padding: '20px',
        height: '100vh',
        background: 'radial-gradient(900px 500px at 100% 0%, rgba(29,136,55,.07), transparent 65%)',
      }}
    >
      {/* .app — bordered, rounded shell */}
      <div
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--line)',
          borderRadius: '14px',
          background: 'var(--bg)',
          padding: '14px',
        }}
      >
        {/* .appbar — full-width top bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr minmax(0,440px) 1fr',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '14px',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifySelf: 'start',
              padding: '0 10px',
            }}
          >
            <img src="/logo-green-bg.svg" alt="RUNWAY" style={{ width: '40px', height: '40px' }} />
          </div>

          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '7px 10px',
              background: 'var(--panel)',
              width: '100%',
            }}
          >
            <Search size={14} style={{ color: 'var(--faint)', flex: 'none' }} />
            <input
              placeholder="Search engagements"
              aria-label="Search engagements"
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', font: 'inherit', fontSize: '12px', width: '100%' }}
            />
            <span
              style={{ fontSize: '11px', border: '1px solid var(--line-strong)', borderRadius: '4px', padding: '1px 5px', color: 'var(--faint)', whiteSpace: 'nowrap' }}
            >
              ⌘K
            </span>
          </div>

          {/* Right — user + theme toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px' }}>
            {/* User chip (with "View as" switcher) */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  background: 'var(--panel)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    display: 'inline-grid', placeItems: 'center',
                    fontSize: '11px', fontWeight: 600, color: '#fff',
                    background: 'var(--accent-btn)', border: '1.5px solid var(--bg)', flex: 'none',
                  }}
                >
                  {currentUser.name[0]}
                </span>
                <span>{currentUser.name.split(' ')[0]}</span>
              </button>

              {userMenuOpen && (
                <div
                  style={{
                    position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50,
                    background: 'var(--panel)', border: '1px solid var(--line-strong)',
                    borderRadius: '8px', padding: '4px', minWidth: '200px',
                  }}
                >
                  <div style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600, letterSpacing: '.05em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                    View as
                  </div>
                  {DEMO_USERS.map(u => (
                    <button
                      key={u.name}
                      onClick={() => { setCurrentUser(u); setUserMenuOpen(false); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px',
                        borderRadius: '4px', fontSize: '12px', background: 'none', border: 'none',
                        color: u.name === currentUser.name ? 'var(--accent)' : 'var(--text)', cursor: 'pointer',
                      }}
                    >
                      {u.name} <span style={{ color: 'var(--faint)' }}>({u.role})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme toggle switch */}
            <button
              onClick={toggleTheme}
              aria-label="Switch between light and dark theme"
              title="Switch theme"
              style={{
                padding: 0, width: '42px', height: '24px', flex: 'none',
                borderRadius: '20px', border: '1px solid var(--line-strong)',
                background: 'var(--panel)', position: 'relative', cursor: 'pointer',
              }}
            >
              <span
                style={{
                  position: 'absolute', top: '3px', left: theme === 'light' ? '21px' : '3px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: theme === 'light' ? 'var(--prog)' : 'var(--muted)',
                  transition: '.2s',
                }}
              />
            </button>
          </div>
        </div>

        {/* .grid — sidebar + main */}
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '210px minmax(0,1fr)', gap: '14px' }}>
          {/* .side — flat, right hairline only */}
          <aside
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              borderRight: '1px solid var(--line)',
              paddingRight: '12px',
              overflow: 'auto',
              minHeight: 0,
            }}
          >
            <SidebarItem icon={<Briefcase size={12} />} label="Engagements" active={sidebarActive} to="/engagements" />

            <div style={{ height: '1px', background: 'var(--line)', margin: '8px 0' }} />

            <div style={{ padding: '0 8px', fontSize: '11px', fontWeight: 600, letterSpacing: '.05em', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Engagements
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {engagements
                .filter(e => currentUser.filter === 'all' || e.engagementOwner === currentUser.name)
                .map(e => {
                  const active = location.pathname === `/engagements/${e.id}`;
                  return (
                    <NavLink
                      key={e.id}
                      to={`/engagements/${e.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '7px 8px', borderRadius: '7px', fontSize: '12.5px',
                        color: active ? 'var(--text)' : 'var(--muted)',
                        background: active ? 'var(--raised)' : 'transparent',
                        textDecoration: 'none',
                      }}
                    >
                      <span
                        style={{
                          width: '22px', height: '22px', flex: 'none', borderRadius: '5px',
                          display: 'grid', placeItems: 'center',
                          background: 'transparent', border: '1px solid var(--line-strong)',
                          color: 'var(--muted)', fontSize: '11px', fontWeight: 600,
                        }}
                      >
                        {e.name[0]?.toUpperCase()}
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {e.name}
                      </span>
                      <StatusDot status={e.status} />
                    </NavLink>
                  );
                })}
            </div>
          </aside>

          {/* .main */}
          <main style={{ overflow: 'auto', minHeight: 0, padding: '0 20px' }}>
            <Outlet context={{ currentUser }} />
          </main>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, to }: { icon: React.ReactNode; label: string; active: boolean; to: string }) {
  return (
    <NavLink
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '7px 8px', borderRadius: '7px', fontSize: '12.5px',
        color: active ? 'var(--text)' : 'var(--muted)',
        background: active ? 'var(--raised)' : 'transparent',
        textDecoration: 'none',
      }}
    >
      <span
        style={{
          width: '22px', height: '22px', flex: 'none', borderRadius: '5px',
          display: 'grid', placeItems: 'center',
          background: 'var(--raised)', color: active ? 'var(--accent)' : 'var(--muted)',
        }}
      >
        {icon}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </NavLink>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = {
    draft: '#7C8780',
    submitted: '#D9A441',
    approved: '#3FA85E',
    rejected: '#E0805C',
    modified: '#B76BA3',
  }[status] || '#7C8780';

  return <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />;
}
