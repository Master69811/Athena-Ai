'use client';

import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, Scale, Camera } from 'lucide-react';

export default function ProgressPage() {
  const { data: measurements } = useQuery({
    queryKey: ['measurements'],
    queryFn: usersApi.getMeasurements,
    select: (res: any) => res.data as any[],
  });

  const chartData = measurements?.map((m: any) => ({
    date: new Date(m.date).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' }),
    peso: m.weightKg,
    bf: m.bodyFatPct,
  })).reverse() || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              <CardTitle>Andamento Peso</CardTitle>
            </div>
          </CardHeader>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip contentStyle={{ background: 'hsl(240 10% 10%)', border: '1px solid hsl(240 8% 14%)', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="peso" stroke="hsl(239,84%,67%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <CardTitle>Misurazioni Recenti</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-3">
            {measurements?.slice(0, 5).map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="text-sm text-muted-foreground">{new Date(m.date).toLocaleDateString('it-IT')}</span>
                <div className="flex gap-4 text-sm">
                  <span className="font-bold">{m.weightKg} kg</span>
                  {m.bodyFatPct && <span className="text-muted-foreground">{m.bodyFatPct}% BF</span>}
                </div>
              </div>
            )) || <p className="text-sm text-muted-foreground text-center py-4">Nessuna misurazione ancora</p>}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <CardTitle>Foto di Confronto</CardTitle>
          </div>
        </CardHeader>
        <div className="grid grid-cols-3 gap-4">
          {['Frontale', 'Laterale', 'Posteriore'].map(type => (
            <div key={type} className="aspect-[3/4] bg-muted rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer">
              <Camera className="w-6 h-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{type}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
