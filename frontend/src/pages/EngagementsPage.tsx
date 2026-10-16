import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Engagement {
  id: string;
  clientName: string;
  name: string;
  engagementOwner: string;
  engagementType: string;
  periodType: string;
  status: string;
  agreedBaseFees: string;
  contingentFees: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

const STATUS_META: Record<string, { label: string; dot: string }> = {
  draft: { label: 'Draft', dot: '#7C8780' },
  submitted: { label: 'Submitted', dot: '#D9A441' },
  approved: { label: 'Approved', dot: '#3FA85E' },
  rejected: { label: 'Rejected', dot: '#E0805C' },
  modified: { label: 'Modified', dot: '#B76BA3' },
};

const TABS = ['all', 'draft', 'submitted', 'approved'] as const;

function formatCurrency(n: string | number): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function EngagementsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/engagements')
      .then(r => r.json())
      .then(d => { if (d.success) setEngagements(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeTab === 'all'
    ? engagements
    : engagements.filter(e => e.status === activeTab);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 500, lineHeight: 1.3, color: 'var(--text)' }}>Engagements</h1>
          <p style={{ fontSize: '12px', color: 'var(--faint)', marginTop: '2px' }}>{engagements.length} engagement{engagements.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          style={{
            background: 'var(--accent-btn)',
            color: '#fff',
            fontSize: '12px',
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          + New Engagement
        </button>
      </div>

      {/* Filter tabs */}
      <div
        className="flex items-center gap-0.5 mb-4"
        style={{
          background: 'var(--panel)',
          borderRadius: '6px',
          padding: '3px',
          border: '1px solid var(--line)',
          display: 'inline-flex',
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              fontSize: '12px',
              padding: '6px 22px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === tab ? '#1A1E1C' : 'transparent',
              color: activeTab === tab ? '#E8ECE9' : '#9AA59D',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {tab === 'all' ? 'All' : STATUS_META[tab]?.label || tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: 'var(--panel)',
          borderRadius: '10px',
          border: '1px solid var(--line)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--faint)', fontSize: '12px' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--faint)', fontSize: '12px' }}>No engagements found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Engagement', 'Client', 'Owner', 'Fee', 'Period', 'Dates', 'Status'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: 'var(--faint)',
                      textAlign: 'left',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const fee = parseFloat(e.agreedBaseFees || '0') + parseFloat(e.contingentFees || '0');
                const meta = STATUS_META[e.status] || { label: e.status, dot: '#7C8780' };
                return (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/engagements/${e.id}`)}
                    style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{e.name}</td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--muted)' }}>{e.clientName}</td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--muted)' }}>{e.engagementOwner}</td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text)', fontFeatureSettings: '"tnum" 1' }}>{formatCurrency(fee)}</td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--faint)', textTransform: 'capitalize' }}>{e.periodType}</td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--faint)' }}>{formatDate(e.startDate)} – {formatDate(e.endDate)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="flex items-center gap-1.5" style={{ fontSize: '12px', color: 'var(--text)' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                        {meta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
