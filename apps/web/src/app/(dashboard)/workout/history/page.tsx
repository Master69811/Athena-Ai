'use client';

import { useQuery } from '@tanstack/react-query';
import { sessionsApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { formatDuration } from '@/lib/utils';
import { Calendar, Clock, BarChart3, Loader2 } from 'lucide-react';

export default function WorkoutHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionsApi.getAll,
    select: (res: any) => res.data,
  });

  if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-bold">Storico Allenamenti</h2>
      {data?.sessions?.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-muted-foreground">Nessun allenamento completato ancora.</p>
        </Card>
      )}
      {data?.sessions?.map((session: any) => (
        <Card key={session.id} className="hover:border-primary/20 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">{session.day?.name || 'Allenamento Libero'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(session.startedAt).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <div className="flex items-center gap-4 mt-2">
                {session.durationMinutes && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />{formatDuration(session.durationMinutes)}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BarChart3 className="w-3.5 h-3.5" />{session.sets?.length || 0} serie
                </span>
                {session.totalVolume && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />{(session.totalVolume / 1000).toFixed(1)}t volume
                  </span>
                )}
              </div>
            </div>
            {session.rpe && (
              <div className="bg-primary/10 text-primary text-sm font-bold px-3 py-1.5 rounded-xl flex-shrink-0">
                RPE {session.rpe}
              </div>
            )}
          </div>
          {session.aiAnalysis && (
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border italic">"{session.aiAnalysis}"</p>
          )}
        </Card>
      ))}
    </div>
  );
}
