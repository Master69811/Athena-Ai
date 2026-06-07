'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, Scale, Camera, PlusCircle, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

function ProgressSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 rounded-2xl bg-muted" />
        <div className="h-64 rounded-2xl bg-muted" />
      </div>
      <div className="h-48 rounded-2xl bg-muted" />
    </div>
  );
}

export default function ProgressPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [weightKg, setWeightKg] = useState('');
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: measurements, isLoading } = useQuery({
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

  if (isLoading) return <ProgressSkeleton />;

  const chartData = measurements?.map((m: any) => ({
    date: new Date(m.date).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' }),
    peso: m.weightKg,
    bf: m.bodyFatPct,
  })).reverse() ?? [];

  const hasData = chartData.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header action */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Progressi</h1>
        <div className="flex items-center gap-2">
          <Link href="/progress/analytics">
            <Button variant="outline" size="sm" className="gap-1.5">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </Button>
          </Link>
          <Button variant="gradient" size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Aggiungi</span> misurazione
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Weight chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              <CardTitle>Andamento Peso</CardTitle>
            </div>
          </CardHeader>
          {hasData ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(240 10% 10%)', border: '1px solid hsl(240 8% 14%)', borderRadius: '12px' }}
                    formatter={(v: any) => [`${v} kg`, 'Peso']}
                  />
                  <Line
                    type="monotone"
                    dataKey="peso"
                    stroke="hsl(239,84%,67%)"
                    strokeWidth={2}
                    dot={false}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 gap-3 text-center">
              <Scale className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nessun dato peso ancora</p>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
                <PlusCircle className="w-3.5 h-3.5" />
                Registra peso
              </Button>
            </div>
          )}
        </Card>

        {/* Measurements list */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <CardTitle>Misurazioni Recenti</CardTitle>
            </div>
          </CardHeader>
          {measurements && measurements.length > 0 ? (
            <div className="space-y-2">
              {measurements.slice(0, 5).map((m: any, i: number) => (
                <div key={m.id ?? `${m.date}-${i}`} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <span className="text-sm text-muted-foreground">
                    {new Date(m.date).toLocaleDateString('it-IT')}
                  </span>
                  <div className="flex gap-4 text-sm">
                    <span className="font-bold tabular-nums">{m.weightKg} kg</span>
                    {m.bodyFatPct && (
                      <span className="text-muted-foreground tabular-nums">{m.bodyFatPct}% BF</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm">Nessuna misurazione ancora</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Aggiungi la tua prima misurazione per iniziare a tracciare i progressi.
              </p>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setModalOpen(true)}>
                <PlusCircle className="w-3.5 h-3.5" />
                Aggiungi misurazione
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Photo comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <CardTitle>Foto di Confronto</CardTitle>
          </div>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['Frontale', 'Laterale', 'Posteriore'].map(type => (
            <div
              key={type}
              className="aspect-[3/4] bg-muted rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer group"
              role="button"
              aria-label={`Aggiungi foto ${type}`}
              onClick={() => toast('Caricamento foto in arrivo', { description: 'Questa funzione sarà disponibile a breve.' })}
            >
              <Camera className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{type}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Add measurement modal */}
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
    </div>
  );
}
