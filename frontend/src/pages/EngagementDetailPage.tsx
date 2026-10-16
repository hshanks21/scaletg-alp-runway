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

// ── BvA View — Resource × Period grid with Budget / Actuals / Forecast ──

interface BvAPeriod { start: string; end: string; }
interface BvAMetrics { hours: number; feesAtStd: number; feesAtEng: number; }
interface BvAPeriodData {
  periodStart: string;
  periodEnd: string;
  budget: BvAMetrics;
  actual: BvAMetrics;
  forecast: BvAMetrics;
}
interface BvAResource {
  resourceId: string;
  resourceName: string;
  categoryName: string;
  standardRate: string;
  engagementRate: string;
  isPlaceholder: boolean;
  region: string;
  idealHoursCoefficient: string;
  periods: BvAPeriodData[];
  totals: { budget: BvAMetrics; actual: BvAMetrics; forecast: BvAMetrics };
}
interface BvAResponse { engagement: any; periods: BvAPeriod[]; resources: BvAResource[]; }

const DOT_COLORS: Record<'budget' | 'actual' | 'forecast', string> = {
  budget: '#7C8780',   // stone
  actual: '#D9A441',   // amber
  forecast: '#3FA85E', // sprout
};

function fmtHours(h: number): string {
  if (!h) return '—';
  return (Math.round(h * 10) / 10).toFixed(1);
}
function fmtMoney(f: number): string {
  if (!f) return '—';
  return '$' + Math.round(f).toLocaleString('en-US');
}
function fmtVariance(v: number): string {
  if (Math.abs(v) < 0.05) return '0';
  const r = Math.round(v * 10) / 10;
  return `${v > 0 ? '+' : ''}${Number.isInteger(r) ? String(r) : r.toFixed(1)}`;
}

function BvaView({ engagementId }: { engagementId: string }) {
  const [data, setData] = useState<BvAResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!engagementId) return;
    fetch(`/api/engagements/${engagementId}/budget-vs-actual`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); else setError(d.error || 'Failed to load'); })
      .catch(() => setError('Failed to load BvA data'))
      .finally(() => setLoading(false));
  }, [engagementId]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#848D86', fontSize: '12px' }}>Loading…</div>;
  if (error || !data) return <div style={{ padding: '40px', textAlign: 'center', color: '#E0805C', fontSize: '12px' }}>{error || 'No BvA data'}</div>;

  const { periods, resources } = data;
  const periodType = data.engagement?.periodType;

  const periodLabel = (p: BvAPeriod, i: number): string => {
    if (periodType === 'monthly') {
      const d = new Date(`${p.start}T00:00:00`);
      return isNaN(d.getTime()) ? `P${i + 1}` : d.toLocaleString('en-US', { month: 'short' });
    }
    return `Wk ${i + 1}`;
  };

  // ── Engagement Details Summary (hours by consultant level) ──
  const levelOrder = ['PMD', 'Director', 'Consultant'];
  const levels = [...new Set([
    ...levelOrder.filter(l => resources.some(r => r.categoryName === l)),
    ...resources.map(r => r.categoryName).filter((c): c is string => !!c && !levelOrder.includes(c)),
  ])];
  const summary = levels.map(level => {
    const rs = resources.filter(r => r.categoryName === level);
    const sum = (k: 'budget' | 'actual' | 'forecast') => rs.reduce((s, r) => s + r.totals[k].hours, 0);
    const actual = sum('actual'), budget = sum('budget'), forecast = sum('forecast');
    return { level, actual, budget, forecast, variance: forecast - budget };
  });
  const totalActual = summary.reduce((s, x) => s + x.actual, 0);
  const totalBudget = summary.reduce((s, x) => s + x.budget, 0);
  const totalForecast = summary.reduce((s, x) => s + x.forecast, 0);

  // ── Grid totals (all resources per period) ──
  const gridTotal = periods.map(p => {
    const sum = (k: 'budget' | 'actual' | 'forecast', f: 'hours' | 'feesAtStd') =>
      resources.reduce((s, r) => s + (r.periods.find(rp => rp.periodStart === p.start)?.[k]?.[f] || 0), 0);
    return {
      budget: { hours: sum('budget', 'hours'), feesAtStd: sum('budget', 'feesAtStd') },
      actual: { hours: sum('actual', 'hours'), feesAtStd: sum('actual', 'feesAtStd') },
      forecast: { hours: sum('forecast', 'hours'), feesAtStd: sum('forecast', 'feesAtStd') },
    };
  });

  // style tokens
  const hairline = 'rgba(232,240,234,0.07)';
  const hairlineStrong = 'rgba(232,240,234,0.13)';
  const benchHover = '#1F2321';
  const tnum = { fontFeatureSettings: '"tnum" 1' } as const;

  const th: any = {
    fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
    color: '#848D86', padding: '6px 10px', borderBottom: `1px solid ${hairlineStrong}`, ...tnum,
  };
  const td: any = {
    fontSize: '12px', color: '#9AA59D', padding: '6px 10px', borderBottom: `1px solid ${hairline}`, ...tnum,
  };
  const dot = (k: 'budget' | 'actual' | 'forecast') => (
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: DOT_COLORS[k], display: 'inline-block' }} />
  );

  return (
    <div>
      {/* Engagement Details Summary */}
      <div style={{ background: '#141716', borderRadius: '10px', border: `1px solid ${hairline}`, padding: '14px 20px', marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9AA59D', marginBottom: '10px' }}>Engagement Details Summary</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Level</th>
              <th style={{ ...th, textAlign: 'right' }}>Actual</th>
              <th style={{ ...th, textAlign: 'right' }}>Budget</th>
              <th style={{ ...th, textAlign: 'right' }}>Forecast</th>
              <th style={{ ...th, textAlign: 'right' }}>Variance</th>
            </tr>
          </thead>
          <tbody>
            {summary.map(s => (
              <tr key={s.level} style={{ transition: 'background 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = benchHover; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <td style={{ fontSize: '12px', color: '#E8ECE9', padding: '6px 10px', borderBottom: `1px solid ${hairline}` }}>{s.level}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmtHours(s.actual)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmtHours(s.budget)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmtHours(s.forecast)}</td>
                <td style={{ ...td, textAlign: 'right', color: s.variance >= 0 ? '#3FA85E' : '#E0805C' }}>{fmtVariance(s.variance)}</td>
              </tr>
            ))}
            <tr>
              <td style={{ fontSize: '12px', fontWeight: 500, color: '#E8ECE9', padding: '6px 10px' }}>Total</td>
              <td style={{ ...td, textAlign: 'right', borderBottom: 'none', color: '#E8ECE9' }}>{fmtHours(totalActual)}</td>
              <td style={{ ...td, textAlign: 'right', borderBottom: 'none', color: '#E8ECE9' }}>{fmtHours(totalBudget)}</td>
              <td style={{ ...td, textAlign: 'right', borderBottom: 'none', color: '#E8ECE9' }}>{fmtHours(totalForecast)}</td>
              <td style={{ ...td, textAlign: 'right', borderBottom: 'none', color: '#E8ECE9' }}>{fmtVariance(totalForecast - totalBudget)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Resource × Period grid */}
      <div style={{ background: '#141716', borderRadius: '10px', border: `1px solid ${hairline}`, overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Resource</th>
              <th style={{ ...th, textAlign: 'left' }}>Title</th>
              <th style={{ ...th, textAlign: 'left' }}>Region</th>
              <th style={{ ...th, textAlign: 'right' }}>Rate (std)</th>
              <th style={{ ...th, textAlign: 'right' }}>Rate (eng)</th>
              {periods.map((p, i) => (
                <th key={`${p.start}-${i}`} colSpan={2} style={{ ...th, textAlign: 'center' }}>{periodLabel(p, i)}</th>
              ))}
            </tr>
            <tr>
              <th colSpan={5} style={{ borderBottom: `1px solid ${hairlineStrong}` }}></th>
              {periods.map((p, i) => (
                <th key={`${p.start}-${i}-sub`} colSpan={2} style={{ ...th, textAlign: 'center', padding: '2px 10px' }}>Hrs&nbsp;&nbsp;Fee</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map(r => {
              const std = `$${parseFloat(r.standardRate || '0').toLocaleString('en-US')}`;
              const eng = `$${parseFloat(r.engagementRate || '0').toLocaleString('en-US')}`;
              return (
                <>
                  {/* resource header */}
                  <tr key={r.resourceId} style={{ background: '#1A1E1C' }}>
                    <td style={{ fontSize: '12px', fontWeight: 500, color: '#E8ECE9', padding: '8px 10px' }}>{r.resourceName || 'Unknown'}</td>
                    <td style={{ fontSize: '12px', color: '#9AA59D', padding: '8px 10px' }}>{r.categoryName || '—'}</td>
                    <td style={{ fontSize: '12px', color: '#9AA59D', padding: '8px 10px' }}>{r.region || '—'}</td>
                    <td style={{ fontSize: '12px', color: '#9AA59D', textAlign: 'right', padding: '8px 10px', ...tnum }}>{std}</td>
                    <td style={{ fontSize: '12px', color: '#9AA59D', textAlign: 'right', padding: '8px 10px', ...tnum }}>{eng}</td>
                    {periods.map((p, i) => <td key={`${p.start}-${i}`} colSpan={2}></td>)}
                  </tr>
                  {/* budget / actuals / forecast sub-rows */}
                  {(['budget', 'actual', 'forecast'] as const).map(k => {
                    const label = k === 'budget' ? 'Budget' : k === 'actual' ? 'Actuals' : 'Forecast';
                    return (
                      <tr key={k} style={{ transition: 'background 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = benchHover; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <td colSpan={5} style={{ fontSize: '12px', color: '#9AA59D', padding: '6px 10px 6px 22px', borderBottom: `1px solid ${hairline}` }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{dot(k)}{label}</span>
                        </td>
                        {r.periods.map(pd => (
                          <>
                            <td key={`${pd.periodStart}-h`} style={{ ...td, textAlign: 'right' }}>{fmtHours(pd[k].hours)}</td>
                            <td key={`${pd.periodStart}-f`} style={{ ...td, textAlign: 'right' }}>{fmtMoney(pd[k].feesAtStd)}</td>
                          </>
                        ))}
                      </tr>
                    );
                  })}
                </>
              );
            })}

            {/* Total row — all resources per period */}
            {(['budget', 'actual', 'forecast'] as const).map(k => {
              const label = k === 'budget' ? 'Total Budget' : k === 'actual' ? 'Total Actuals' : 'Total Forecast';
              return (
                <tr key={k} style={{ background: '#1A1E1C', borderTop: `1px solid ${hairlineStrong}` }}>
                  <td colSpan={5} style={{ fontSize: '12px', fontWeight: 500, color: '#E8ECE9', padding: '8px 10px' }}>{label}</td>
                  {gridTotal.map((gt, i) => (
                    <>
                      <td key={`${i}-h`} style={{ fontSize: '12px', fontWeight: 500, color: '#E8ECE9', textAlign: 'right', padding: '8px 10px', ...tnum }}>{fmtHours(gt[k].hours)}</td>
                      <td key={`${i}-f`} style={{ fontSize: '12px', fontWeight: 500, color: '#E8ECE9', textAlign: 'right', padding: '8px 10px', ...tnum }}>{fmtMoney(gt[k].feesAtStd)}</td>
                    </>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
