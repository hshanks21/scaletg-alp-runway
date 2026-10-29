import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { LayoutGrid, BarChart3, Flag, Info } from 'lucide-react';

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
  updatedAt: string;
  tasks: any[];
}

const STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  draft: { label: 'Draft', dot: '#7C8780', text: '#4A544D' },
  submitted: { label: 'Submitted', dot: '#D9A441', text: '#8A6A1C' },
  approved: { label: 'Approved', dot: '#3FA85E', text: '#187430' },
  rejected: { label: 'Rejected', dot: '#E0805C', text: '#B4512C' },
  modified: { label: 'Modified', dot: '#B76BA3', text: '#8E4A80' },
};

type ViewTab = 'budget' | 'bva' | 'checkpoints';

function formatCurrency(n: string | number): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}



function fmtShortDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function relTime(iso: string): string {
  if (!iso) return 'just now';
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function computeProgress(startDate: string, endDate: string, periodType: string): { current: number; total: number; unit: string } {
  const unit = periodType === 'monthly' ? 'Month' : 'Week';
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  let total = 1;
  if (periodType === 'monthly') {
    total = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1);
  } else {
    const diffDays = (end.getTime() - start.getTime()) / 86400000;
    total = Math.max(1, Math.ceil((diffDays + 1) / 7));
  }
  const now = new Date();
  let current = 1;
  if (now >= start) {
    if (now >= end) {
      current = total;
    } else if (periodType === 'monthly') {
      current = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
    } else {
      current = Math.floor((now.getTime() - start.getTime()) / (7 * 86400000)) + 1;
    }
  }
  current = Math.max(1, Math.min(total, current));
  return { current, total, unit };
}

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--faint)' }}>{label}</div>
      <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600, marginTop: '3px', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

const MARGIN_TARGET_PCT = 25;

const HERO: CSSProperties = { fontFamily: "'Space Grotesk', 'Inter', sans-serif", fontSize: '34px', fontWeight: 600, lineHeight: 1.1, color: 'var(--text)' };

function KpiCardShell({ title, info, alert, children, style }: { title: string; info?: string; alert?: boolean; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: alert ? 'rgba(180, 81, 44, 0.04)' : 'var(--panel)',
        borderRadius: '10px',
        padding: '14px 16px',
        border: alert ? '1px solid var(--hi)' : '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', gap: '10px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{title}</span>
        {info && (
          <span style={{ color: 'var(--faint)', display: 'inline-flex' }} title={info}>
            <Info size={13} />
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── KPI summary line (RUN-1) — one line, no big-number tiles ──

interface KpiData {
  forecast: {
    estTotalRevenue: number;
    estimatedMargin: number;
    estimatedMarginPct: number;
    budgetedRevenue: number;
    feesAtStandard: number;
    feesAtEngagement: number;
    realization: number;
    staffPmdHours: number;
    pctBelowDirector: number;
    pmdHours: number;
    staffHours: number;
    belowDirectorHours: number;
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
    const fee = f.budgetedRevenue || 0;
    const stdValue = f.feesAtStandard || 0;
    const labor = f.feesAtEngagement || 0;
    const revenue = f.estTotalRevenue || 0;
    const mPct = f.estimatedMarginPct * 100;
    const cost = revenue - f.estimatedMargin;
    const overrun = labor - fee;
    const overrunPct = fee > 0 ? Math.round((labor / fee) * 100) : 0;
    const belowTarget = mPct < MARGIN_TARGET_PCT;
    const pmdH = f.pmdHours || 0;
    const staffH = f.staffHours || 0;
    const consultantH = f.belowDirectorHours || 0;
    const directorH = Math.max(0, staffH - consultantH);
    const mixSum = Math.max(pmdH + staffH, 1);
    const staffBlocks = Math.max(1, Math.min(15, Math.round(f.staffPmdHours)));
    const maxBuild = Math.max(fee, labor, stdValue, revenue, 1);
    const gaugeMax = 40;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        {/* 1. Margin — tall left */}
        <KpiCardShell title="Margin" info="Estimated margin as a percentage of total revenue." alert={belowTarget} style={{ gridRow: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={HERO}>{mPct.toFixed(1)}%</span>
            {belowTarget && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(180, 81, 44, 0.12)', color: 'var(--hi)', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px' }}>↓ Below target</span>
            )}
          </div>
          <div>
            <div style={{ position: 'relative', height: '10px', background: 'var(--raised)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(MARGIN_TARGET_PCT / gaugeMax) * 100}%`, background: 'rgba(180, 81, 44, 0.12)' }} />
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(mPct / gaugeMax, 1) * 100}%`, background: 'var(--hi)', borderRadius: '999px' }} />
              <div style={{ position: 'absolute', left: `${(MARGIN_TARGET_PCT / gaugeMax) * 100}%`, top: '-2px', bottom: '-2px', width: '2px', background: 'var(--text)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--faint)', marginTop: '4px' }}>
              {[0, 10, 20, 30, 40].map(t => <span key={t}>{t}%</span>)}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--faint)', marginTop: '2px' }}>Target [{MARGIN_TARGET_PCT}%]</div>
          </div>
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: '8px' }}>Calculation</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div className="font-data" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{formatCurrency(revenue)}</div>
                <div style={{ fontSize: '10px', color: 'var(--faint)', marginTop: '2px' }}>Revenue</div>
              </div>
              <span style={{ color: 'var(--faint)', alignSelf: 'center' }}>−</span>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div className="font-data" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{formatCurrency(cost)}</div>
                <div style={{ fontSize: '10px', color: 'var(--faint)', marginTop: '2px' }}>Cost</div>
              </div>
              <span style={{ color: 'var(--faint)', alignSelf: 'center' }}>=</span>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div className="font-data" style={{ fontSize: '15px', fontWeight: 600, color: belowTarget ? 'var(--hi)' : 'var(--accent)' }}>{formatCurrency(f.estimatedMargin)}</div>
                <div style={{ fontSize: '10px', color: 'var(--faint)', marginTop: '2px' }}>Margin</div>
              </div>
            </div>
          </div>
        </KpiCardShell>

        {/* 2. Revenue build */}
        <KpiCardShell title="Revenue build" info="How estimated revenue stacks against fee, labor, and standard value.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {[
              { label: 'Fixed fee', v: fee, color: 'var(--text)' },
              { label: 'Labor (eng)', v: labor, color: overrun > 0 ? 'var(--hi)' : 'var(--accent)' },
              { label: 'Std value', v: stdValue, color: 'var(--accent-soft)' },
              { label: 'Revenue', v: revenue, color: 'var(--accent-btn)' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '74px', fontSize: '10px', color: 'var(--muted)', flexShrink: 0 }}>{r.label}</span>
                <div style={{ flex: 1, height: '12px', background: 'var(--raised)', borderRadius: '3px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(r.v / maxBuild) * 100}%`, background: r.color, borderRadius: '3px' }} />
                  <div style={{ position: 'absolute', left: `${(fee / maxBuild) * 100}%`, top: '-2px', bottom: '-2px', width: '1px', borderLeft: '1px dashed var(--faint)' }} />
                </div>
                <span className="font-data" style={{ fontSize: '11px', fontWeight: 600, color: r.v > fee ? 'var(--hi)' : 'var(--text)', flexShrink: 0 }}>{formatCurrency(r.v)}</span>
              </div>
            ))}
          </div>
          {overrun > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(180, 81, 44, 0.12)', color: 'var(--hi)', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px' }}>⚠ Labor +{formatCurrency(overrun)} over fee ({overrunPct}%)</span>
          )}
        </KpiCardShell>

        {/* 3. Realization */}
        <KpiCardShell title="Realization" info="Fees at engagement rates ÷ fees at standard rates.">
          <div style={HERO}>{(f.realization * 100).toFixed(1)}%</div>
          <div style={{ position: 'relative', height: '8px', background: 'var(--raised)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(f.realization * 100, 100)}%`, background: 'var(--accent-btn)', borderRadius: '999px' }} />
            <div style={{ position: 'absolute', left: `${Math.min(f.realization * 100, 100)}%`, top: '-2px', bottom: '-2px', width: '2px', background: 'var(--text)' }} />
          </div>
          <div style={{ position: 'relative', height: '14px', fontSize: '10px', color: 'var(--faint)' }}>
            <span style={{ position: 'absolute', left: '80%', transform: 'translateX(-50%)' }}>80%</span>
            <span style={{ position: 'absolute', left: '90%', transform: 'translateX(-50%)' }}>90%</span>
            <span style={{ position: 'absolute', left: '100%', transform: 'translateX(-50%)' }}>100%</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--faint)' }}>Engagement rates ÷ standard rates</div>
        </KpiCardShell>

        {/* 4. Leverage · Staff / PMD */}
        <KpiCardShell title="Leverage · Staff / PMD" info="Staff hours (Director + Consultant) per PMD hour.">
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)' }}>
            <span className="font-data">{f.staffPmdHours.toFixed(1)}</span>
            <span style={{ color: 'var(--faint)', fontSize: '16px', margin: '0 6px' }}>:</span>
            <span className="font-data" style={{ color: 'var(--faint)' }}>1</span>
          </div>
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--text)' }} title="PMD" />
            {Array.from({ length: staffBlocks }).map((_, i) => (
              <span key={i} style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-soft)' }} />
            ))}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--faint)' }}>PMD {pmdH.toFixed(1)}h · Staff {staffH.toFixed(1)}h</div>
        </KpiCardShell>

        {/* 5. Staffing mix */}
        <KpiCardShell title="Staffing mix" info="Share of total hours by level.">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={HERO}>{(f.pctBelowDirector * 100).toFixed(1)}%</span>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>below Director</span>
          </div>
          <div style={{ display: 'flex', height: '12px', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${(consultantH / mixSum) * 100}%`, background: 'var(--accent-btn)' }} />
            <div style={{ width: `${(directorH / mixSum) * 100}%`, background: 'var(--accent)' }} />
            <div style={{ width: `${(pmdH / mixSum) * 100}%`, background: 'var(--accent-soft)' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '10px', color: 'var(--faint)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--accent-btn)' }} /> Consultant {consultantH.toFixed(2)}h</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--accent)' }} /> Director {directorH.toFixed(1)}h</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--accent-soft)' }} /> PMD {pmdH.toFixed(1)}h</span>
          </div>
        </KpiCardShell>
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
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

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
  const meta = STATUS_META[engagement.status] || { label: engagement.status, dot: '#7C8780', text: '#4A544D' };
  const prog = computeProgress(engagement.startDate, engagement.endDate, engagement.periodType);
  const progPct = prog.total > 0 ? Math.round((prog.current / prog.total) * 100) : 0;

  const tabs: { key: ViewTab; label: string; icon: typeof LayoutGrid }[] = [
    { key: 'budget', label: 'Budget', icon: LayoutGrid },
    { key: 'bva', label: 'Budget vs. Actual', icon: BarChart3 },
    { key: 'checkpoints', label: 'Checkpoints', icon: Flag },
  ];

  return (
    <div>
      {/* Project header */}
      <div
        style={{
          background: 'var(--panel)',
          borderRadius: '12px',
          padding: '18px 24px',
          border: '1px solid var(--line)',
          marginBottom: '16px',
        }}
      >
        {/* Breadcrumb + status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            <span style={{ color: 'var(--faint)' }}>Engagements</span>
            <span style={{ color: 'var(--faint)' }}> / </span>
            <span>{engagement.clientName}</span>
          </div>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: `${meta.dot}1f`,
              color: theme === 'dark' ? meta.dot : meta.text,
              fontSize: '12px', fontWeight: 600,
              padding: '3px 10px', borderRadius: '999px', lineHeight: 1,
            }}
          >
            <span>{engagement.status === 'approved' ? '✓' : '●'}</span>
            {meta.label}
          </span>
        </div>

        {/* Title + status + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '25px', fontWeight: 600, color: 'var(--text)', fontFamily: "'Fraunces', Georgia, serif", letterSpacing: '-0.01em', margin: 0 }}>{engagement.name}</h1>
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

        {/* Metadata row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
          <MetaItem label="Fee" value={`${formatCurrency(fee)} fixed`} />
          <MetaItem label="Cadence" value={capitalize(engagement.periodType)} />
          <MetaItem label="Dates" value={`${fmtShortDate(engagement.startDate)} – ${fmtShortDate(engagement.endDate)}`} />
          <MetaItem
            label="Progress"
            value={(
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '56px', height: '6px', background: 'var(--line)', borderRadius: '999px', overflow: 'hidden', display: 'inline-block' }}>
                  <span style={{ display: 'block', width: `${progPct}%`, height: '100%', background: 'var(--accent)', borderRadius: '999px' }} />
                </span>
                {prog.unit} {prog.current} of {prog.total}
              </span>
            )}
          />
          <MetaItem label="Owner" value={engagement.engagementOwner} />
          <MetaItem label="Last updated" value={`[${relTime(engagement.updatedAt)} by ${engagement.engagementOwner.split(' ')[0]}]`} />
        </div>
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--line)', marginBottom: '16px' }}>
        {tabs.map(tab => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '9px 18px',
                fontSize: '12.5px',
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--accent-btn)' : 'var(--muted)',
                background: active ? 'var(--panel)' : 'transparent',
                border: 'none',
                borderTop: active ? '3px solid var(--accent)' : '3px solid transparent',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
              }}
            >
              <Icon size={14} strokeWidth={active ? 2.5 : 2} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'budget' && <BudgetView engagement={engagement} />}
      {activeTab === 'bva' && <BvaView engagementId={engagement.id} tasks={engagement.tasks} />}
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
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());

  const toggleCollapse = (taskId: string) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  };

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

  const ghostBtn: CSSProperties = {
    background: 'transparent', border: '1px solid var(--line-strong)', color: 'var(--muted)',
    fontSize: '12px', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '6px',
  };
  const accentBtn: CSSProperties = {
    background: 'var(--accent-btn)', color: '#fff', border: 'none',
    fontSize: '12px', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '6px',
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (!parts[0]) return '?';
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  };

  const fmtWk = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso.slice(0, 10) + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const cellBg = (h: number) => {
    if (h >= 15) return 'var(--accent-btn)';
    if (h >= 5) return 'var(--accent-soft)';
    if (h > 0) return 'var(--raised)';
    return 'transparent';
  };
  const cellFg = (h: number) => (h >= 15 ? '#fff' : 'var(--text)');

  const periodCols: { periodStart: string; periodEnd: string }[] = (() => {
    const map = new Map<string, { periodStart: string; periodEnd: string }>();
    for (const t of tasks) for (const a of t.allocations || []) for (const p of a.periods || []) {
      if (!map.has(p.periodStart)) map.set(p.periodStart, { periodStart: p.periodStart, periodEnd: p.periodEnd });
    }
    return [...map.values()].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  })();

  const isThisWeek = (start: string, end: string) => {
    const now = new Date();
    return now >= new Date(start + 'T00:00:00') && now <= new Date(end + 'T23:59:59');
  };

  const totalResources = tasks.reduce((n, t) => n + (t.allocations?.length || 0), 0);
  const fee = parseFloat(engagement.agreedBaseFees || '0') + parseFloat(engagement.contingentFees || '0');

  const colHours = periodCols.map((c) => {
    let h = 0;
    for (const t of tasks) for (const a of t.allocations || []) for (const pp of a.periods || []) {
      if (pp.periodStart === c.periodStart) h += parseFloat(pp.hours || '0');
    }
    return h;
  });
  const colCost = periodCols.map((c) => {
    let cost = 0;
    for (const t of tasks) for (const a of t.allocations || []) for (const pp of a.periods || []) {
      if (pp.periodStart === c.periodStart) cost += parseFloat(pp.hours || '0') * parseFloat(a.engagementRate || '0');
    }
    return cost;
  });
  const totalHours = colHours.reduce((sum, h) => sum + h, 0);
  const totalCost = colCost.reduce((sum, c) => sum + c, 0);
  let _cum = 0;
  const cumPct = colCost.map((c) => { _cum += c; return fee > 0 ? (_cum / fee) * 100 : 0; });

  return (
    <div>
      <KpiSummaryLine engagementId={engagement.id} mode="budget" refreshToken={refreshToken} />

      <div style={{ background: 'var(--panel)', borderRadius: '10px', border: '1px solid var(--line)', overflow: 'hidden', marginBottom: '14px' }}>
        {/* Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '14px 20px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Staffing plan</span>
            <span style={{ fontSize: '11px', color: 'var(--faint)' }}>{periodCols.length} weeks · {totalResources} resources · {tasks.length} task{tasks.length === 1 ? '' : 's'}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button style={ghostBtn} title="Spread a total across selected cells">⇄ Spread hours</button>
            <button style={ghostBtn} title="Fill selected cells to the right">→ Fill right</button>
            <button style={ghostBtn} title="Paste hours from a spreadsheet">⎘ Paste from Excel</button>
            <button style={ghostBtn} title="Toggle rate columns">$ Rates</button>
            <button style={accentBtn} onClick={() => setAddingTask(true)}>+ Add task</button>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <th style={{ textAlign: 'left', padding: '8px 20px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Resource</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Std → Eng rate</th>
              {periodCols.map((c, i) => (
                <th key={c.periodStart} style={{ textAlign: 'center', padding: '8px 6px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>
                  <div>{isThisWeek(c.periodStart, c.periodEnd) ? (
                    <span style={{ background: 'var(--accent-btn)', color: '#fff', fontSize: '10px', padding: '1px 7px', borderRadius: '999px', fontWeight: 600 }}>This week</span>
                  ) : `Wk ${i + 1}`}</div>
                  <div style={{ fontSize: '10px', color: 'var(--faint)', fontWeight: 400, marginTop: '2px' }}>W/E {fmtWk(c.periodEnd)}</div>
                </th>
              ))}
              <th style={{ borderLeft: '1px solid var(--line)', textAlign: 'right', padding: '8px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Hours</th>
              <th style={{ textAlign: 'right', padding: '8px 20px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Cost (eng)</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, ti) => {
              const allocs = task.allocations || [];
              const taskHours = allocs.reduce((sum: number, a: any) => sum + (a.periods || []).reduce((x: number, pp: any) => x + parseFloat(pp.hours || '0'), 0), 0);
              const taskCost = allocs.reduce((sum: number, a: any) => sum + (a.periods || []).reduce((x: number, pp: any) => x + parseFloat(pp.hours || '0') * parseFloat(a.engagementRate || '0'), 0), 0);
              const estDiff = taskHours - parseFloat(task.estimatedHours || '0');
              return (
                <>
                  <tr key={'task-' + task.id} style={{ background: 'var(--raised)', borderBottom: '1px solid var(--line)' }}>
                    <td colSpan={2} style={{ padding: '8px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', color: 'var(--accent)', cursor: 'pointer' }} onClick={() => toggleCollapse(task.id)}>{collapsedTasks.has(task.id) ? '▶' : '▼'}</span>
                        {editingTaskId === task.id ? (
                          <input autoFocus value={editingTaskName} onChange={(e) => setEditingTaskName(e.target.value)} onBlur={() => saveTaskName(task.id)} onKeyDown={(e) => { if (e.key === 'Enter') saveTaskName(task.id); else if (e.key === 'Escape') setEditingTaskId(null); }} style={budgetInputStyle} />
                        ) : (
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }} onClick={() => { setEditingTaskId(task.id); setEditingTaskName(task.name); }}>{task.name}</span>
                        )}
                        <span style={{ fontSize: '10.5px', color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: '999px', padding: '1px 8px' }}>{Math.round(taskHours)}h alloc · {task.estimatedHours || 0}h est · {estDiff >= 0 ? '+' : ''}{estDiff.toFixed(1)}h</span>
                        <span style={{ fontSize: '10.5px', color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: '999px', padding: '1px 8px' }}>{formatCurrency(taskCost)}</span>
                      </div>
                    </td>
                    <td colSpan={periodCols.length + 2} style={{ textAlign: 'right', padding: '8px 20px' }}>
                      <div style={{ display: 'inline-flex', gap: '2px' }}>
                        <button style={iconBtn} title="Split hours evenly">⧉</button>
                        <button style={iconBtn} title="More">⋯</button>
                        <button style={iconBtn} onClick={() => moveTask(task.id, -1)} disabled={ti === 0} title="Move up">↑</button>
                        <button style={iconBtn} onClick={() => moveTask(task.id, 1)} disabled={ti === tasks.length - 1} title="Move down">↓</button>
                        <button style={iconBtn} onClick={() => deleteTask(task.id)} title="Delete task">✕</button>
                      </div>
                    </td>
                  </tr>

                  {!collapsedTasks.has(task.id) ? (
                    <>
                  {allocs.map((alloc: any) => {
                    const std = parseFloat(alloc.standardRate || '0');
                    const eng = parseFloat(alloc.engagementRate || '0');
                    const disc = std > 0 ? ((eng - std) / std) * 100 : 0;
                    const rowHours = (alloc.periods || []).reduce((sum: number, pp: any) => sum + parseFloat(pp.hours || '0'), 0);
                    const rowCost = (alloc.periods || []).reduce((sum: number, pp: any) => sum + parseFloat(pp.hours || '0') * eng, 0);
                    return (
                      <tr key={alloc.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '10px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: alloc.isPlaceholder ? 'transparent' : 'var(--accent-btn)', border: alloc.isPlaceholder ? '1px dashed var(--faint)' : 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: alloc.isPlaceholder ? 'var(--faint)' : '#fff', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{alloc.isPlaceholder ? '?' : initials(alloc.resourceName || '')}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', fontStyle: alloc.isPlaceholder ? 'italic' : 'normal' }}>{alloc.resourceName || 'Unknown'}</div>
                              <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                                {alloc.categoryName ? <span style={{ fontSize: '10px', color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: '4px', padding: '0 5px' }}>{alloc.categoryName}</span> : null}
                                {alloc.isPlaceholder ? <span style={{ fontSize: '10px', color: 'var(--accent)', border: '1px dashed var(--accent)', borderRadius: '4px', padding: '0 5px' }}>Open role</span> : rowHours === 0 ? <span style={{ fontSize: '10px', color: 'var(--hi)', background: 'rgba(180, 81, 44, 0.1)', borderRadius: '4px', padding: '0 5px' }}>Not allocated</span> : null}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '11.5px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                          <span className="font-data">${std.toLocaleString()}</span> <span style={{ color: 'var(--faint)' }}>→</span> <span className="font-data">${eng.toLocaleString()}</span>
                          <div style={{ display: 'inline-block', fontSize: '10px', fontWeight: 600, color: 'var(--accent-btn)', background: 'var(--raised)', borderRadius: '999px', padding: '1px 7px', marginTop: '3px' }}>{disc.toFixed(1)}%</div>
                        </td>
                        {periodCols.map((c) => {
                          const pp = (alloc.periods || []).find((x: any) => x.periodStart === c.periodStart);
                          const val = parseFloat(pp?.hours || '0');
                          return (
                            <td key={c.periodStart} style={{ padding: '6px 4px', textAlign: 'center' }}>
                              {editingHours?.periodId === pp?.id ? (
                                <input autoFocus value={editingHours!.value} onChange={(e) => setEditingHours({ allocId: alloc.id, periodId: pp.id, value: e.target.value })} onBlur={() => saveHours()} onKeyDown={(e) => { if (e.key === 'Enter') saveHours(); else if (e.key === 'Escape') setEditingHours(null); }} style={{ ...budgetInputStyle, width: '48px', textAlign: 'center' }} />
                              ) : (
                                <div className="font-data" onClick={pp ? () => setEditingHours({ allocId: alloc.id, periodId: pp.id, value: pp.hours }) : undefined} style={{ cursor: pp ? 'pointer' : 'default', background: cellBg(val), color: cellFg(val), borderRadius: '4px', padding: '4px 0', border: val > 0 ? 'none' : '1px dashed var(--line)' }}>{val > 0 ? val.toFixed(1) : '—'}</div>
                              )}
                            </td>
                          );
                        })}
                        <td className="font-data" style={{ borderLeft: '1px solid var(--line)', padding: '10px 14px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{rowHours.toFixed(1)}</td>
                        <td className="font-data" style={{ padding: '10px 20px', textAlign: 'right', fontSize: '12px', color: 'var(--text)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            {formatCurrency(rowCost)}
                            <button style={iconBtn} onClick={() => removeResource(alloc.id)} title="Remove resource">✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  <tr key={'add-' + task.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td colSpan={periodCols.length + 4} style={{ padding: '6px 20px' }}>
                      {addResourceTaskId === task.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <input autoFocus value={resourceQuery} onChange={(e) => setResourceQuery(e.target.value)} placeholder="Search resources by name…" style={{ ...budgetInputStyle, width: '260px' }} />
                          {resourceResults.slice(0, 8).map((r: any) => (
                            <button key={r.id} onClick={() => addResource(task.id, r)} style={{ textAlign: 'left', fontSize: '11px', color: 'var(--text)', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}>{r.name} <span style={{ color: 'var(--faint)' }}>· {r.categoryName} · ${parseFloat(r.standardRate).toLocaleString()}</span></button>
                          ))}
                        </div>
                      ) : (
                        <button style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: '1px dashed var(--accent)', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }} onClick={() => setAddResourceTaskId(task.id)}>+ Add resource to {task.name}</button>
                      )}
                    </td>
                  </tr>
                    </>
                  ) : null}
                </>
              );
            })}

            {tasks.length === 0 && !addingTask ? (
              <tr><td colSpan={periodCols.length + 4} style={{ padding: '40px', textAlign: 'center', color: 'var(--faint)', fontSize: '12px' }}>No tasks yet. Click "+ Add task" to start building the budget.</td></tr>
            ) : null}
          </tbody>

          {tasks.length > 0 ? (
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--line)', background: 'var(--raised)' }}>
                <td colSpan={2} style={{ padding: '6px 20px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Weekly hours</td>
                {colHours.map((h, i) => <td key={i} className="font-data" style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>{h.toFixed(1)}</td>)}
                <td className="font-data" style={{ borderLeft: '1px solid var(--line)', textAlign: 'right', padding: '6px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>{totalHours.toFixed(1)}</td>
                <td style={{ padding: '6px 20px' }} />
              </tr>
              <tr style={{ borderTop: '1px solid var(--line)' }}>
                <td colSpan={2} style={{ padding: '6px 20px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Weekly cost (eng)</td>
                {colCost.map((c, i) => <td key={i} className="font-data" style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text)' }}>{formatCurrency(c)}</td>)}
                <td className="font-data" style={{ borderLeft: '1px solid var(--line)', textAlign: 'right', padding: '6px 14px', fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>{formatCurrency(totalCost)}</td>
                <td style={{ padding: '6px 20px' }} />
              </tr>
              <tr style={{ borderTop: '1px solid var(--line)' }}>
                <td colSpan={2} style={{ padding: '6px 20px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Cumulative vs. {formatCurrency(fee)} fee</td>
                {cumPct.map((pp, i) => (
                  <td key={i} style={{ textAlign: 'center', padding: '6px 4px' }}>
                    <div className="font-data" style={{ fontSize: '11px', color: pp > 100 ? 'var(--hi)' : 'var(--text)' }}>{pp > 100 ? '⚠ ' : ''}{Math.round(pp)}%</div>
                    <div style={{ height: '3px', background: 'var(--raised)', borderRadius: '999px', marginTop: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(pp, 100)}%`, height: '100%', background: pp > 100 ? 'var(--hi)' : 'var(--accent)' }} />
                    </div>
                  </td>
                ))}
                <td className="font-data" style={{ borderLeft: '1px solid var(--line)', textAlign: 'right', padding: '6px 14px', fontSize: '11px', fontWeight: 600, color: totalCost > fee ? 'var(--hi)' : 'var(--text)' }}>{formatCurrency(totalCost)}</td>
                <td style={{ padding: '6px 20px' }} />
              </tr>
            </tfoot>
          ) : null}
        </table>

        {/* Add task footer */}
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
            <button style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setAddingTask(true)}>+ Add Task</button>
          )}
        </div>

        {/* Legend + shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '10px 20px', borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--faint)' }}>
            <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Hours / week:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--raised)', border: '1px solid var(--line)' }} /> Under 5</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--accent-soft)' }} /> 5–15</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--accent)' }} /> 15+</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ color: 'var(--hi)' }}>!</span> Over-allocated</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '1px dashed var(--accent)' }} /> Open role</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--faint)' }}>Arrow keys to move · Enter to edit · Drag the corner to fill</div>
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
