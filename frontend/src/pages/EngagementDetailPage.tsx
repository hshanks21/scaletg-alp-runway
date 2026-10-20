import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useDialogTransition } from '../hooks/useDialogTransition';

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

function KpiSummaryLine({ engagementId, mode, refreshToken = 0 }: { engagementId: string; mode: 'budget' | 'bva'; refreshToken?: number }) {
  const [kpis, setKpis] = useState<KpiData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apiMode = mode === 'budget' ? 'budget' : 'forecast';
    fetch(`/api/engagements/${engagementId}/kpis?mode=${apiMode}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success) setKpis(d.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [engagementId, mode, refreshToken]);

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
  const { closing: rejectClosing, requestClose: requestRejectClose } = useDialogTransition(() => {
    setRejectOpen(false);
    setRejectComment('');
  });
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
        requestRejectClose();
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
            <h1 style={{ fontSize: '25px', fontWeight: 600, color: 'var(--text)', fontFamily: "'Fraunces', Georgia, serif", letterSpacing: '-0.01em' }}>{engagement.name}</h1>
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
      {activeTab === 'bva' && <BvaView engagementId={engagement.id} tasks={engagement.tasks} />}
      {activeTab === 'checkpoints' && <CheckpointsView engagement={engagement} />}

      {/* Reject dialog */}
      {rejectOpen && (
        <div
          className={`runway-backdrop${rejectClosing ? ' is-closing' : ''}`}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
          onClick={e => { if (e.target === e.currentTarget) requestRejectClose(); }}
        >
          <div
            className={`runway-dialog${rejectClosing ? ' is-closing' : ''}`}
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
              onKeyDown={e => { if (e.key === 'Escape') requestRejectClose(); }}
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
                onClick={requestRejectClose}
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

const budgetInputStyle: CSSProperties = {
  fontSize: '11px',
  padding: '3px 8px',
  background: 'var(--panel)',
  border: '1px solid var(--line-strong)',
  borderRadius: '4px',
  color: 'var(--text)',
};

function BudgetView({ engagement }: { engagement: EngagementDetail }) {
  const [tasks, setTasks] = useState<any[]>(engagement.tasks || []);
  const [refreshToken, setRefreshToken] = useState(0);
  const [addingTask, setAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', estimatedHours: '', startDate: '', numPeriods: '' });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  const [addResourceTaskId, setAddResourceTaskId] = useState<string | null>(null);
  const [resourceQuery, setResourceQuery] = useState('');
  const [resourceResults, setResourceResults] = useState<any[]>([]);
  const [editingHours, setEditingHours] = useState<{ allocId: string; periodId: string; value: string } | null>(null);
  const [editingRate, setEditingRate] = useState<{ allocId: string; value: string } | null>(null);

  const bumpKpi = () => setRefreshToken((t) => t + 1);

  const api = async (method: string, path: string, body?: unknown) => {
    const r = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return r.json();
  };

  const reload = async () => {
    const d = await api('GET', `/api/engagements/${engagement.id}`);
    if (d.success) setTasks(d.data.tasks || []);
  };

  // ── Tasks ──
  const createTask = async () => {
    if (!newTask.name.trim()) return;
    await api('POST', `/api/engagements/${engagement.id}/tasks`, {
      name: newTask.name.trim(),
      estimatedHours: newTask.estimatedHours || undefined,
      startDate: newTask.startDate || undefined,
      numPeriods: newTask.numPeriods ? parseInt(newTask.numPeriods, 10) : undefined,
      sortOrder: tasks.length,
    });
    setNewTask({ name: '', estimatedHours: '', startDate: '', numPeriods: '' });
    setAddingTask(false);
    await reload();
    bumpKpi();
  };

  const saveTaskName = async (taskId: string) => {
    if (!editingTaskName.trim()) { setEditingTaskId(null); return; }
    await api('PATCH', `/api/engagements/${engagement.id}/tasks/${taskId}`, { name: editingTaskName.trim() });
    setEditingTaskId(null);
    await reload();
    bumpKpi();
  };

  const moveTask = async (taskId: string, dir: -1 | 1) => {
    const idx = tasks.findIndex((t) => t.id === taskId);
    const swap = tasks[idx + dir];
    if (idx < 0 || !swap) return;
    await api('PATCH', `/api/engagements/${engagement.id}/tasks/${taskId}`, { sortOrder: swap.sortOrder });
    await api('PATCH', `/api/engagements/${engagement.id}/tasks/${swap.id}`, { sortOrder: tasks[idx].sortOrder });
    await reload();
  };

  const deleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task and its resources?')) return;
    await api('DELETE', `/api/engagements/${engagement.id}/tasks/${taskId}`);
    await reload();
    bumpKpi();
  };

  // ── Allocations ──
  useEffect(() => {
    if (!addResourceTaskId) return;
    if (!resourceQuery.trim()) { setResourceResults([]); return; }
    const t = window.setTimeout(async () => {
      const d = await api('GET', `/api/resources?search=${encodeURIComponent(resourceQuery.trim())}`);
      if (d.success) setResourceResults(d.data);
    }, 250);
    return () => window.clearTimeout(t);
  }, [resourceQuery, addResourceTaskId]);

  const addResource = async (taskId: string, resource: any) => {
    await api('POST', `/api/engagements/${engagement.id}/allocations`, {
      taskId,
      resourceId: resource.id,
      engagementRate: resource.standardRate,
    });
    setAddResourceTaskId(null);
    setResourceQuery('');
    setResourceResults([]);
    await reload();
    bumpKpi();
  };

  const saveRate = async (allocId: string) => {
    if (!editingRate || editingRate.allocId !== allocId) return;
    await api('PATCH', `/api/engagements/${engagement.id}/allocations/${allocId}`, { engagementRate: editingRate.value });
    setEditingRate(null);
    await reload();
    bumpKpi();
  };

  const saveHours = async () => {
    if (!editingHours) return;
    await api('PATCH', `/api/engagements/${engagement.id}/allocations/${editingHours.allocId}/periods`, {
      periods: [{ id: editingHours.periodId, hours: editingHours.value }],
    });
    setEditingHours(null);
    await reload();
    bumpKpi();
  };

  const removeResource = async (allocId: string) => {
    await api('DELETE', `/api/engagements/${engagement.id}/allocations/${allocId}`);
    await reload();
    bumpKpi();
  };

  const iconBtn: CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--faint)', fontSize: '11px', padding: '2px 5px',
  };

  return (
    <div>
      <KpiSummaryLine engagementId={engagement.id} mode="budget" refreshToken={refreshToken} />

      <div style={{ background: 'var(--panel)', borderRadius: '10px', border: '1px solid var(--line)', overflow: 'hidden' }}>
        {tasks.length === 0 && !addingTask ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--faint)', fontSize: '12px' }}>
            No tasks yet. Click "+ Add Task" to start building the budget.
          </div>
        ) : (
          tasks.map((task, ti) => {
            const hasAllocs = (task.allocations?.length || 0) > 0;
            return (
              <div key={task.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <div style={{ padding: '8px 20px', background: 'var(--raised)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '12px', color: 'var(--accent)' }}>▼</span>
                    {editingTaskId === task.id ? (
                      <input
                        autoFocus
                        value={editingTaskName}
                        onChange={(e) => setEditingTaskName(e.target.value)}
                        onBlur={() => saveTaskName(task.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveTaskName(task.id); else if (e.key === 'Escape') setEditingTaskId(null); }}
                        style={budgetInputStyle}
                      />
                    ) : (
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', cursor: 'pointer' }} onClick={() => { setEditingTaskId(task.id); setEditingTaskName(task.name); }}>
                        {task.name}
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: hasAllocs ? 'var(--faint)' : 'var(--muted)', fontStyle: hasAllocs ? 'italic' : 'normal' }}>
                      (est: {task.estimatedHours || 0}h → alloc: {task.allocatedHours?.toFixed(0) || 0}h)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                    <button style={iconBtn} onClick={() => moveTask(task.id, -1)} disabled={ti === 0} title="Move up">↑</button>
                    <button style={iconBtn} onClick={() => moveTask(task.id, 1)} disabled={ti === tasks.length - 1} title="Move down">↓</button>
                    <button style={iconBtn} onClick={() => deleteTask(task.id)} title="Delete task">✕</button>
                  </div>
                </div>

                {task.allocations?.map((alloc: any) => (
                  <div key={alloc.id} style={{ padding: '8px 20px 8px 40px', borderBottom: '1px solid var(--line)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '220px', color: 'var(--text)', flexShrink: 0 }}>
                      {alloc.resourceName || 'Unknown'}
                      <div style={{ fontSize: '11px', color: 'var(--faint)' }}>
                        {alloc.categoryName} · ${parseFloat(alloc.standardRate || 0).toLocaleString()} std /{' '}
                        {editingRate?.allocId === alloc.id ? (
                          <input
                            autoFocus
                            value={editingRate!.value}
                            onChange={(e) => setEditingRate({ allocId: alloc.id, value: e.target.value })}
                            onBlur={() => saveRate(alloc.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveRate(alloc.id); else if (e.key === 'Escape') setEditingRate(null); }}
                            style={{ ...budgetInputStyle, width: '64px' }}
                          />
                        ) : (
                          <span style={{ cursor: 'pointer', textDecoration: 'underline dotted' }} onClick={() => setEditingRate({ allocId: alloc.id, value: alloc.engagementRate })}>
                            ${parseFloat(alloc.engagementRate || 0).toLocaleString()}
                          </span>
                        )}{' '}
                        eng
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                      {alloc.periods?.map((p: any) => {
                        const val = parseFloat(p.hours || '0');
                        return (
                          <div key={p.id} className="font-data" style={{ flex: 1, textAlign: 'center', padding: '4px', background: val > 0 ? 'var(--accent-soft)' : 'transparent', borderRadius: '4px', color: val > 0 ? 'var(--text)' : 'var(--faint)' }}>
                            {editingHours?.periodId === p.id ? (
                              <input
                                autoFocus
                                value={editingHours!.value}
                                onChange={(e) => setEditingHours({ allocId: alloc.id, periodId: p.id, value: e.target.value })}
                                onBlur={() => saveHours()}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveHours(); else if (e.key === 'Escape') setEditingHours(null); }}
                                style={{ ...budgetInputStyle, width: '100%', textAlign: 'center', padding: '2px 4px' }}
                              />
                            ) : (
                              <span style={{ cursor: 'pointer' }} onClick={() => setEditingHours({ allocId: alloc.id, periodId: p.id, value: p.hours })}>
                                {val || '—'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <button style={iconBtn} onClick={() => removeResource(alloc.id)} title="Remove resource">✕</button>
                  </div>
                ))}

                <div style={{ padding: '6px 20px 6px 40px' }}>
                  {addResourceTaskId === task.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <input
                        autoFocus
                        value={resourceQuery}
                        onChange={(e) => setResourceQuery(e.target.value)}
                        placeholder="Search resources by name…"
                        style={{ ...budgetInputStyle, width: '260px' }}
                      />
                      {resourceResults.slice(0, 8).map((r: any) => (
                        <button key={r.id} onClick={() => addResource(task.id, r)} style={{ textAlign: 'left', fontSize: '11px', color: 'var(--text)', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}>
                          {r.name} <span style={{ color: 'var(--faint)' }}>· {r.categoryName} · ${parseFloat(r.standardRate).toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setAddResourceTaskId(task.id)}>
                      + Add Resource
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        <div style={{ padding: '10px 20px', borderTop: '1px dashed var(--line)' }}>
          {addingTask ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input autoFocus value={newTask.name} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} placeholder="Task name" style={{ ...budgetInputStyle, width: '180px' }} />
              <input value={newTask.estimatedHours} onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })} placeholder="Est. hours" type="number" style={{ ...budgetInputStyle, width: '90px' }} />
              <input value={newTask.startDate} onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })} type="date" style={budgetInputStyle} />
              <input value={newTask.numPeriods} onChange={(e) => setNewTask({ ...newTask, numPeriods: e.target.value })} placeholder="# periods" type="number" style={{ ...budgetInputStyle, width: '80px' }} />
              <button onClick={createTask} style={{ fontSize: '11px', color: '#fff', background: 'var(--accent-btn)', border: 'none', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer' }}>Add</button>
              <button onClick={() => setAddingTask(false)} style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          ) : (
            <button style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setAddingTask(true)}>
              + Add Task
            </button>
          )}
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

function recomputeTotals(periods: BvAPeriodData[]): { budget: BvAMetrics; actual: BvAMetrics; forecast: BvAMetrics } {
  const zero = (): BvAMetrics => ({ hours: 0, feesAtStd: 0, feesAtEng: 0 });
  const sum = (k: 'budget' | 'actual' | 'forecast'): BvAMetrics =>
    periods.reduce(
      (s, p) => ({
        hours: s.hours + p[k].hours,
        feesAtStd: s.feesAtStd + p[k].feesAtStd,
        feesAtEng: s.feesAtEng + p[k].feesAtEng,
      }),
      zero(),
    );
  return { budget: sum('budget'), actual: sum('actual'), forecast: sum('forecast') };
}

function BvaView({ engagementId, tasks }: { engagementId: string; tasks: any[] }) {
  const [data, setData] = useState<BvAResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  // Forecast inline editing
  const [editing, setEditing] = useState<{ resourceId: string; periodStart: string; periodEnd: string } | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  // Adjustment inputs (initialised from the engagement once it loads)
  const [adj, setAdj] = useState<Record<string, string>>({});
  const [adjBusy, setAdjBusy] = useState(false);

  // Insert new employee
  const [insertOpen, setInsertOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [notice, setNotice] = useState('');
  const noticeTimer = useRef<number | null>(null);
  const searchTimer = useRef<number | null>(null);
  const cancelRef = useRef(false);

  const flash = (msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2500);
  };

  const today = (() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  })();

  const loadData = async () => {
    if (!engagementId) return;
    try {
      const r = await fetch(`/api/engagements/${engagementId}/budget-vs-actual`);
      const d = await r.json();
      if (d.success) setData(d.data);
      else setError(d.error || 'Failed to load');
    } catch {
      setError('Failed to load BvA data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId]);

  // Initialise the adjustment inputs once the engagement loads
  useEffect(() => {
    const e: any = data?.engagement;
    if (!e) return;
    setAdj({
      agreedBaseFeesAdj: e.agreedBaseFeesAdj ?? '0',
      contingentFeesAdj: e.contingentFeesAdj ?? '0',
      expenseAdj: e.expenseAdj ?? '0',
      digitalToolsAdj: e.digitalToolsAdj ?? '0',
      etsCostsAdj: e.etsCostsAdj ?? '0',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.engagement?.id]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--faint)', fontSize: '12px' }}>Loading…</div>;
  if (error || !data) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--hi)', fontSize: '12px' }}>{error || 'No BvA data'}</div>;

  const { periods, resources } = data;
  const periodType = data.engagement?.periodType;
  const eng: any = data.engagement || {};

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

  // ── Revenue / cost adjustment financials ──
  const n = (v: any) => parseFloat(v ?? '0') || 0;
  const budgetedRevenue = n(eng.agreedBaseFees) + n(eng.contingentFees);
  const forecastedRevenue = budgetedRevenue + n(adj.agreedBaseFeesAdj) + n(adj.contingentFeesAdj);
  const budgetedExpenses = n(eng.expensesBudget);
  const forecastedExpenses = budgetedExpenses + n(adj.expenseAdj);
  const budgetedETS = n(eng.etsBudget) + n(eng.digitalToolsBudget);
  const forecastedETS = budgetedETS + n(adj.digitalToolsAdj) + n(adj.etsCostsAdj);

  // ── Edit handlers ──

  const startEdit = (r: BvAResource, pd: BvAPeriodData) => {
    const past = pd.periodEnd < today;
    const fh = pd.forecast.hours;
    const init = fh > 0 ? fh : (past ? pd.actual.hours : pd.budget.hours);
    cancelRef.current = false;
    setEditing({ resourceId: r.resourceId, periodStart: pd.periodStart, periodEnd: pd.periodEnd });
    setDraft(init > 0 ? String(init) : '');
  };

  const cancelEdit = () => {
    cancelRef.current = true;
    setEditing(null);
  };

  const saveForecast = async () => {
    if (!editing || !engagementId || busy || cancelRef.current) return;
    const parsed = parseFloat(draft);
    const hours = Number.isFinite(parsed) ? parsed : 0;
    const { resourceId, periodStart, periodEnd } = editing;

    setEditing(null);
    setBusy(true);

    // Optimistic update
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        resources: prev.resources.map(r => {
          if (r.resourceId !== resourceId) return r;
          const stdRate = parseFloat(r.standardRate || '0');
          const engRate = parseFloat(r.engagementRate || '0');
          const periods = r.periods.map(p =>
            p.periodStart === periodStart
              ? { ...p, forecast: { hours, feesAtStd: hours * stdRate, feesAtEng: hours * engRate } }
              : p,
          );
          return { ...r, periods, totals: recomputeTotals(periods) };
        }),
      };
    });

    try {
      const r = await fetch(`/api/engagements/${engagementId}/forecasts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ resourceId, periodStart, periodEnd, hours }] }),
      });
      const d = await r.json();
      if (d.success) {
        setRefreshToken(t => t + 1);
        flash('Forecast saved');
      } else {
        flash(d.error || 'Failed to save forecast');
        loadData();
      }
    } catch {
      flash('Network error');
      loadData();
    } finally {
      setBusy(false);
    }
  };

  const removeResourceForecast = async (r: BvAResource) => {
    if (!engagementId || busy) return;
    const items = r.periods.map(p => ({ resourceId: r.resourceId, periodStart: p.periodStart, periodEnd: p.periodEnd, hours: 0 }));
    setBusy(true);
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        resources: prev.resources.map(rr => {
          if (rr.resourceId !== r.resourceId) return rr;
          const periods = rr.periods.map(p => ({ ...p, forecast: { hours: 0, feesAtStd: 0, feesAtEng: 0 } }));
          return { ...rr, periods, totals: recomputeTotals(periods) };
        }),
      };
    });
    try {
      const resp = await fetch(`/api/engagements/${engagementId}/forecasts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const d = await resp.json();
      if (d.success) { setRefreshToken(t => t + 1); flash('Forecast hours removed'); }
      else { flash(d.error || 'Failed'); loadData(); }
    } catch {
      flash('Network error');
      loadData();
    } finally {
      setBusy(false);
    }
  };

  const removeTbd = async () => {
    if (!engagementId || busy) return;
    setBusy(true);
    try {
      const resp = await fetch(`/api/engagements/${engagementId}/forecasts/remove-tbd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d = await resp.json();
      if (d.success) { await loadData(); setRefreshToken(t => t + 1); flash(d.message || 'TBD forecasts removed'); }
      else flash(d.error || 'Failed');
    } catch {
      flash('Network error');
    } finally {
      setBusy(false);
    }
  };

  const onSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimer.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/resources?search=${encodeURIComponent(q.trim())}`);
        const d = await r.json();
        if (d.success) setSearchResults(d.data || []);
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 250);
  };

  const insertEmployee = async (res: any) => {
    if (!engagementId || busy) return;
    const taskId = tasks?.[0]?.id;
    if (!taskId) { flash('No task available to assign the resource'); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/engagements/${engagementId}/allocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, resourceId: res.id, engagementRate: res.standardRate }),
      });
      const d = await r.json();
      if (d.success) {
        setInsertOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        await loadData();
        setRefreshToken(t => t + 1);
        flash('Resource added — edit their forecast hours');
      } else {
        flash(d.error || 'Failed to add resource');
      }
    } catch {
      flash('Network error');
    } finally {
      setBusy(false);
    }
  };

  const saveAdjustment = async (field: string) => {
    if (!engagementId || adjBusy) return;
    setAdjBusy(true);
    try {
      const r = await fetch(`/api/engagements/${engagementId}/adjustments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: adj[field] ?? '0' }),
      });
      const d = await r.json();
      if (d.success) {
        setData(prev => (prev ? { ...prev, engagement: d.data } : prev));
        setRefreshToken(t => t + 1);
        flash('Adjustment saved');
      } else {
        flash(d.error || 'Failed to save adjustment');
      }
    } catch {
      flash('Network error');
    } finally {
      setAdjBusy(false);
    }
  };

  const adjInput = (field: string) => (
    <input
      value={adj[field] ?? ''}
      onChange={e => setAdj(prev => ({ ...prev, [field]: e.target.value }))}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-line)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; saveAdjustment(field); }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      inputMode="decimal"
      style={{
        width: '88px', textAlign: 'right', background: 'var(--bg)', color: 'var(--text)',
        border: '1px solid var(--line)', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', ...tnum,
      }}
    />
  );

  return (
    <div>
      <KpiSummaryLine engagementId={engagementId} mode="bva" refreshToken={refreshToken} />

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
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            {dot(k)}{label}
                            {k === 'forecast' && (
                              <button
                                onClick={() => removeResourceForecast(r)}
                                disabled={busy}
                                style={{ fontSize: '11px', color: 'var(--hi)', background: 'none', border: 'none', cursor: busy ? 'default' : 'pointer', padding: 0 }}
                              >
                                Remove Fcst Hours
                              </button>
                            )}
                          </span>
                        </td>
                        {k === 'forecast'
                          ? r.periods.map(pd => {
                              const isEditing = editing?.resourceId === r.resourceId && editing?.periodStart === pd.periodStart;
                              const past = pd.periodEnd < today;
                              if (isEditing) {
                                return (
                                  <td key={`${pd.periodStart}-fc`} colSpan={2} style={{ ...td, textAlign: 'right', padding: '2px 4px' }}>
                                    <input
                                      autoFocus
                                      type="number"
                                      step="0.5"
                                      value={draft}
                                      onChange={e => setDraft(e.target.value)}
                                      onBlur={saveForecast}
                                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); else if (e.key === 'Escape') cancelEdit(); }}
                                      style={{
                                        width: '64px', textAlign: 'right', background: 'var(--bg)', color: 'var(--text)',
                                        border: '1px solid var(--accent-line)', borderRadius: '4px', padding: '3px 6px', fontSize: '12px', ...tnum,
                                      }}
                                    />
                                  </td>
                                );
                              }
                              const override = past && pd.forecast.hours === 0 && pd.actual.hours > 0;
                              return (
                                <td
                                  key={`${pd.periodStart}-fc`}
                                  colSpan={2}
                                  onClick={() => startEdit(r, pd)}
                                  title={past ? 'Edit forecast (defaults to Actuals)' : 'Edit forecast (defaults to Budget)'}
                                  style={{
                                    ...td,
                                    textAlign: 'right',
                                    cursor: 'pointer',
                                    color: override ? 'var(--prog)' : 'var(--text)',
                                  }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)'; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                >
                                  {fmtHours(pd.forecast.hours)}
                                  <span style={{ color: 'var(--faint)', fontSize: '11px', marginLeft: 6 }}>{fmtMoney(pd.forecast.feesAtStd)}</span>
                                </td>
                              );
                            })
                          : r.periods.map(pd => (
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

      {/* Revenue / Cost adjustments */}
      <div style={{ background: 'var(--panel)', borderRadius: '10px', border: `1px solid ${hairline}`, padding: '14px 20px', marginTop: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>Revenue / Cost Adjustments</div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: '12px', color: 'var(--muted)', padding: '5px 0' }}>
          <span style={{ color: 'var(--text)' }}>Budgeted Revenue:</span>
          <span style={{ color: 'var(--text)', ...tnum }}>{formatCurrency(budgetedRevenue)}</span>
          <span>+ Adj:</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '11px', color: 'var(--faint)' }}>Base</span>
            {adjInput('agreedBaseFeesAdj')}
            <span style={{ fontSize: '11px', color: 'var(--faint)' }}>Contingent</span>
            {adjInput('contingentFeesAdj')}
          </span>
          <span>=</span>
          <span style={{ color: 'var(--accent)' }}>Forecasted Revenue: <span style={{ ...tnum }}>{formatCurrency(forecastedRevenue)}</span></span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--faint)', padding: '0 0 6px 0' }}>
          Agreed Base Fees: {formatCurrency(n(eng.agreedBaseFees))} · Contingent/Other: {formatCurrency(n(eng.contingentFees))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: '12px', color: 'var(--muted)', padding: '5px 0' }}>
          <span style={{ color: 'var(--text)' }}>Budgeted Expenses:</span>
          <span style={{ color: 'var(--text)', ...tnum }}>{formatCurrency(budgetedExpenses)}</span>
          <span>+ Adj:</span>
          {adjInput('expenseAdj')}
          <span>=</span>
          <span style={{ color: 'var(--accent)' }}>Forecasted Expenses: <span style={{ ...tnum }}>{formatCurrency(forecastedExpenses)}</span></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: '12px', color: 'var(--muted)', padding: '5px 0' }}>
          <span style={{ color: 'var(--text)' }}>Budgeted ETS:</span>
          <span style={{ color: 'var(--text)', ...tnum }}>{formatCurrency(budgetedETS)}</span>
          <span>+ Adj:</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '11px', color: 'var(--faint)' }}>Digital Tools</span>
            {adjInput('digitalToolsAdj')}
            <span style={{ fontSize: '11px', color: 'var(--faint)' }}>ETS Costs</span>
            {adjInput('etsCostsAdj')}
          </span>
          <span>=</span>
          <span style={{ color: 'var(--accent)' }}>Forecasted ETS: <span style={{ ...tnum }}>{formatCurrency(forecastedETS)}</span></span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--faint)', padding: '0 0 6px 0' }}>
          Digital Tools: {formatCurrency(n(eng.digitalToolsBudget))} · ETS Costs: {formatCurrency(n(eng.etsBudget))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: '14px', flexWrap: 'wrap' }}>
        <button
          onClick={removeTbd}
          disabled={busy}
          style={{ fontSize: '12px', color: 'var(--hi)', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: '6px', padding: '6px 12px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          Remove TBD Forecasted Hours
        </button>
        <button
          onClick={() => setInsertOpen(o => !o)}
          disabled={busy}
          style={{ fontSize: '12px', color: 'var(--accent)', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: '6px', padding: '6px 12px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          Insert New Employee
        </button>
        {notice && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{notice}</span>}
      </div>

      {/* Insert new employee search */}
      {insertOpen && (
        <div style={{ background: 'var(--panel)', borderRadius: '10px', border: `1px solid ${hairline}`, padding: '12px 16px', marginTop: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>Insert New Employee</div>
          <input
            autoFocus
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Type a name to search resources…"
            style={{ width: '300px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', outline: 'none' }}
          />
          {searching && <span style={{ fontSize: '11px', color: 'var(--faint)', marginLeft: 8 }}>Searching…</span>}
          {searchResults.length > 0 && (
            <div style={{ marginTop: '8px', borderTop: `1px solid ${hairline}` }}>
              {searchResults.map(res => (
                <button
                  key={res.id}
                  onClick={() => insertEmployee(res)}
                  disabled={busy}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 4px', cursor: busy ? 'default' : 'pointer', borderBottom: `1px solid ${hairline}` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--text)' }}>{res.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--faint)' }}>{res.categoryName} · {res.region || '—'}</span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: 'auto', ...tnum }}>${parseFloat(res.standardRate || '0').toLocaleString('en-US')} std</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Checkpoints View (RUN-5) — snapshot list + Baseline + diff comparison ──

interface Checkpoint {
  id: string;
  kind: 'submitted' | 'approved' | 'modified';
  label: string | null;
  snapshot: Record<string, unknown>;
  comment: string | null;
  createdBy: string | null;
  createdAt: string;
}

const CHECKPOINT_KIND_META: Record<Checkpoint['kind'], { label: string; dot: string }> = {
  submitted: { label: 'Submitted', dot: 'var(--prog)' },
  approved: { label: 'Approved', dot: 'var(--accent)' },
  modified: { label: 'Modified', dot: 'var(--rev)' },
};

function fmtCheckpointDate(s: string): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function fmtSnapshotValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

type DiffStatus = 'added' | 'removed' | 'changed' | 'same';
interface DiffRow { key: string; left: string; right: string; status: DiffStatus; }

function diffRecords(left: Record<string, unknown>, right: Record<string, unknown>): DiffRow[] {
  const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort();
  return keys.map((key) => {
    const inL = key in left;
    const inR = key in right;
    const lv = inL ? fmtSnapshotValue(left[key]) : '';
    const rv = inR ? fmtSnapshotValue(right[key]) : '';
    let status: DiffStatus;
    if (!inL && inR) status = 'added';
    else if (inL && !inR) status = 'removed';
    else if (lv !== rv) status = 'changed';
    else status = 'same';
    return { key, left: lv, right: rv, status };
  });
}

const DIFF_COLORS: Record<DiffStatus, string> = {
  added: 'var(--accent)',
  removed: 'var(--hi)',
  changed: 'var(--prog)',
  same: 'var(--muted)',
};

function CheckpointsView({ engagement }: { engagement: EngagementDetail }) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/engagements/${engagement.id}/checkpoints`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) setCheckpoints(d.data);
        else setError(d.error || 'Failed to load checkpoints');
      })
      .catch(() => { if (!cancelled) setError('Failed to load checkpoints'); });
    return () => { cancelled = true; };
  }, [engagement.id]);

  if (error) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--hi)', fontSize: '12px' }}>{error}</div>;
  }
  if (!checkpoints) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--faint)', fontSize: '12px' }}>Loading checkpoints…</div>;
  }
  if (checkpoints.length === 0) {
    return (
      <div style={{ background: 'var(--panel)', borderRadius: '10px', padding: '40px', border: '1px solid var(--line)', textAlign: 'center', color: 'var(--faint)', fontSize: '12px' }}>
        No checkpoints yet.
        <br />
        <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Submit or approve this engagement to create snapshots</span>
      </div>
    );
  }

  const baselineId = checkpoints.find((c) => c.kind === 'approved')?.id ?? null;
  const selected = checkpoints.find((c) => c.id === selectedId) ?? checkpoints[0];

  const currentState: Record<string, unknown> = {
    status: engagement.status,
    clientName: engagement.clientName,
    name: engagement.name,
    engagementOwner: engagement.engagementOwner,
    agreedBaseFees: engagement.agreedBaseFees,
    contingentFees: engagement.contingentFees,
    startDate: engagement.startDate,
    endDate: engagement.endDate,
    periodType: engagement.periodType,
  };

  const diff = diffRecords(selected.snapshot, currentState);
  const snapshotRows = diff.filter((r) => r.status !== 'added');
  const currentRows = diff.filter((r) => r.status !== 'removed');

  const listItemStyle = (isSelected: boolean, isBaseline: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 14px',
    cursor: 'pointer',
    background: isSelected ? 'var(--raised)' : 'transparent',
    border: isBaseline ? '1px solid var(--accent-line)' : '1px solid transparent',
    borderRadius: '8px',
    marginBottom: '8px',
  });

  const panelStyle: CSSProperties = {
    flex: 1,
    background: 'var(--panel)',
    border: '1px solid var(--line)',
    borderRadius: '10px',
    padding: '16px',
    minHeight: '280px',
  };

  const panelTitle: CSSProperties = {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--faint)',
    marginBottom: '12px',
  };

  const diffText: CSSProperties = {
    fontFamily: '"Space Grotesk", "Inter", sans-serif',
    fontSize: '12px',
    lineHeight: '1.8',
    fontFeatureSettings: '"tnum" 1',
    wordBreak: 'break-word',
  };

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <div style={{ flex: '0 0 320px' }}>
        {checkpoints.map((c) => {
          const meta = CHECKPOINT_KIND_META[c.kind];
          const isBaseline = c.id === baselineId;
          const isSelected = c.id === selected.id;
          return (
            <div key={c.id} style={listItemStyle(isSelected, isBaseline)} onClick={() => setSelectedId(c.id)}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: meta.dot, marginTop: '6px', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>{meta.label}</span>
                  {isBaseline && (
                    <span style={{ fontSize: '10px', color: 'var(--accent)', border: '1px solid var(--accent-line)', borderRadius: '4px', padding: '0 5px', lineHeight: '1.6' }}>
                      Baseline 📌
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--faint)', marginTop: '2px' }}>
                  {fmtCheckpointDate(c.createdAt)}
                  {c.createdBy ? ` · ${c.createdBy}` : ''}
                </div>
                {c.comment && (
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', fontStyle: 'italic' }}>
                    {c.comment}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ flex: '1 1 auto', display: 'flex', gap: '16px' }}>
        <div style={panelStyle}>
          <div style={panelTitle}>Snapshot · {CHECKPOINT_KIND_META[selected.kind].label}</div>
          <div style={diffText}>
            {snapshotRows.map((r) => (
              <div key={r.key}>
                <span style={{ color: DIFF_COLORS[r.status] }}>{r.status === 'removed' ? '- ' : '  '}{r.key}: {r.left}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={panelStyle}>
          <div style={panelTitle}>Current</div>
          <div style={diffText}>
            {currentRows.map((r) => (
              <div key={r.key}>
                <span style={{ color: DIFF_COLORS[r.status] }}>{r.status === 'added' ? '+ ' : '  '}{r.key}: {r.right}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
