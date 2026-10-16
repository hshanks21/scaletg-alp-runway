import { useState, useEffect, useRef, type CSSProperties } from 'react';
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



// ── KPI summary line (RUN-1) — one line, no big-number tiles ──

interface KpiData {
  forecast: {
    estTotalRevenue: number;
    estimatedMargin: number;
    estimatedMarginPct: number;
    realization: number;
    staffPmdHours: number;
    pctBelowDirector: number;
  };
  budget: {
    marginPct: number | null;
    realization: number | null;
    staffPmdHours: number | null;
    pctBelowDirector: number | null;
  };
  variance: {
    marginPct: number | null;
    realization: number | null;
    staffPmdHours: number | null;
    pctBelowDirector: number | null;
  };
}

const KPI_LINE_STYLE: CSSProperties = {
  background: 'var(--panel)',
  borderRadius: '10px',
  padding: '12px 20px',
  border: '1px solid var(--line)',
  marginBottom: '14px',
  fontSize: '13px',
  color: 'var(--muted)',
  fontFeatureSettings: '"tnum" 1',
};

// Margin % status color: accent (green) >=20%, hi (rust) <10%, muted (sage) 10-20%.
function marginColor(pct: number): string {
  if (pct >= 20) return 'var(--accent)';
  if (pct < 10) return 'var(--hi)';
  return 'var(--muted)';
}

function KpiSummaryLine({ engagementId, mode }: { engagementId: string; mode: 'budget' | 'bva' }) {
  const [kpis, setKpis] = useState<KpiData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apiMode = mode === 'budget' ? 'budget' : 'forecast';
    fetch(`/api/engagements/${engagementId}/kpis?mode=${apiMode}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success) setKpis(d.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [engagementId, mode]);

  if (!kpis) {
    return (
      <div style={KPI_LINE_STYLE}>
        <span style={{ color: 'var(--faint)' }}>KPIs loading…</span>
      </div>
    );
  }

  const f = kpis.forecast;
  const pct = (x: number | null) => (x == null ? '—' : `${(x * 100).toFixed(1)}%`);

  if (mode === 'budget') {
    const mPct = f.estimatedMarginPct * 100;
    return (
      <div style={KPI_LINE_STYLE}>
        <span style={{ fontWeight: 600, color: marginColor(mPct) }}>
          Revenue {formatCurrency(f.estTotalRevenue)} · Margin {formatCurrency(f.estimatedMargin)} ({mPct.toFixed(1)}%)
        </span>
        {' · '}
        <span>Realization {(f.realization * 100).toFixed(1)}%</span>
        {' · '}
        <span>Staff/PMD {f.staffPmdHours.toFixed(1)}</span>
        {' · '}
        <span>Below Dir {(f.pctBelowDirector * 100).toFixed(1)}%</span>
      </div>
    );
  }

  // BvA: Budget -> Forecast, variance only on the leading fact (Margin).
  const b = kpis.budget;
  const v = kpis.variance;
  const fPct = f.estimatedMarginPct * 100;
  const delta = v.marginPct != null && v.marginPct !== 0
    ? ` (${v.marginPct > 0 ? '+' : '-'}${Math.abs(v.marginPct).toFixed(1)}%)`
    : '';

  return (
    <div style={KPI_LINE_STYLE}>
      <span style={{ fontWeight: 600, color: marginColor(fPct) }}>
        Margin: {pct(b.marginPct)} → {pct(f.estimatedMarginPct)}{delta}
      </span>
      {' · '}
      <span>Realization: {pct(b.realization)} → {pct(f.realization)}</span>
      {' · '}
      <span>Staff/PMD: {(b.staffPmdHours == null ? '—' : b.staffPmdHours.toFixed(1))} → {f.staffPmdHours.toFixed(1)}</span>
      {' · '}
      <span>Below Dir: {pct(b.pctBelowDirector)} → {pct(f.pctBelowDirector)}</span>
    </div>
  );
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

  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = (message: string, tone: 'success' | 'danger' = 'success') => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  };

  const postAction = async (action: 'submit' | 'approve', successMsg: string) => {
    if (!id || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/engagements/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (d.success) {
        setEngagement(prev => (prev ? { ...prev, ...d.data } : d.data));
        showToast(successMsg, 'success');
      } else {
        showToast(d.error || 'Action failed', 'danger');
      }
    } catch {
      showToast('Network error', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const confirmReject = async () => {
    if (!id || busy || !rejectComment.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/engagements/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: rejectComment.trim() }),
      });
      const d = await r.json();
      if (d.success) {
        setEngagement(prev => (prev ? { ...prev, ...d.data } : d.data));
        setRejectOpen(false);
        setRejectComment('');
        showToast('Engagement rejected', 'danger');
      } else {
        showToast(d.error || 'Reject failed', 'danger');
      }
    } catch {
      showToast('Network error', 'danger');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--faint)', fontSize: '12px' }}>Loading...</div>;
  }

  if (!engagement) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--hi)', fontSize: '12px' }}>Engagement not found.</div>;
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
          background: 'var(--panel)',
          borderRadius: '10px',
          padding: '14px 20px',
          border: '1px solid var(--line)',
        }}
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>{engagement.name}</h1>
            <span style={{ fontSize: '12px', color: 'var(--faint)' }}>·</span>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{engagement.clientName}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1.5" style={{ fontSize: '12px', color: 'var(--text)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
              {meta.label}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--faint)' }}>·</span>
            <span style={{ fontSize: '12px', color: 'var(--faint)' }}><span className="font-data">{formatCurrency(fee)}</span> Fixed Fee</span>
            <span style={{ fontSize: '12px', color: 'var(--faint)' }}>·</span>
            <span style={{ fontSize: '12px', color: 'var(--faint)', textTransform: 'capitalize' }}>{engagement.periodType}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {(engagement.status === 'draft' || engagement.status === 'rejected') && (
            <button
              onClick={() => postAction('submit', 'Submitted for approval')}
              disabled={busy}
              style={{
                background: 'var(--accent-btn)',
                color: '#fff',
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: busy ? 'default' : 'pointer',
                opacity: busy ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'var(--accent-btn-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-btn)'; }}
            >
              Submit for Approval
            </button>
          )}
          {engagement.status === 'submitted' && (
            <>
              <button
                onClick={() => postAction('approve', 'Engagement approved')}
                disabled={busy}
                style={{
                  background: 'var(--accent-btn)',
                  color: '#fff',
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.6 : 1,
                }}
                onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'var(--accent-btn-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-btn)'; }}
              >
                Approve
              </button>
              <button
                onClick={() => setRejectOpen(true)}
                disabled={busy}
                style={{
                  background: 'transparent',
                  color: 'var(--hi)',
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--line-strong)',
                  cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.6 : 1,
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
          background: 'var(--panel)',
          borderRadius: '6px',
          padding: '3px',
          border: '1px solid var(--line)',
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
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
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

      {/* Reject dialog */}
      {rejectOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
          onClick={e => { if (e.target === e.currentTarget) { setRejectOpen(false); setRejectComment(''); } }}
        >
          <div
            style={{
              background: 'var(--panel)', border: '1px solid var(--line-strong)',
              borderRadius: '12px', padding: '22px', width: '420px', maxWidth: '90vw',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 500, lineHeight: 1.3, color: 'var(--text)' }}>Reject engagement</h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', marginBottom: '14px' }}>
              Add a comment explaining why this budget is being rejected.
            </p>
            <textarea
              autoFocus
              value={rejectComment}
              onChange={e => setRejectComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setRejectOpen(false); setRejectComment(''); } }}
              placeholder="Rejection comment (required)"
              rows={4}
              style={{
                width: '100%', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px',
                borderRadius: '6px', border: '1px solid var(--line)', padding: '8px',
                resize: 'vertical', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-line)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; }}
            />
            <div className="flex items-center justify-end gap-2" style={{ marginTop: '16px' }}>
              <button
                onClick={() => { setRejectOpen(false); setRejectComment(''); }}
                disabled={busy}
                style={{
                  background: 'transparent', color: 'var(--text)', fontSize: '12px',
                  padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--line-strong)',
                  cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={busy || !rejectComment.trim()}
                style={{
                  background: '#B4512C', color: '#fff', fontSize: '12px',
                  padding: '8px 18px', borderRadius: '8px', border: 'none',
                  cursor: busy || !rejectComment.trim() ? 'default' : 'pointer',
                  opacity: busy || !rejectComment.trim() ? 0.5 : 1,
                }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: '8px',
            padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 60,
            fontSize: '12px', color: 'var(--text)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: toast.tone === 'success' ? 'var(--accent)' : 'var(--hi)' }} />
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ── Budget View (Task → Resource → Hours grid) ──

function BudgetView({ engagement }: { engagement: EngagementDetail }) {
  return (
    <div>
      {/* KPI summary line */}
      <KpiSummaryLine engagementId={engagement.id} mode="budget" />

      {/* Tasks + Allocations */}
      <div
        style={{
          background: 'var(--panel)',
          borderRadius: '10px',
          border: '1px solid var(--line)',
          overflow: 'hidden',
        }}
      >
        {(!engagement.tasks || engagement.tasks.length === 0) ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--faint)', fontSize: '12px' }}>
            No tasks yet. Click "+ Add Task" to start building the budget.
          </div>
        ) : (
          engagement.tasks.map((task: any) => (
            <div key={task.id} style={{ borderBottom: '1px solid var(--line)' }}>
              {/* Task header */}
              <div
                className="flex items-center justify-between"
                style={{ padding: '10px 20px', background: 'var(--raised)' }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '12px', color: 'var(--accent)' }}>▼</span>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{task.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--faint)' }}>
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
                    borderBottom: '1px solid var(--line)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ width: '200px', color: 'var(--text)' }}>
                    {alloc.resourceName || 'Unknown'}
                    <div style={{ fontSize: '11px', color: 'var(--faint)' }}>
                      {alloc.categoryName} · ${parseFloat(alloc.standardRate || 0).toLocaleString()} std / ${parseFloat(alloc.engagementRate || 0).toLocaleString()} eng
                    </div>
                  </div>
                  <div className="flex gap-1 flex-1">
                    {alloc.periods?.map((p: any) => (
                      <div
                        key={p.id}
                        className="font-data"
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          padding: '4px',
                          background: parseFloat(p.hours) > 0 ? 'rgba(63,168,94,0.08)' : 'transparent',
                          borderRadius: '4px',
                          color: parseFloat(p.hours) > 0 ? '#E8ECE9' : '#7C8780',
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
                <button style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  + Add Resource
                </button>
              </div>
            </div>
          ))
        )}

        {/* Add Task */}
        <div style={{ padding: '10px 20px', borderTop: '1px dashed var(--line)' }}>
          <button style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
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
  budget: 'var(--lo)',   // stone
  actual: 'var(--prog)',   // amber
  forecast: 'var(--accent)', // sprout
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

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--faint)', fontSize: '12px' }}>Loading…</div>;
  if (error || !data) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--hi)', fontSize: '12px' }}>{error || 'No BvA data'}</div>;

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
  const hairline = 'var(--line)';
  const hairlineStrong = 'var(--line-strong)';
  const benchHover = 'var(--hover)';
  const tnum = { fontFeatureSettings: '"tnum" 1' } as const;

  const th: any = {
    fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
    color: 'var(--faint)', padding: '6px 10px', borderBottom: `1px solid ${hairlineStrong}`, ...tnum,
  };
  const td: any = {
    fontSize: '12px', color: 'var(--muted)', padding: '6px 10px', borderBottom: `1px solid ${hairline}`, ...tnum,
  };
  const dot = (k: 'budget' | 'actual' | 'forecast') => (
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: DOT_COLORS[k], display: 'inline-block' }} />
  );

  return (
    <div>
      <KpiSummaryLine engagementId={engagementId} mode="bva" />

      {/* Engagement Details Summary */}
      <div style={{ background: 'var(--panel)', borderRadius: '10px', border: `1px solid ${hairline}`, padding: '14px 20px', marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>Engagement Details Summary</div>
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
                <td style={{ fontSize: '12px', color: 'var(--text)', padding: '6px 10px', borderBottom: `1px solid ${hairline}` }}>{s.level}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmtHours(s.actual)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmtHours(s.budget)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmtHours(s.forecast)}</td>
                <td style={{ ...td, textAlign: 'right', color: s.variance >= 0 ? 'var(--accent)' : 'var(--hi)' }}>{fmtVariance(s.variance)}</td>
              </tr>
            ))}
            <tr>
              <td style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', padding: '6px 10px' }}>Total</td>
              <td style={{ ...td, textAlign: 'right', borderBottom: 'none', color: 'var(--text)' }}>{fmtHours(totalActual)}</td>
              <td style={{ ...td, textAlign: 'right', borderBottom: 'none', color: 'var(--text)' }}>{fmtHours(totalBudget)}</td>
              <td style={{ ...td, textAlign: 'right', borderBottom: 'none', color: 'var(--text)' }}>{fmtHours(totalForecast)}</td>
              <td style={{ ...td, textAlign: 'right', borderBottom: 'none', color: 'var(--text)' }}>{fmtVariance(totalForecast - totalBudget)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Resource × Period grid */}
      <div style={{ background: 'var(--panel)', borderRadius: '10px', border: `1px solid ${hairline}`, overflow: 'auto' }}>
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
                  <tr key={r.resourceId} style={{ background: 'var(--raised)' }}>
                    <td style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', padding: '8px 10px' }}>{r.resourceName || 'Unknown'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--muted)', padding: '8px 10px' }}>{r.categoryName || '—'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--muted)', padding: '8px 10px' }}>{r.region || '—'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'right', padding: '8px 10px', ...tnum }}>{std}</td>
                    <td style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'right', padding: '8px 10px', ...tnum }}>{eng}</td>
                    {periods.map((p, i) => <td key={`${p.start}-${i}`} colSpan={2}></td>)}
                  </tr>
                  {/* budget / actuals / forecast sub-rows */}
                  {(['budget', 'actual', 'forecast'] as const).map(k => {
                    const label = k === 'budget' ? 'Budget' : k === 'actual' ? 'Actuals' : 'Forecast';
                    return (
                      <tr key={k} style={{ transition: 'background 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = benchHover; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <td colSpan={5} style={{ fontSize: '12px', color: 'var(--muted)', padding: '6px 10px 6px 22px', borderBottom: `1px solid ${hairline}` }}>
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
                <tr key={k} style={{ background: 'var(--raised)', borderTop: `1px solid ${hairlineStrong}` }}>
                  <td colSpan={5} style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', padding: '8px 10px' }}>{label}</td>
                  {gridTotal.map((gt, i) => (
                    <>
                      <td key={`${i}-h`} style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', textAlign: 'right', padding: '8px 10px', ...tnum }}>{fmtHours(gt[k].hours)}</td>
                      <td key={`${i}-f`} style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', textAlign: 'right', padding: '8px 10px', ...tnum }}>{fmtMoney(gt[k].feesAtStd)}</td>
                    </>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>      </div>
    </div>
  );
}

// ── Checkpoints View (placeholder — workers will build this) ──

function CheckpointsView({ engagementId }: { engagementId: string }) {
  return (
    <div
      style={{
        background: 'var(--panel)',
        borderRadius: '10px',
        padding: '40px',
        border: '1px solid var(--line)',
        textAlign: 'center',
        color: 'var(--faint)',
        fontSize: '12px',
      }}
    >
      Checkpoints will render here.
      <br />
      <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Submitted / Approved / Modified snapshots with comparison</span>
    </div>
  );
}
