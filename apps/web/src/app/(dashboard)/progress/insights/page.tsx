'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Brain, Zap, Filter, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { progressionApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { InsightCard, type ProgressionInsight } from '@/components/progression/insight-card';
import { toast } from 'sonner';

const stagger = { animate: { transition: { staggerChildren: 0.07 } } };

export default function InsightsPage() {
  const queryClient = useQueryClient();

  const { data: insights, isLoading } = useQuery<ProgressionInsight[]>({
    queryKey: ['progression-insights'],
    queryFn: async () => {
      const res = await progressionApi.getInsights({ limit: 50 }) as any;
      return res.data;
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => progressionApi.markAllRead() as Promise<any>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progression-insights'] });
      queryClient.invalidateQueries({ queryKey: ['progression-unread-count'] });
    },
  });

  const runProgression = useMutation({
    mutationFn: () => progressionApi.run() as Promise<any>,
    onSuccess: () => {
      toast.success('Analisi di progressione completata');
      queryClient.invalidateQueries({ queryKey: ['progression-insights'] });
      queryClient.invalidateQueries({ queryKey: ['progression-unread-count'] });
    },
    onError: () => toast.error('Errore durante l\'analisi'),
  });

  // Mark all read on mount
  useEffect(() => {
    markAllRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = insights?.filter((i) => !i.isRead).length ?? 0;

  const actionGroups = insights
    ? groupByAction(insights)
    : {};

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Insight di Athena</h1>
            <p className="text-sm text-muted-foreground">
              {insights?.length
                ? `${insights.length} decisioni · ${unreadCount} nuove`
                : 'Nessun insight ancora'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runProgression.mutate()}
            loading={runProgression.isPending}
          >
            <RotateCcw className="w-4 h-4" />
            Analizza ora
          </Button>
        </div>
      </motion.div>

      {/* Empty state */}
      {!isLoading && (!insights || insights.length === 0) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="text-center py-16">
            <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun insight ancora</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              Athena analizza i tuoi allenamenti ogni settimana. Completa qualche sessione e torna qui.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => runProgression.mutate()} loading={runProgression.isPending}>
                <Zap className="w-4 h-4" />
                Lancia analisi manuale
              </Button>
              <Link href="/workout">
                <Button variant="gradient">
                  Vai agli allenamenti
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Insights list */}
      {insights && insights.length > 0 && (
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </motion.div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      )}

      {/* Info footer */}
      {insights && insights.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-center text-muted-foreground pb-4"
        >
          Athena analizza automaticamente i tuoi allenamenti ogni settimana.
          Puoi anche lanciare un'analisi manuale in qualsiasi momento.
        </motion.p>
      )}
    </div>
  );
}

function groupByAction(insights: ProgressionInsight[]) {
  return insights.reduce(
    (acc, i) => {
      if (!acc[i.action]) acc[i.action] = [];
      acc[i.action].push(i);
      return acc;
    },
    {} as Record<string, ProgressionInsight[]>,
  );
}
