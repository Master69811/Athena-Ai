'use client';

import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Trophy, Lock, Award } from 'lucide-react';
import { motion } from 'framer-motion';

const rarityColors: Record<string, string> = {
  COMMON: 'border-border',
  RARE: 'border-blue-500/50',
  EPIC: 'border-violet-500/50',
  LEGENDARY: 'border-yellow-500/50',
};

const rarityBadge: Record<string, string> = {
  LEGENDARY: 'bg-yellow-500/10 text-yellow-500',
  EPIC: 'bg-violet-500/10 text-violet-500',
  RARE: 'bg-blue-500/10 text-blue-500',
  COMMON: 'bg-muted text-muted-foreground',
};

function AchievementsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-32 rounded-2xl bg-muted" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-muted" />)}
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: gamificationApi.getAchievements,
    select: (res: any) => res.data,
  });

  if (isLoading) return <AchievementsSkeleton />;

  const achievements: any[] = Array.isArray(data?.achievements) ? data.achievements : [];
  const totalPoints = data?.totalPoints ?? 0;
  const earnedCount = data?.earnedCount ?? achievements.filter((a) => a.earned).length;
  const totalCount = data?.totalCount ?? achievements.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card glow className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">I TUOI ACHIEVEMENT</p>
            <p className="text-3xl font-bold gradient-text">{totalPoints.toLocaleString()} punti</p>
            <p className="text-sm text-muted-foreground mt-1">{earnedCount} di {totalCount} achievement sbloccati</p>
          </div>
          <Trophy className="w-12 h-12 text-primary opacity-30" />
        </div>
        <div className="mt-4 w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
            style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </Card>

      {achievements.length === 0 ? (
        <Card className="py-12">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <Award className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-semibold">Nessun achievement ancora</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Completa allenamenti e raggiungi i tuoi obiettivi per sbloccare i primi traguardi.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((a, i) => {
            const name = a.nameIt || a.name;
            const desc = a.descriptionIt || a.description;
            const rarity = a.rarity || 'COMMON';
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.4) }}>
                <Card className={`${rarityColors[rarity] ?? 'border-border'} ${!a.earned ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${a.earned ? 'bg-gradient-to-br from-primary/20 to-accent/20' : 'bg-muted'}`}>
                      {a.earned ? <Trophy className="w-6 h-6 text-primary" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${rarityBadge[rarity] ?? rarityBadge.COMMON}`}>{rarity}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
                      <p className="text-xs text-primary font-medium mt-1">+{a.points} punti</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
