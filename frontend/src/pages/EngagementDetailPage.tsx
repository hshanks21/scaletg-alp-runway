import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';

interface EngagementDetail {
  id: string;
  clientName: string;
  name: string;
  engagementOwner: string;
  status: string;
  agreedBaseFees: string;
  contingentFees: string;
  startDate: string;
  endDate: string;
  periodType: string;
  tasks: any[];
}

const STATUS_META: Record<string, { label: string; dot: string }> = {
  draft: { label: 'Draft', dot: '#7C8780' },
  submitted: { label: 'Submitted', dot: '#D9A441' },
  approved: { label: 'Approved', dot: '#3FA85E' },
  rejected: { label: 'Rejected', dot: '#E0805C' },
  modified: { label: 'Modified', dot: '#B76BA3' },
};

type ViewTab = 'budget' | 'bva' | 'checkpoints';

function formatCurrency(n: string | number): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

export function EngagementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [engagement, setEngagement] = useState<EngagementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>(
    location.pathname.includes('budget-vs-actual') ? 'bva' : 'budget'
  );

  useEffect(() => {
    if (!id) return;
    fetch(`/api/engagements/${id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setEngagement(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#848D86', fontSize: '12px' }}>Loading...</div>;
  }

  if (!engagement) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#E0805C', fontSize: '12px' }}>Engagement not found.</div>;
  }

  const fee = parseFloat(engagement.agreedBaseFees || '0') + parseFloat(engagement.contingentFees || '0');
  const meta = STATUS_META[engagement.status] || { label: engagement.status, dot: '#7C8780' };

  const tabs: { key: ViewTab; label: string }[] = [
    { key: 'budget', label: 'Budget' },
    { key: 'bva', label: 'Budget vs. Actual' },
    { key: 'checkpoints', label: 'Checkpoints' },
  ];

  return (
    <div>
      {/* Project header */}
      <div
        className="flex items-center justify-between mb-4"
        style={{
          background: '#141716',
          borderRadius: '10px',
          padding: '14px 20px',
          border: '1px solid rgba(232,240,234,0.07)',
        }}
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: '16px', fontWeight: 500, color: '#E8ECE9' }}>{engagement.name}</h1>
            <span style={{ fontSize: '12px', color: '#848D86' }}>·</span>
            <span style={{ fontSize: '12px', color: '#9AA59D' }}>{engagement.clientName}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1.5" style={{ fontSize: '12px', color: '#E8ECE9' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
              {meta.label}
            </span>
            <span style={{ fontSize: '12px', color: '#848D86' }}>·</span>
            <span style={{ fontSize: '12px', color: '#848D86' }}>{formatCurrency(fee)} Fixed Fee</span>
            <span style={{ fontSize: '12px', color: '#848D86' }}>·</span>
            <span style={{ fontSize: '12px', color: '#848D86', textTransform: 'capitalize' }}>{engagement.periodType}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {engagement.status === 'draft' && (
            <button
              style={{
                background: '#1D8837',
                color: '#fff',
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Submit for Approval
            </button>
          )}
          {engagement.status === 'submitted' && (
            <>
              <button
                style={{
                  background: '#1D8837',
                  color: '#fff',
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Approve
              </button>
              <button
                style={{
                  background: 'transparent',
                  color: '#E0805C',
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(232,240,234,0.13)',
                  cursor: 'pointer',
                }}
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* View tabs */}
      <div
        className="flex items-center gap-0.5 mb-5"
        style={{
          background: '#141716',
          borderRadius: '6px',
          padding: '3px',
          border: '1px solid rgba(232,240,234,0.07)',
          display: 'inline-flex',
        }}
      >
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              fontSize: '12px',
              padding: '6px 22px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === tab.key ? '#1A1E1C' : 'transparent',
              color: activeTab === tab.key ? '#E8ECE9' : '#9AA59D',
              borderBottom: activeTab === tab.key ? '2px solid #3FA85E' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'budget' && <BudgetView engagement={engagement} />}
      {activeTab === 'bva' && <BvaView engagementId={engagement.id} />}
      {activeTab === 'checkpoints' && <CheckpointsView engagementId={engagement.id} />}
    </div>
  );
}

// ── Budget View (Task → Resource → Hours grid) ──

function BudgetView({ engagement }: { engagement: EngagementDetail }) {
  return (
    <div>
      {/* KPI summary line */}
      <div
        style={{
          background: '#141716',
          borderRadius: '10px',
          padding: '12px 20px',
          border: '1px solid rgba(232,240,234,0.07)',
          marginBottom: '14px',
          fontSize: '12px',
          color: '#9AA59D',
        }}
      >
        <span style={{ fontWeight: 500, color: '#E8ECE9' }}>
          {engagement.tasks?.length || 0} tasks
        </span>
        {' · '}
        {engagement.tasks?.reduce((s: number, t: any) => s + (t.allocations?.length || 0), 0) || 0} resources allocated
        {' · KPIs loading...'}
      </div>

      {/* Tasks + Allocations */}
      <div
        style={{
          background: '#141716',
          borderRadius: '10px',
          border: '1px solid rgba(232,240,234,0.07)',
          overflow: 'hidden',
        }}
      >
        {(!engagement.tasks || engagement.tasks.length === 0) ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#848D86', fontSize: '12px' }}>
            No tasks yet. Click "+ Add Task" to start building the budget.
          </div>
        ) : (
          engagement.tasks.map((task: any) => (
            <div key={task.id} style={{ borderBottom: '1px solid rgba(232,240,234,0.07)' }}>
              {/* Task header */}
              <div
                className="flex items-center justify-between"
                style={{ padding: '10px 20px', background: '#1A1E1C' }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '12px', color: '#3FA85E' }}>▼</span>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#E8ECE9' }}>{task.name}</span>
                  <span style={{ fontSize: '11px', color: '#848D86' }}>
                    (est: {task.estimatedHours || 0}h → alloc: {task.allocatedHours?.toFixed(0) || 0}h)
                  </span>
                </div>
              </div>

              {/* Allocations */}
              {task.allocations?.map((alloc: any) => (
                <div
                  key={alloc.id}
                  className="flex items-center"
                  style={{
                    padding: '8px 20px 8px 40px',
                    borderBottom: '1px solid rgba(232,240,234,0.04)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ width: '200px', color: '#E8ECE9' }}>
                    {alloc.resourceName || 'Unknown'}
                    <div style={{ fontSize: '11px', color: '#848D86' }}>
                      {alloc.categoryName} · ${parseFloat(alloc.standardRate || 0).toLocaleString()} std / ${parseFloat(alloc.engagementRate || 0).toLocaleString()} eng
                    </div>
                  </div>
                  <div className="flex gap-1 flex-1">
                    {alloc.periods?.map((p: any) => (
                      <div
                        key={p.id}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          padding: '4px',
                          background: parseFloat(p.hours) > 0 ? 'rgba(63,168,94,0.08)' : 'transparent',
                          borderRadius: '4px',
                          color: parseFloat(p.hours) > 0 ? '#E8ECE9' : '#7C8780',
                          fontFeatureSettings: '"tnum" 1',
                        }}
                      >
                        {parseFloat(p.hours) || '—'}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Add Resource */}
              <div style={{ padding: '6px 20px 6px 40px' }}>
                <button style={{ fontSize: '11px', color: '#3FA85E', background: 'none', border: 'none', cursor: 'pointer' }}>
                  + Add Resource
                </button>
              </div>
            </div>
          ))
        )}

        {/* Add Task */}
        <div style={{ padding: '10px 20px', borderTop: '1px dashed rgba(232,240,234,0.07)' }}>
          <button style={{ fontSize: '11px', color: '#3FA85E', background: 'none', border: 'none', cursor: 'pointer' }}>
            + Add Task
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BvA View (placeholder — workers will build this) ──

function BvaView({ engagementId }: { engagementId: string }) {
  return (
    <div
      style={{
        background: '#141716',
        borderRadius: '10px',
        padding: '40px',
        border: '1px solid rgba(232,240,234,0.07)',
        textAlign: 'center',
        color: '#848D86',
        fontSize: '12px',
      }}
    >
      Budget vs. Actual view will render here.
      <br />
      <span style={{ color: '#9AA59D', fontSize: '11px' }}>Resource × Period grid with Budget / Actuals / Forecast rows</span>
    </div>
  );
}

// ── Checkpoints View (placeholder — workers will build this) ──

function CheckpointsView({ engagementId }: { engagementId: string }) {
  return (
    <div
      style={{
        background: '#141716',
        borderRadius: '10px',
        padding: '40px',
        border: '1px solid rgba(232,240,234,0.07)',
        textAlign: 'center',
        color: '#848D86',
        fontSize: '12px',
      }}
    >
      Checkpoints will render here.
      <br />
      <span style={{ color: '#9AA59D', fontSize: '11px' }}>Submitted / Approved / Modified snapshots with comparison</span>
    </div>
  );
}
