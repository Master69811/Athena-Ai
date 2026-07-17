'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

/* ─── Keyframe ─── */
const fadeUpStyle = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const LABEL_CAPS: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.14em',
  color: '#6b7280',
  textTransform: 'uppercase',
};

const CARD: React.CSSProperties = {
  background: '#111118',
  border: '1px solid #1e1e2e',
  borderRadius: 20,
  padding: 24,
  animation: 'fadeUp .4s ease',
};

const INNER_SURFACE: React.CSSProperties = {
  background: '#15151d',
  border: '1px solid #1e1e2e',
  borderRadius: 14,
  padding: 16,
};

/* Maps real BodyMeasurement fields (from the API) to their display labels */
const MEASUREMENT_FIELDS: { key: string; label: string }[] = [
  { key: 'chestCm', label: 'Petto' },
  { key: 'waistCm', label: 'Vita' },
  { key: 'hipsCm', label: 'Fianchi' },
  { key: 'thighLeftCm', label: 'Coscia' },
  { key: 'armLeftCm', label: 'Braccio' },
];

export default function ProgressPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [weightKg, setWeightKg] = useState('');
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: measurements } = useQuery({
    queryKey: ['measurements'],
    queryFn: () => usersApi.getMeasurements(),
    select: (res: any) => (Array.isArray(res?.data) ? res.data : []) as any[],
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => usersApi.addMeasurement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Misurazione salvata!');
      closeModal();
    },
    onError: (e: any) => toast.error(e?.message || 'Errore nel salvataggio'),
  });

  const closeModal = () => {
    setModalOpen(false);
    setWeightKg('');
    setBodyFatPct('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightKg);
    if (!w || w < 20 || w > 400) {
      toast.error('Inserisci un peso valido (20–400 kg)');
      return;
    }
    const payload: any = { date, weightKg: w };
    const bf = parseFloat(bodyFatPct);
    if (bf && bf > 0 && bf < 70) payload.bodyFatPct = bf;
    addMutation.mutate(payload);
  };

  /* Build chart data from API or fall back to empty */
  const rawData = (measurements ?? [])
    .map((m: any) => ({
      date: new Date(m.date).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' }),
      peso: m.weightKg,
      bf: m.bodyFatPct ?? null,
    }))
    .reverse();

  /* Lean mass estimated = weight * (1 - bf/100) */
  const leanData = rawData.map((d: any) => ({
    date: d.date,
    lean: d.bf != null ? +(d.peso * (1 - d.bf / 100)).toFixed(1) : null,
  }));

  /* Delta: last vs first */
  const first = rawData[0]?.peso;
  const last  = rawData[rawData.length - 1]?.peso;
  const deltaPeso = first != null && last != null ? +(last - first).toFixed(1) : null;
  const weeks = rawData.length > 1 ? rawData.length - 1 : null;

  /* Real body-part measurements from the latest record (measurements is newest-first) */
  const latestMeasurement = measurements && measurements.length > 0 ? measurements[0] : null;
  const previousMeasurement = measurements && measurements.length > 1 ? measurements[1] : null;

  const measurementTiles = latestMeasurement
    ? MEASUREMENT_FIELDS
        .filter(f => latestMeasurement[f.key] != null)
        .map(f => {
          const value = latestMeasurement[f.key];
          const prevValue = previousMeasurement?.[f.key];
          const delta = prevValue != null ? +(value - prevValue).toFixed(1) : null;
          return { label: f.label, value, unit: 'cm', delta };
        })
    : [];

  const tooltipStyle: React.CSSProperties = {
    background: '#111118',
    border: '1px solid #1e1e2e',
    borderRadius: 12,
    color: '#e7e7ee',
    fontSize: 12,
  };

  return (
    <>
      <style>{fadeUpStyle}</style>

      <div style={{ maxWidth: 1180, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Row 1: two area charts */}
        <div className="resp-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Card: Peso corporeo */}
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={LABEL_CAPS}>Peso corporeo</span>
              {deltaPeso !== null && weeks !== null && (
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: deltaPeso <= 0 ? '#22c55e' : '#f87171',
                  background: deltaPeso <= 0 ? 'rgba(34,197,94,.12)' : 'rgba(248,113,113,.12)',
                  border: `1px solid ${deltaPeso <= 0 ? 'rgba(34,197,94,.25)' : 'rgba(248,113,113,.25)'}`,
                  borderRadius: 8,
                  padding: '3px 10px',
                }}>
                  {deltaPeso > 0 ? '+' : ''}{deltaPeso.toString().replace('.', ',')} kg in {weeks} sett.
                </span>
              )}
            </div>

            {rawData.length > 0 ? (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rawData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} kg`, 'Peso']} />
                    <Area type="monotone" dataKey="peso" stroke="#6366f1" strokeWidth={2} fill="url(#weightGrad)" dot={false} animationDuration={1200} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Nessun dato ancora</span>
                <button
                  onClick={() => setModalOpen(true)}
                  style={{ fontSize: 12, color: '#a1a1b5', background: '#15151d', border: '1px solid #2a2a3a', borderRadius: 10, padding: '7px 14px', cursor: 'pointer' }}
                >
                  + Aggiungi peso
                </button>
              </div>
            )}
          </div>

          {/* Card: Massa magra stimata */}
          <div style={CARD}>
            <div style={{ marginBottom: 18 }}>
              <span style={LABEL_CAPS}>Massa magra stimata</span>
            </div>

            {leanData.filter((d: any) => d.lean !== null).length > 0 ? (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={leanData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="leanGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} kg`, 'Massa magra']} />
                    <Area type="monotone" dataKey="lean" stroke="#22c55e" strokeWidth={2} fill="url(#leanGrad)" dot={false} animationDuration={1200} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Inserisci peso + % grasso</span>
                <span style={{ fontSize: 12, color: '#6b7280', opacity: .7 }}>per stimare la massa magra</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Misurazioni card */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={LABEL_CAPS}>Misurazioni</span>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#a1a1b5',
                background: '#1a1a24',
                border: '1px solid #2a2a3a',
                borderRadius: 11,
                padding: '7px 14px',
                cursor: 'pointer',
                transition: 'border-color .2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#6366f1')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
            >
              + Aggiungi misurazione
            </button>
          </div>

          {measurementTiles.length > 0 ? (
            <div className="resp-tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
              {measurementTiles.map(m => (
                <div key={m.label} style={INNER_SURFACE}>
                  <div style={{ ...LABEL_CAPS, marginBottom: 6 }}>{m.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#e7e7ee', lineHeight: 1 }}>{m.value}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{m.unit}</span>
                  </div>
                  {m.delta !== null && (
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      marginTop: 6,
                      color: m.delta >= 0 ? '#22c55e' : '#f87171',
                    }}>
                      {m.delta > 0 ? '+' : ''}{m.delta.toString().replace('.', ',')} cm
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '24px 0' }}>
              <span style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
                Nessuna misurazione registrata — aggiungi la tua prima misurazione
              </span>
              <button
                onClick={() => setModalOpen(true)}
                style={{ fontSize: 12, color: '#a1a1b5', background: '#15151d', border: '1px solid #2a2a3a', borderRadius: 10, padding: '7px 14px', cursor: 'pointer' }}
              >
                + Aggiungi misurazione
              </button>
            </div>
          )}
        </div>

        {/* Analytics link */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/progress/analytics">
            <button style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#a1a1b5',
              background: '#15151d',
              border: '1px solid #2a2a3a',
              borderRadius: 11,
              padding: '9px 18px',
              cursor: 'pointer',
            }}>
              Vedi Analytics →
            </button>
          </Link>
        </div>

      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Aggiungi misurazione"
        description="Registra peso e percentuale di grasso corporeo."
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Data</label>
            <input
              type="date"
              value={date}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Peso (kg) *</label>
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="es. 75.4"
              className="input-field w-full"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Grasso corporeo (%) — opzionale</label>
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={bodyFatPct}
              onChange={(e) => setBodyFatPct(e.target.value)}
              placeholder="es. 15.2"
              className="input-field w-full"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
              Annulla
            </Button>
            <Button type="submit" variant="gradient" className="flex-1" loading={addMutation.isPending}>
              Salva
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
