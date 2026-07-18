'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, analyticsApi } from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { PlusCircle, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

/* ── Strength Score (Gravl-style headline metric) ── */
function StrengthScoreCard() {
  const { data } = useQuery({
    queryKey: ['strength-score'],
    queryFn: analyticsApi.strengthScore,
    select: (res: any) => res.data,
  });

  const overall = data?.overall ?? 0;
  const hasData = !!data?.hasData;
  const subscores: any[] = data?.subscores ?? [];
  const r = (150 - 12) / 2;
  const circ = 2 * Math.PI * r;
  const color = overall >= 65 ? 'hsl(var(--success))' : overall >= 45 ? 'hsl(var(--warning))' : 'hsl(var(--primary))';

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <span className="label-caps">Strength Score</span>
        {hasData && (
          <span className="chip chip-active" style={{ height: 24 }}>{data.level}</span>
        )}
      </div>

      {hasData ? (
        <div className="resp-stack" style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 24, alignItems: 'center' }}>
          {/* Ring */}
          <div style={{ position: 'relative', width: 150, height: 150, margin: '0 auto' }}>
            <svg width={150} height={150} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
              <circle cx={75} cy={75} r={r} fill="none" stroke="hsl(var(--surface-3))" strokeWidth={12} />
              <circle cx={75} cy={75} r={r} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={circ * (1 - overall / 100)}
                style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span className="tabular-nums" style={{ fontSize: 44, fontWeight: 700, lineHeight: 1, color: 'hsl(var(--foreground))' }}>{overall}</span>
              <span className="text-caption text-content-tertiary">/ 100</span>
            </div>
          </div>

          {/* Subscores */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {subscores.map((s) => (
              <div key={s.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))' }}>{s.label}</span>
                  <span className="text-caption text-content-secondary tabular-nums">
                    {s.score}{s.best1RM ? ` · ${s.bestLift} ${s.best1RM}kg` : ''}
                  </span>
                </div>
                <div style={{ height: 8, background: 'hsl(var(--surface-3))', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ width: `${s.score}%`, height: '100%', borderRadius: 9999, background: color, transition: 'width .8s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 0', textAlign: 'center' }}>
          <div className="w-14 h-14 rounded-2xl bg-primary/12 flex items-center justify-center">
            <Dumbbell size={24} className="text-primary" />
          </div>
          <span className="text-body text-content-secondary">Registra i tuoi allenamenti per calcolare il tuo Strength Score.</span>
          <span className="text-caption text-content-tertiary">Spinta · Tirata · Gambe, valutati sul tuo peso corporeo.</span>
        </div>
      )}
    </div>
  );
}

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
    background: 'hsl(var(--surface-elevated))',
    border: '1px solid hsl(var(--border-strong))',
    borderRadius: 12,
    color: 'hsl(var(--foreground))',
    fontSize: 12,
  };

  return (
    <>
      <div className="animate-fade-up" style={{ maxWidth: 1180, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Strength Score — headline metric */}
        <StrengthScoreCard />

        {/* Row 1: two area charts */}
        <div className="resp-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Card: Peso corporeo */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span className="label-caps">Peso corporeo</span>
              {deltaPeso !== null && weeks !== null && (
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: deltaPeso <= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
                  background: deltaPeso <= 0 ? 'hsl(var(--success)/.10)' : 'hsl(var(--destructive)/.10)',
                  border: `1px solid ${deltaPeso <= 0 ? 'hsl(var(--success)/.25)' : 'hsl(var(--destructive)/.25)'}`,
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
                <span className="text-caption text-content-tertiary">Nessun dato ancora</span>
                <button
                  onClick={() => setModalOpen(true)}
                  className="btn-secondary rounded-xl"
                  style={{ fontSize: 12, padding: '7px 14px' }}
                >
                  + Aggiungi peso
                </button>
              </div>
            )}
          </div>

          {/* Card: Massa magra stimata */}
          <div className="card">
            <div style={{ marginBottom: 18 }}>
              <span className="label-caps">Massa magra stimata</span>
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
                <span className="text-caption text-content-tertiary">Inserisci peso + % grasso</span>
                <span className="text-caption text-content-tertiary" style={{ opacity: .7 }}>per stimare la massa magra</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Misurazioni card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span className="label-caps">Misurazioni</span>
            <button
              onClick={() => setModalOpen(true)}
              className="btn-secondary rounded-xl"
              style={{ fontSize: 13, padding: '7px 14px' }}
            >
              + Aggiungi misurazione
            </button>
          </div>

          {measurementTiles.length > 0 ? (
            <div className="resp-tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
              {measurementTiles.map(m => (
                <div key={m.label} className="card-inner">
                  <div className="label-caps" style={{ marginBottom: 6 }}>{m.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span className="tabular-nums" style={{ fontSize: 24, fontWeight: 700, color: 'hsl(var(--foreground))', lineHeight: 1 }}>{m.value}</span>
                    <span className="text-caption text-content-tertiary">{m.unit}</span>
                  </div>
                  {m.delta !== null && (
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      marginTop: 6,
                      color: m.delta >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
                    }}>
                      {m.delta > 0 ? '+' : ''}{m.delta.toString().replace('.', ',')} cm
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '24px 0' }}>
              <span className="text-caption text-content-tertiary" style={{ textAlign: 'center' }}>
                Nessuna misurazione registrata — aggiungi la tua prima misurazione
              </span>
              <button
                onClick={() => setModalOpen(true)}
                className="btn-secondary rounded-xl"
                style={{ fontSize: 12, padding: '7px 14px' }}
              >
                + Aggiungi misurazione
              </button>
            </div>
          )}
        </div>

        {/* Analytics link */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/progress/analytics">
            <button className="btn-secondary rounded-xl" style={{ fontSize: 13, padding: '9px 18px' }}>
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
