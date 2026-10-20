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

// ── Create Engagement Modal ────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: '12px',
  borderRadius: '6px',
  border: '1px solid var(--line)',
  padding: '8px 10px',
  outline: 'none',
  fontFamily: 'inherit',
  lineHeight: 1.5,
};

function focusIn(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.borderColor = 'var(--accent-line)';
  e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)';
}

function focusOut(e: React.FocusEvent<HTMLElement>, error?: string) {
  e.currentTarget.style.borderColor = error ? 'var(--hi)' : 'var(--line)';
  e.currentTarget.style.boxShadow = 'none';
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--muted)', marginBottom: '4px' }}>
        {label}
      </label>
      {children}
      {error ? <div style={{ fontSize: '11px', color: 'var(--hi)', marginTop: '4px' }}>{error}</div> : null}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, error, autoFocus, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; error?: string; autoFocus?: boolean; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{ ...inputBase, borderColor: error ? 'var(--hi)' : 'var(--line)' }}
      onFocus={focusIn}
      onBlur={e => focusOut(e, error)}
    />
  );
}

function SelectInput({ value, onChange, options, error }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; error?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ ...inputBase, borderColor: error ? 'var(--hi)' : 'var(--line)', appearance: 'none', cursor: 'pointer' }}
      onFocus={focusIn}
      onBlur={e => focusOut(e, error)}
    >
      {options.map(o => (
        <option key={o.value} value={o.value} style={{ background: 'var(--panel)', color: 'var(--text)' }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function CurrencyInput({ value, onChange, placeholder, error }: {
  value: string; onChange: (v: string) => void; placeholder?: string; error?: string;
}) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '8px', ...inputBase, borderColor: error ? 'var(--hi)' : 'var(--line)' }}
      onFocus={focusIn}
      onBlur={e => focusOut(e, error)}
    >
      <span style={{ color: 'var(--faint)', fontSize: '12px', flex: 'none' }}>$</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder={placeholder}
        style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '12px', fontFamily: 'inherit', width: '100%', padding: 0 }}
      />
    </div>
  );
}

function CreateEngagementModal({ onClose, onCreated }: { onClose: () => void; onCreated: (eng: Engagement) => void }) {
  const [clientName, setClientName] = useState('');
  const [name, setName] = useState('');
  const [engagementOwner, setEngagementOwner] = useState('');
  const [engagementType, setEngagementType] = useState('fixed_fee');
  const [agreedBaseFees, setAgreedBaseFees] = useState('');
  const [contingentFees, setContingentFees] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [periodType, setPeriodType] = useState('weekly');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !creating) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [creating, onClose]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!clientName.trim()) e.clientName = 'Client name is required';
    if (!name.trim()) e.name = 'Engagement name is required';
    if (!engagementOwner.trim()) e.engagementOwner = 'Owner is required';
    if (!startDate) e.startDate = 'Start date is required';
    if (!endDate) e.endDate = 'End date is required';
    else if (startDate && endDate < startDate) e.endDate = 'End date must be on or after the start date';
    return e;
  };

  const submit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setCreating(true);
    setSubmitError('');
    try {
      const r = await fetch('/api/engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          name: name.trim(),
          engagementOwner: engagementOwner.trim(),
          engagementType,
          agreedBaseFees: agreedBaseFees.trim() || '0',
          contingentFees: contingentFees.trim() || '0',
          startDate,
          endDate,
          periodType,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) {
        setSubmitError(d.error || 'Failed to create engagement');
        return;
      }
      onCreated(d.data as Engagement);
    } catch {
      setSubmitError('Failed to create engagement');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
      onClick={e => { if (e.target === e.currentTarget && !creating) onClose(); }}
    >
      <div
        style={{
          background: 'var(--panel)', border: '1px solid var(--line-strong)',
          borderRadius: '12px', padding: '22px', width: '540px', maxWidth: '90vw',
          maxHeight: '90vh', overflow: 'auto',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 500, lineHeight: 1.3, color: 'var(--text)' }}>New Engagement</h2>
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', marginBottom: '16px' }}>
          Fill in the engagement details. It will be created as a Draft.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 12px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Client name" error={errors.clientName}>
              <TextInput value={clientName} onChange={setClientName} placeholder="Acme Corporation" error={errors.clientName} autoFocus />
            </Field>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Engagement name" error={errors.name}>
              <TextInput value={name} onChange={setName} placeholder="Q4 Transformation" error={errors.name} />
            </Field>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Engagement Owner" error={errors.engagementOwner}>
              <TextInput value={engagementOwner} onChange={setEngagementOwner} placeholder="Marc Brown" error={errors.engagementOwner} />
            </Field>
          </div>

          <Field label="Engagement Type">
            <SelectInput
              value={engagementType}
              onChange={setEngagementType}
              options={[
                { value: 'fixed_fee', label: 'Fixed Fee' },
                { value: 'hourly', label: 'Hourly' },
              ]}
            />
          </Field>

          <Field label="Period Type">
            <SelectInput
              value={periodType}
              onChange={setPeriodType}
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
          </Field>

          <Field label="Agreed Base Fees">
            <CurrencyInput value={agreedBaseFees} onChange={setAgreedBaseFees} placeholder="0" />
          </Field>

          <Field label="Contingent / Other Fees">
            <CurrencyInput value={contingentFees} onChange={setContingentFees} placeholder="0" />
          </Field>

          <Field label="Start Date" error={errors.startDate}>
            <TextInput value={startDate} onChange={setStartDate} type="date" error={errors.startDate} />
          </Field>

          <Field label="End Date" error={errors.endDate}>
            <TextInput value={endDate} onChange={setEndDate} type="date" error={errors.endDate} />
          </Field>
        </div>

        {submitError ? (
          <div style={{ fontSize: '12px', color: 'var(--hi)', marginTop: '14px' }}>{submitError}</div>
        ) : null}

        <div className="flex items-center justify-end gap-2" style={{ marginTop: '20px' }}>
          <button
            onClick={onClose}
            disabled={creating}
            style={{
              background: 'transparent', color: 'var(--text)', fontSize: '12px',
              padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--line-strong)',
              cursor: creating ? 'default' : 'pointer', opacity: creating ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={submit}
            disabled={creating}
            style={{
              fontSize: '12px', padding: '8px 18px', borderRadius: '8px', fontWeight: 500,
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? 'Creating…' : 'Create engagement'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EngagementsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/engagements')
      .then(r => r.json())
      .then(d => { if (d.success) setEngagements(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (eng: Engagement) => {
    setEngagements(prev => [eng, ...prev]);
    setCreateOpen(false);
    window.dispatchEvent(new Event('runway:refresh-engagements'));
    navigate(`/engagements/${eng.id}`);
  };

  const filtered = activeTab === 'all'
    ? engagements
    : engagements.filter(e => e.status === activeTab);

  return (
    <div>
      {/* Page header card — tabs (centered) | actions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '12px',
        }}
      >
        {/* Spacer — page is identified by the active sidebar nav item */}
        <div />

        {/* Filter tabs (centered) */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            padding: '3px',
            border: '1px solid var(--line)',
            borderRadius: '9px',
            background: 'var(--panel)',
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
                background: activeTab === tab ? 'var(--raised)' : 'transparent',
                color: activeTab === tab ? 'var(--text)' : 'var(--muted)',
                boxShadow: activeTab === tab ? 'inset 0 -2px 0 var(--accent)' : 'none',
                transition: 'color .15s, background .15s',
              }}
            >
              {tab === 'all' ? 'All' : STATUS_META[tab]?.label || tab}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ justifySelf: 'end' }}>
          <button
            className="btn-primary"
            onClick={() => setCreateOpen(true)}
            style={{
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 500,
            }}
          >
            + New Engagement
          </button>
        </div>
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
                    <td className="font-data" style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text)' }}>{formatCurrency(fee)}</td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--faint)', textTransform: 'capitalize' }}>{e.periodType}</td>
                    <td className="font-data" style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--faint)' }}>{formatDate(e.startDate)} – {formatDate(e.endDate)}</td>
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

      {createOpen && <CreateEngagementModal onClose={() => setCreateOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}
