import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { LayoutGrid, BarChart3, Flag, Info } from 'lucide-react';

interface EngagementDetail {
  id: string;
  clientName: string;
  name: string;
  engagementOwner: string;
  engagementType: string;
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
    const diffDays = Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000);
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
    totalHours: number;
    hoursByCategory: Record<string, number>;
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

// ── Budget Summary (header KPIs, above the staffing plan) ──

function monthSegments(startDate: string, endDate: string): { label: string; weeks: number; isCurrent: boolean }[] {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const segs: { label: string; weeks: number; isCurrent: boolean }[] = [];
  const now = new Date();
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const segStart = cursor > start ? cursor : start;
    const monthEnd = new Date(y, m + 1, 0);
    const segEnd = end < monthEnd ? end : monthEnd;
    const weeks = Math.max(1, Math.round((segEnd.getTime() - segStart.getTime()) / (7 * 86400000)));
    segs.push({ label: cursor.toLocaleDateString('en-US', { month: 'short' }), weeks, isCurrent: now >= segStart && now <= segEnd });
    cursor = new Date(y, m + 1, 1);
  }
  return segs;
}

function BudgetSummary({ engagement, refreshToken = 0 }: { engagement: EngagementDetail; refreshToken?: number }) {
  const [kpis, setKpis] = useState<KpiData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/engagements/${engagement.id}/kpis?mode=budget`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success) setKpis(d.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [engagement.id, refreshToken]);

  const fmtH = (h: number) => `${Math.round(h * 100) / 100}h`;

  if (!kpis) {
    return <div style={{ marginBottom: '14px', padding: '20px', color: 'var(--faint)', fontSize: '12px' }}>Budget summary loading…</div>;
  }

  const b = kpis.budget;
  const f = kpis.forecast;
  const fee = f.budgetedRevenue || 0;
  const marginPct = (b.marginPct ?? 0) * 100;
  const margin = fee * (b.marginPct ?? 0);
  const cost = fee - margin;
  const costPct = fee > 0 ? (cost / fee) * 100 : 0;
  const realizationPct = (b.realization ?? 0) * 100;
  const staffPmd = b.staffPmdHours ?? 0;
  const belowDirectorPct = (b.pctBelowDirector ?? 0) * 100;
  const totalHours = f.totalHours || 0;
  const byCat = f.hoursByCategory || {};
  const pmdH = byCat.PMD || 0;
  const directorH = byCat.Director || 0;
  const consultantH = byCat.Consultant || 0;
  const catSum = Math.max(pmdH + directorH + consultantH, 1);

  const prog = computeProgress(engagement.startDate, engagement.endDate, engagement.periodType);
  const weeksLeft = prog.total - prog.current + 1;
  const months = monthSegments(engagement.startDate, engagement.endDate);

  const belowTarget = marginPct < MARGIN_TARGET_PCT;
  const marginShort = MARGIN_TARGET_PCT - marginPct;
  const avgDiscount = 100 - realizationPct;
  const shape = belowDirectorPct >= 60 ? 'Bottom-heavy' : belowDirectorPct <= 40 ? 'Top-heavy' : 'Balanced';
  const typeLabel = engagement.engagementType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const cardStyle: CSSProperties = { background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '10px', padding: '14px 16px' };
  const labelStyle: CSSProperties = { fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', color: 'var(--faint)' };

  return (
    <div style={{ marginBottom: '14px' }}>
      {/* Budget summary card: title + PERIOD + FEE */}
      <div style={{ ...cardStyle, marginBottom: '12px' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Budget summary</span>
          <span style={{ fontSize: '11px', color: 'var(--faint)' }}>{typeLabel} · {prog.total} weeks · Planning</span>
        </div>

        {/* PERIOD + FEE (two columns) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
          {/* PERIOD */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <span style={labelStyle}>PERIOD</span>
              <span style={{ fontSize: '11px', color: 'var(--faint)' }}>Week {prog.current} of {prog.total} · {weeksLeft} weeks left</span>
            </div>
            <div style={{ fontSize: '25px', fontWeight: 600, color: 'var(--text)', marginTop: '8px', lineHeight: 1.2 }}>{fmtShortDate(engagement.startDate)} → {fmtShortDate(engagement.endDate)}</div>
            <div style={{ fontSize: '11px', color: 'var(--faint)', marginTop: '4px' }}>{prog.total} weeks · {fmtH(totalHours)} budgeted</div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '14px', alignItems: 'flex-start' }}>
              {months.map((mo) => (
                <div key={mo.label} style={{ flex: mo.weeks, textAlign: 'center' }}>
                  <div style={{ height: '8px', background: mo.isCurrent ? 'var(--accent)' : 'var(--raised)', borderRadius: '2px', border: `1px solid ${mo.isCurrent ? 'var(--accent)' : 'var(--line)'}` }} />
                  <div style={{ fontSize: '9px', color: mo.isCurrent ? 'var(--accent-btn)' : 'var(--faint)', marginTop: '3px', whiteSpace: 'nowrap' }}>{mo.label}{mo.isCurrent ? ' · this week' : ''}</div>
                </div>
              ))}
            </div>
          </div>

          {/* FEE */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <span style={labelStyle}>FEE · WHERE THE {formatCurrency(fee)} GOES</span>
              {belowTarget && <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--hi)', whiteSpace: 'nowrap' }}>↓ Margin below [{MARGIN_TARGET_PCT}%] target</span>}
            </div>
            <div style={{ display: 'flex', gap: '24px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'baseline' }}>
              <span style={{ fontSize: '25px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}><span className="font-data">{formatCurrency(fee)}</span> <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--faint)' }}>fee</span></span>
              <span style={{ fontSize: '25px', fontWeight: 700, color: 'var(--muted)', lineHeight: 1.2 }}><span className="font-data">{formatCurrency(cost)}</span> <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--faint)' }}>cost</span></span>
              <span style={{ fontSize: '25px', fontWeight: 700, color: belowTarget ? 'var(--hi)' : 'var(--accent)', lineHeight: 1.2 }}><span className="font-data">{formatCurrency(margin)}</span> <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--faint)' }}>margin</span></span>
            </div>
            <div style={{ display: 'flex', height: '10px', borderRadius: '999px', overflow: 'hidden', background: 'var(--raised)', marginTop: '14px' }}>
              <div style={{ width: `${costPct}%`, background: 'var(--accent-btn)' }} />
              <div style={{ width: `${marginPct}%`, background: 'var(--hi)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--faint)', marginTop: '4px' }}>
              <span>Cost {costPct.toFixed(1)}%</span>
              <span>Margin {marginPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {/* MARGIN */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={labelStyle}>MARGIN</span>
            {belowTarget && <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--hi)' }}>↓ Below target</span>}
          </div>
          <div className="font-data" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>{marginPct.toFixed(1)}%</div>
          <div style={{ position: 'relative', height: '8px', background: 'var(--raised)', borderRadius: '999px', marginTop: '10px' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(MARGIN_TARGET_PCT / 40) * 100}%`, background: 'rgba(180, 81, 44, 0.12)' }} />
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(marginPct / 40, 1) * 100}%`, background: 'var(--hi)', borderRadius: '999px' }} />
            <div style={{ position: 'absolute', left: `${(MARGIN_TARGET_PCT / 40) * 100}%`, top: '-2px', bottom: '-2px', width: '2px', background: 'var(--text)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--faint)', marginTop: '3px' }}>
            <span>0%</span><span>10%</span><span style={{ color: 'var(--muted)' }}>[{MARGIN_TARGET_PCT}%]</span><span>30%</span><span>40%</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--faint)', marginTop: '8px' }}>{marginShort.toFixed(1)} pts to [{MARGIN_TARGET_PCT}%] target</div>
        </div>

        {/* REALIZATION */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={labelStyle}>REALIZATION</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent)' }}>Within target</span>
          </div>
          <div className="font-data" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>{realizationPct.toFixed(1)}%</div>
          <div style={{ position: 'relative', height: '8px', background: 'var(--raised)', borderRadius: '999px', marginTop: '10px' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(0, Math.min((realizationPct - 80) / 20, 1)) * 100}%`, background: 'var(--accent-btn)', borderRadius: '999px' }} />
            <div style={{ position: 'absolute', left: '50%', top: '-2px', bottom: '-2px', width: '2px', background: 'var(--text)' }} />
          </div>
          <div style={{ position: 'relative', height: '14px', fontSize: '9px', color: 'var(--faint)' }}>
            <span style={{ position: 'absolute', left: 0 }}>80%</span>
            <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', color: 'var(--muted)' }}>90% [target]</span>
            <span style={{ position: 'absolute', right: 0 }}>100%</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--faint)', marginTop: '6px' }}>Engagement ÷ standard rates · {avgDiscount.toFixed(1)}% avg discount</div>
        </div>

        {/* STAFFING SHAPE */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={labelStyle}>STAFFING SHAPE</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted)' }}>{shape}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span className="font-data" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{staffPmd.toFixed(1)}<span style={{ color: 'var(--faint)', fontSize: '14px' }}> : 1</span></span>
            <span style={{ fontSize: '10px', color: 'var(--faint)' }}>Staff / PMD hours</span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginTop: '6px' }}>{belowDirectorPct.toFixed(1)}% <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--faint)' }}>hrs below Director · ≥ [60%]</span></div>
          <div style={{ display: 'flex', height: '10px', borderRadius: '3px', overflow: 'hidden', marginTop: '8px' }}>
            <div style={{ width: `${(consultantH / catSum) * 100}%`, background: 'var(--accent-btn)' }} />
            <div style={{ width: `${(directorH / catSum) * 100}%`, background: 'var(--accent)' }} />
            <div style={{ width: `${(pmdH / catSum) * 100}%`, background: 'var(--accent-soft)' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '9px', color: 'var(--faint)', marginTop: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '7px', height: '7px', borderRadius: '2px', background: 'var(--accent-btn)' }} /> Consultant {fmtH(consultantH)}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '7px', height: '7px', borderRadius: '2px', background: 'var(--accent)' }} /> Director {fmtH(directorH)}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '7px', height: '7px', borderRadius: '2px', background: 'var(--accent-soft)' }} /> PMD {fmtH(pmdH)}</span>
          </div>
        </div>
      </div>
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

  const meta = STATUS_META[engagement.status] || { label: engagement.status, dot: '#7C8780', text: '#4A544D' };

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
          <MetaItem label="Cadence" value={capitalize(engagement.periodType)} />
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

// ── Budget View — stacked weeks (time runs vertically) ──

const budgetInputStyle: CSSProperties = {
  fontSize: '11px',
  padding: '3px 8px',
  background: 'var(--panel)',
  border: '1px solid var(--line-strong)',
  borderRadius: '4px',
  color: 'var(--text)',
};

// Categorical palette for per-person segments. Mid-tone so each hue reads on
// both the dark and light themes; order is stable so a person keeps their color.
const PERSON_PALETTE = ['#3FA85E', '#D9A441', '#B76BA3', '#5B8DEF', '#E0805C', '#45B8B0', '#9A7B4F', '#7B8BD9'];

function BudgetView({ engagement }: { engagement: EngagementDetail }) {
  const [tasks, setTasks] = useState<any[]>(engagement.tasks || []);
  const [refreshToken, setRefreshToken] = useState(0);
  const [expandedMonths, setExpandedMonths] = useState<Set<string> | null>(null);
  const [openWeek, setOpenWeek] = useState<string | null | undefined>(undefined);
  const [editingHours, setEditingHours] = useState<{ allocId: string; periodId: string; value: string } | null>(null);
  const [editingRate, setEditingRate] = useState<{ allocId: string; value: string } | null>(null);
  const [addResourceOpen, setAddResourceOpen] = useState(false);
  const [resourceQuery, setResourceQuery] = useState('');
  const [resourceResults, setResourceResults] = useState<any[]>([]);

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

  // ── flat resource pool (all allocations across tasks) ──
  const allocations = tasks.flatMap((t) => (t.allocations || []).map((a: any) => ({ ...a, _taskId: t.id })));

  // ── weeks (period columns) ──
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
  const isPastWeek = (end: string) => new Date() > new Date(end + 'T23:59:59');

  const fmtWk = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso.slice(0, 10) + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const fmtH = (h: number) => `${Math.round(h * 100) / 100}h`;
  const fmtCost = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${Math.round(n).toLocaleString()}`;
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (!parts[0]) return '?';
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  };

  const periodFor = (alloc: any, periodStart: string) => (alloc.periods || []).find((p: any) => p.periodStart === periodStart);
  const personColor = (idx: number) => PERSON_PALETTE[idx % PERSON_PALETTE.length];

  // ── per-week aggregates ──
  const weekHoursFor = (alloc: any, periodStart: string) => parseFloat(periodFor(alloc, periodStart)?.hours || '0');
  const weekTotalHours = (periodStart: string) => allocations.reduce((s, a) => s + weekHoursFor(a, periodStart), 0);
  const weekTotalCost = (periodStart: string) => allocations.reduce((s, a) => s + weekHoursFor(a, periodStart) * parseFloat(a.engagementRate || '0'), 0);
  const weekStaffed = (periodStart: string) => allocations.filter((a) => weekHoursFor(a, periodStart) > 0).length;

  const segmentsFor = (periodStart: string) => {
    const total = weekTotalHours(periodStart);
    if (total <= 0) return [];
    return allocations
      .map((a, i) => ({ name: a.resourceName, hours: weekHoursFor(a, periodStart), color: personColor(i) }))
      .filter((s) => s.hours > 0)
      .map((s) => ({ ...s, pct: (s.hours / total) * 100 }));
  };

  // ── month groups ──
  const monthGroups = (() => {
    const groups: { key: string; label: string; weeks: { periodStart: string; periodEnd: string }[]; isPast: boolean; isCurrent: boolean; hours: number; cost: number }[] = [];
    const map = new Map<string, number>();
    periodCols.forEach((c) => {
      const d = new Date(c.periodEnd.slice(0, 10) + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, groups.length);
        groups.push({ key, label: d.toLocaleDateString('en-US', { month: 'long' }), weeks: [], isPast: true, isCurrent: false, hours: 0, cost: 0 });
      }
      const g = groups[map.get(key)!];
      g.weeks.push(c);
      g.hours += weekTotalHours(c.periodStart);
      g.cost += weekTotalCost(c.periodStart);
      if (isThisWeek(c.periodStart, c.periodEnd)) g.isCurrent = true;
    });
    const now = new Date();
    for (const g of groups) g.isPast = g.weeks.every((w) => now > new Date(w.periodEnd + 'T23:59:59'));
    return groups;
  })();

  const currentWeek = periodCols.find((c) => isThisWeek(c.periodStart, c.periodEnd));

  // default expansion: current + future months; if everything is past, the last month
  const defaultExpandedKeys = (() => {
    const notPast = monthGroups.filter((m) => !m.isPast).map((m) => m.key);
    if (notPast.length) return new Set(notPast);
    const last = monthGroups[monthGroups.length - 1];
    return new Set(last ? [last.key] : []);
  })();
  const expanded = expandedMonths ?? defaultExpandedKeys;

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const base = prev ?? defaultExpandedKeys;
      const next = new Set(base);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const expandAll = () => setExpandedMonths(new Set(monthGroups.map((m) => m.key)));
  const collapseAll = () => setExpandedMonths(new Set());

  const defaultOpenKey = currentWeek?.periodStart ?? periodCols[periodCols.length - 1]?.periodStart ?? null;
  const openKey = openWeek === undefined ? defaultOpenKey : openWeek;
  const toggleWeek = (periodStart: string) => setOpenWeek(openKey === periodStart ? null : periodStart);

  const jumpToThisWeek = () => {
    const target = currentWeek ?? periodCols[periodCols.length - 1];
    if (!target) return;
    const d = new Date(target.periodEnd.slice(0, 10) + 'T00:00:00');
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setExpandedMonths(new Set([key]));
    setOpenWeek(target.periodStart);
  };

  const weekIndex = (periodStart: string) => periodCols.findIndex((c) => c.periodStart === periodStart) + 1;

  // ── editing ──
  const saveHours = async () => {
    if (!editingHours) return;
    await api('PATCH', `/api/engagements/${engagement.id}/allocations/${editingHours.allocId}/periods`, {
      periods: [{ id: editingHours.periodId, hours: editingHours.value }],
    });
    setEditingHours(null);
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

  const addResource = async (resource: any) => {
    const taskId = tasks[0]?.id;
    if (!taskId) return;
    await api('POST', `/api/engagements/${engagement.id}/allocations`, {
      taskId,
      resourceId: resource.id,
      engagementRate: resource.standardRate,
    });
    setAddResourceOpen(false);
    setResourceQuery('');
    setResourceResults([]);
    await reload();
    bumpKpi();
  };

  const removeResource = async (allocId: string) => {
    await api('DELETE', `/api/engagements/${engagement.id}/allocations/${allocId}`);
    await reload();
    bumpKpi();
  };

  const copyFromPreviousWeek = async (weekStart: string) => {
    const idx = periodCols.findIndex((c) => c.periodStart === weekStart);
    if (idx <= 0) return;
    const prev = periodCols[idx - 1].periodStart;
    for (const alloc of allocations) {
      const curP = periodFor(alloc, weekStart);
      const prevP = periodFor(alloc, prev);
      if (curP && prevP) {
        await api('PATCH', `/api/engagements/${engagement.id}/allocations/${alloc.id}/periods`, {
          periods: [{ id: curP.id, hours: prevP.hours }],
        });
      }
    }
    await reload();
    bumpKpi();
  };

  const applyToRemainingWeeks = async (weekStart: string) => {
    const idx = periodCols.findIndex((c) => c.periodStart === weekStart);
    const futureStarts = periodCols.slice(idx + 1).map((c) => c.periodStart);
    for (const alloc of allocations) {
      const srcP = periodFor(alloc, weekStart);
      if (!srcP) continue;
      const updates = futureStarts
        .map((s) => periodFor(alloc, s))
        .filter((p: any) => p)
        .map((p: any) => ({ id: p.id, hours: srcP.hours }));
      if (updates.length) {
        await api('PATCH', `/api/engagements/${engagement.id}/allocations/${alloc.id}/periods`, { periods: updates });
      }
    }
    await reload();
    bumpKpi();
  };

  // ── resource search ──
  useEffect(() => {
    if (!addResourceOpen) return;
    if (!resourceQuery.trim()) { setResourceResults([]); return; }
    const t = window.setTimeout(async () => {
      const d = await api('GET', `/api/resources?search=${encodeURIComponent(resourceQuery.trim())}`);
      if (d.success) setResourceResults(d.data);
    }, 250);
    return () => window.clearTimeout(t);
  }, [resourceQuery, addResourceOpen]);

  // ── people (totals by person) ──
  const people = allocations.map((a, i) => ({
    ...a,
    idx: i,
    hours: (a.periods || []).reduce((s: number, p: any) => s + parseFloat(p.hours || '0'), 0),
    cost: (a.periods || []).reduce((s: number, p: any) => s + parseFloat(p.hours || '0') * parseFloat(a.engagementRate || '0'), 0),
  }));
  const totalHours = people.reduce((s, p) => s + p.hours, 0);
  const totalCost = people.reduce((s, p) => s + p.cost, 0);

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
  const iconBtn: CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--faint)', fontSize: '11px', padding: '2px 5px',
  };

  const gridCols: CSSProperties = { display: 'grid', gridTemplateColumns: '150px 1fr 84px 96px', gap: '12px', alignItems: 'center' };

  return (
    <div>
      <BudgetSummary engagement={engagement} refreshToken={refreshToken} />

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* ── LEFT: stacked weeks ── */}
        <div style={{ flex: 1, minWidth: 0, background: 'var(--panel)', borderRadius: '10px', border: '1px solid var(--line)', overflow: 'hidden' }}>
          {/* Title bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '14px 20px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Staffing plan</span>
              <span style={{ fontSize: '11px', color: 'var(--faint)' }}>{periodCols.length} weeks · {allocations.length} resources</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button style={ghostBtn} onClick={expandAll}>Expand all</button>
              <button style={ghostBtn} onClick={collapseAll}>Collapse all</button>
              <button style={ghostBtn} onClick={jumpToThisWeek} title="Jump to the current week">This week</button>
            </div>
          </div>

          {/* Column header */}
          <div style={{ ...gridCols, padding: '10px 20px', borderBottom: '1px solid var(--line)' }}>
            <div />
            <div />
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textAlign: 'right' }}>HOURS</div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textAlign: 'right' }}>COST</div>
          </div>

          {/* Months → weeks */}
          {monthGroups.map((m) => (
            <div key={m.key}>
              <button
                onClick={() => toggleMonth(m.key)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', background: 'var(--raised)', border: 'none', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', cursor: 'pointer', padding: '9px 20px', color: 'var(--text)' }}
              >
                <span style={{ fontSize: '10px', color: 'var(--accent)' }}>{expanded.has(m.key) ? '⌄' : '›'}</span>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{m.label}</span>
                <span style={{ fontSize: '11px', color: 'var(--faint)' }}>{m.weeks.length} wk{m.weeks.length === 1 ? '' : 's'} · {fmtH(m.hours)} · {fmtCost(m.cost)}</span>
                {m.isCurrent ? <span style={{ fontSize: '10px', color: 'var(--accent-btn)', border: '1px solid var(--accent)', borderRadius: '999px', padding: '0 8px', fontWeight: 600 }}>Current</span> : null}
              </button>

              {expanded.has(m.key) && m.weeks.map((w) => {
                const start = w.periodStart;
                const totalH = weekTotalHours(start);
                const totalC = weekTotalCost(start);
                const staffed = weekStaffed(start);
                const segs = segmentsFor(start);
                const isCurrent = isThisWeek(w.periodStart, w.periodEnd);
                const isOpen = openKey === start;
                const wi = weekIndex(start);
                return (
                  <div key={start} style={{ borderBottom: '1px solid var(--line)', borderLeft: isOpen ? '3px solid var(--accent-btn)' : '3px solid transparent' }}>
                    {/* Week row */}
                    <div
                      onClick={() => toggleWeek(start)}
                      style={{ ...gridCols, padding: '8px 20px', cursor: 'pointer', background: isCurrent ? 'var(--accent-soft)' : 'transparent' }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--accent)', width: '10px', textAlign: 'center' }}>{isOpen ? '⌄' : '›'}</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>W/E {fmtWk(w.periodEnd)}</span>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--faint)', marginTop: '1px', paddingLeft: '16px' }}>
                          {isCurrent ? (
                            <span style={{ color: 'var(--accent-btn)', fontWeight: 600 }}>This week</span>
                          ) : isPastWeek(w.periodEnd) ? (
                            `Past · Wk ${wi}`
                          ) : (
                            `Future · Wk ${wi}`
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div
                          title={segs.map((s) => `${s.name}: ${fmtH(s.hours)}`).join(' · ')}
                          style={{ display: 'flex', height: '16px', borderRadius: '4px', overflow: 'hidden', background: 'var(--raised)', flex: 1, border: isCurrent ? '1px solid var(--accent)' : '1px solid var(--line)' }}
                        >
                          {segs.map((s, i) => (
                            <div key={i} style={{ width: `${s.pct}%`, background: s.color }} />
                          ))}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{staffed} of {allocations.length} staffed</span>
                      </div>

                      <div className="font-data" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>{fmtH(totalH)}</div>
                      <div className="font-data" style={{ fontSize: '12px', color: 'var(--text)', textAlign: 'right' }}>{fmtCost(totalC)}</div>
                    </div>

                    {/* Expanded week detail */}
                    {isOpen ? (
                      <div style={{ borderTop: '1px solid var(--line)', background: 'var(--raised)', padding: '12px 20px 14px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--line)' }}>
                              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Resource</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Std rate</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Eng rate</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Hours</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Fees @ Std</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>Fees @ Eng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allocations.map((alloc, ai) => {
                              const pp = periodFor(alloc, start);
                              const hours = parseFloat(pp?.hours || '0');
                              const eng = parseFloat(alloc.engagementRate || '0');
                              const std = parseFloat(alloc.standardRate || '0');
                              const color = personColor(ai);
                              return (
                                <tr key={alloc.id} style={{ borderBottom: '1px solid var(--line)' }}>
                                  <td style={{ padding: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: alloc.isPlaceholder ? 'transparent' : 'var(--accent-btn)', border: alloc.isPlaceholder ? '1px dashed var(--faint)' : 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: alloc.isPlaceholder ? 'var(--faint)' : '#fff', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{alloc.isPlaceholder ? '?' : initials(alloc.resourceName || '')}</span>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', fontStyle: alloc.isPlaceholder ? 'italic' : 'normal' }}>{alloc.resourceName || 'Unknown'}</div>
                                        <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                                          {alloc.categoryName ? <span style={{ fontSize: '10px', color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: '4px', padding: '0 5px' }}>{alloc.categoryName}</span> : null}
                                          {alloc.isPlaceholder ? <span style={{ fontSize: '10px', color: 'var(--accent)', border: '1px dashed var(--accent)', borderRadius: '4px', padding: '0 5px' }}>Open role</span> : hours === 0 ? <span style={{ fontSize: '10px', color: 'var(--hi)', background: 'rgba(180, 81, 44, 0.1)', borderRadius: '4px', padding: '0 5px' }}>Not allocated</span> : null}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'right' }}>
                                    <span className="font-data" style={{ fontSize: '11.5px', color: 'var(--faint)' }}>${std.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'right' }}>
                                    {editingRate?.allocId === alloc.id ? (
                                      <input autoFocus value={editingRate!.value} onChange={(e) => setEditingRate({ allocId: alloc.id, value: e.target.value })} onBlur={() => saveRate(alloc.id)} onKeyDown={(e) => { if (e.key === 'Enter') saveRate(alloc.id); else if (e.key === 'Escape') setEditingRate(null); }} style={{ ...budgetInputStyle, width: '70px', textAlign: 'right' }} />
                                    ) : (
                                      <span className="font-data" onClick={() => setEditingRate({ allocId: alloc.id, value: String(eng) })} style={{ fontSize: '11.5px', color: 'var(--text)', cursor: 'pointer' }}>${eng.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'right' }}>
                                    {editingHours?.periodId === pp?.id ? (
                                      <input autoFocus value={editingHours!.value} onChange={(e) => setEditingHours({ allocId: alloc.id, periodId: pp.id, value: e.target.value })} onBlur={saveHours} onKeyDown={(e) => { if (e.key === 'Enter') saveHours(); else if (e.key === 'Escape') setEditingHours(null); }} style={{ ...budgetInputStyle, width: '56px', textAlign: 'right' }} />
                                    ) : (
                                      <span className="font-data" onClick={pp ? () => setEditingHours({ allocId: alloc.id, periodId: pp.id, value: String(hours) }) : undefined} style={{ fontSize: '11.5px', color: hours > 0 ? 'var(--text)' : 'var(--faint)', cursor: pp ? 'pointer' : 'default' }}>{hours > 0 ? fmtH(hours) : '—'}</span>
                                    )}
                                  </td>
                                  <td className="font-data" style={{ padding: '8px', textAlign: 'right', fontSize: '11.5px', color: 'var(--faint)' }}>{hours > 0 ? fmtCost(hours * std) : '$0'}</td>
                                  <td className="font-data" style={{ padding: '8px', textAlign: 'right', fontSize: '11.5px', color: 'var(--text)' }}>{hours > 0 ? fmtCost(hours * eng) : '$0'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                          {addResourceOpen ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              <input autoFocus value={resourceQuery} onChange={(e) => setResourceQuery(e.target.value)} placeholder="Search resources by name…" style={{ ...budgetInputStyle, width: '240px' }} />
                              {resourceResults.slice(0, 8).map((r: any) => (
                                <button key={r.id} onClick={() => addResource(r)} style={{ textAlign: 'left', fontSize: '11px', color: 'var(--text)', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}>{r.name} <span style={{ color: 'var(--faint)' }}>· {r.categoryName} · ${parseFloat(r.standardRate).toLocaleString()}</span></button>
                              ))}
                            </div>
                          ) : (
                            <button style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: '1px dashed var(--accent)', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }} onClick={() => setAddResourceOpen(true)}>+ Add resource</button>
                          )}
                          <button style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: '1px solid var(--line)', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }} onClick={() => copyFromPreviousWeek(start)}>Copy from previous week</button>
                          <button style={{ fontSize: '11px', color: 'var(--muted)', background: 'none', border: '1px solid var(--line)', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }} onClick={() => applyToRemainingWeeks(start)}>↓ Apply to remaining weeks</button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}

          {monthGroups.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--faint)', fontSize: '12px' }}>No staffing plan yet. Add resources to start building the budget.</div>
          ) : null}

          {/* Engagement total */}
          {periodCols.length > 0 ? (
            <div style={{ ...gridCols, padding: '12px 20px', borderTop: '1px solid var(--line-strong)', background: 'var(--raised)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>Engagement total</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{periodCols.length} week{periodCols.length === 1 ? '' : 's'}</div>
              <div className="font-data" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>{fmtH(totalHours)}</div>
              <div className="font-data" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>{fmtCost(totalCost)}</div>
            </div>
          ) : null}

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '10px 20px', borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--faint)' }}>
              <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Segment = person's hours</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', border: '1px solid var(--accent)' }} /> This week outlined</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '1px dashed var(--accent)' }} /> Open role</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--faint)' }}>Past months collapse · this week opens · future weeks show who's on them</div>
          </div>
        </div>

        {/* ── RIGHT: totals by person ── */}
        <div style={{ width: 260, flexShrink: 0, background: 'var(--panel)', borderRadius: '10px', border: '1px solid var(--line)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>Totals by person</div>
            <div style={{ fontSize: '10.5px', color: 'var(--faint)', marginTop: '2px' }}>Each bar is one week · this week outlined</div>
          </div>
          <div style={{ padding: '8px 0' }}>
            {people.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '7px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: personColor(p.idx), flexShrink: 0 }} />
                  <span style={{ fontSize: '11.5px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.resourceName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexShrink: 0 }}>
                  <span className="font-data" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>{fmtH(p.hours)}</span>
                  <span className="font-data" style={{ fontSize: '11px', color: 'var(--muted)' }}>{fmtCost(p.cost)}</span>
                </div>
              </div>
            ))}
            {people.length === 0 ? <div style={{ padding: '16px', fontSize: '11px', color: 'var(--faint)' }}>No resources yet.</div> : null}
          </div>
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
