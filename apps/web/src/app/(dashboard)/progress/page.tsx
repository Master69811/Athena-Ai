'use client';

import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, Scale, Camera, PlusCircle } from 'lucide-react';
import Link from 'next/link';

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
  const { data: measurements, isLoading } = useQuery({
    queryKey: ['measurements'],
    queryFn: () => usersApi.getMeasurements(),
    select: (res: any) => res.data as any[],
  });

  if (isLoading) return <ProgressSkeleton />;

  const chartData = measurements?.map((m: any) => ({
    date: new Date(m.date).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' }),
    peso: m.weightKg,
    bf: m.bodyFatPct,
  })).reverse() ?? [];

  const hasData = chartData.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5" />
                  Registra peso
                </Button>
              </Link>
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
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
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
              <Button variant="outline" size="sm" className="gap-1.5">
                <PlusCircle className="w-3.5 h-3.5" />
                Aggiungi misurazione
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Photo comparison — responsive grid */}
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
            >
              <Camera className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{type}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
