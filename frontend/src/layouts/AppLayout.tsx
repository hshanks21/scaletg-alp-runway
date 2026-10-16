import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Simulated user roles for the "View as" switcher
const DEMO_USERS = [
  { name: 'Marc Brown', role: 'PMD', filter: 'owner' },
  { name: 'Sarah Chen', role: 'Partner', filter: 'owner' },
  { name: 'Strategic Finance', role: 'Finance', filter: 'all' },
  { name: 'Approver', role: 'Approver', filter: 'approver' },
];

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

  useEffect(() => {
    fetch('/api/engagements')
      .then(r => r.json())
      .then(d => { if (d.success) setEngagements(d.data); })
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ padding: '20px', background: '#0D0F0E' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0"
        style={{
          width: '210px',
          background: '#141716',
          borderRadius: '14px',
          marginRight: '10px',
          padding: '14px',
          borderRight: '1px solid rgba(232,240,234,0.07)',
        }}
      >
        {/* Wordmark */}
        <div className="mb-6" style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', color: '#E8ECE9' }}>
          RUNWAY
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 mb-6">
          <SidebarItem to="/engagements" label="Engagements" active={location.pathname === '/' || location.pathname.startsWith('/engagements')} />
        </nav>

        {/* Engagement list */}
        <div className="flex-1 overflow-y-auto">
          <div className="mb-2" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#9AA59D', textTransform: 'uppercase' }}>
            Engagements
          </div>
          <div className="flex flex-col gap-0.5">
            {engagements
              .filter(e => currentUser.filter === 'all' || e.engagementOwner === currentUser.name)
              .map(e => (
                <NavLink
                  key={e.id}
                  to={`/engagements/${e.id}`}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-2 py-1.5 rounded-md text-data transition-colors ${
                      isActive
                        ? 'bg-grove-slate-leaf text-grove-mist'
                        : 'text-grove-sage hover:bg-grove-bench-hover'
                    }`
                  }
                >
                  <span className="truncate text-xs">{e.name}</span>
                  <StatusDot status={e.status} />
                </NavLink>
              ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0" style={{ background: '#0D0F0E', borderRadius: '14px' }}>
        {/* Top bar */}
        <header
          className="flex items-center justify-between shrink-0"
          style={{
            height: '48px',
            padding: '0 14px',
            background: '#141716',
            borderRadius: '14px 14px 0 0',
            borderBottom: '1px solid rgba(232,240,234,0.07)',
          }}
        >
          {/* Left — logo */}
          <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', color: '#E8ECE9', width: '160px' }}>
            RUNWAY
          </div>

          {/* Center — search */}
          <div className="flex-1 flex justify-center">
            <div
              className="flex items-center gap-2"
              style={{
                background: '#141716',
                border: '1px solid rgba(232,240,234,0.13)',
                borderRadius: '8px',
                padding: '5px 12px',
                width: '100%',
                maxWidth: '440px',
                fontSize: '12px',
                color: '#848D86',
              }}
            >
              <span>🔍</span>
              <span>Search engagements...</span>
              <span className="ml-auto" style={{ fontSize: '11px', opacity: 0.5 }}>⌘K</span>
            </div>
          </div>

          {/* Right — user switcher */}
          <div className="relative" style={{ width: '160px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors hover:bg-grove-bench-hover"
              style={{ fontSize: '12px', color: '#E8ECE9' }}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                style={{ background: '#1A1E1C', border: '1.5px solid #0D0F0E', color: '#9AA59D' }}>
                {currentUser.name[0]}
              </span>
              <span>{currentUser.name}</span>
              <span style={{ fontSize: '10px', color: '#848D86' }}>▾</span>
            </button>

            {userMenuOpen && (
              <div
                className="absolute top-full right-0 mt-1 z-50"
                style={{
                  background: '#141716',
                  border: '1px solid rgba(232,240,234,0.13)',
                  borderRadius: '8px',
                  padding: '4px',
                  minWidth: '180px',
                  boxShadow: '-16px 0 40px rgba(0,0,0,.4)',
                }}
              >
                <div className="px-3 py-1.5" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#9AA59D', textTransform: 'uppercase' }}>
                  View as
                </div>
                {DEMO_USERS.map(u => (
                  <button
                    key={u.name}
                    onClick={() => { setCurrentUser(u); setUserMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 rounded-sm transition-colors hover:bg-grove-bench-hover"
                    style={{
                      fontSize: '12px',
                      color: u.name === currentUser.name ? '#3FA85E' : '#E8ECE9',
                    }}
                  >
                    {u.name} <span style={{ color: '#848D86' }}>({u.role})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto" style={{ padding: '20px' }}>
          <Outlet context={{ currentUser }} />
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <NavLink
      to={to}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
        active
          ? 'bg-grove-slate-leaf text-grove-mist'
          : 'text-grove-sage hover:bg-grove-bench-hover'
      }`}
      style={{ fontSize: '12.5px' }}
    >
      {label}
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
