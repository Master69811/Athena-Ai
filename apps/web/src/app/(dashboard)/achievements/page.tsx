'use client';

import { Card } from '@/components/ui/card';
import { Trophy, Flame, Zap, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const ACHIEVEMENTS = [
  { id: '1', name: 'Prima Serie', desc: 'Completa il tuo primo allenamento', icon: '🏋️', earned: true, points: 100, rarity: 'COMMON' },
  { id: '2', name: 'Streak 7 Giorni', desc: '7 giorni consecutivi di allenamento', icon: '🔥', earned: true, points: 250, rarity: 'RARE' },
  { id: '3', name: 'Primo PR', desc: 'Stabilisci il tuo primo record personale', icon: '⚡', earned: true, points: 200, rarity: 'RARE' },
  { id: '4', name: 'Forza di Ferro', desc: 'Raggiungi 100kg di squat', icon: '🦾', earned: false, points: 500, rarity: 'EPIC' },
  { id: '5', name: 'Consistenza', desc: '30 giorni di allenamento nel mese', icon: '📅', earned: false, points: 750, rarity: 'EPIC' },
  { id: '6', name: 'Elite Athlete', desc: 'Completa 100 sessioni di allenamento', icon: '🏆', earned: false, points: 1000, rarity: 'LEGENDARY' },
];

const rarityColors: Record<string, string> = {
  COMMON: 'border-border',
  RARE: 'border-blue-500/50',
  EPIC: 'border-violet-500/50',
  LEGENDARY: 'border-yellow-500/50',
};

export default function AchievementsPage() {
  const totalPoints = ACHIEVEMENTS.filter(a => a.earned).reduce((acc, a) => acc + a.points, 0);
  const earned = ACHIEVEMENTS.filter(a => a.earned).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card glow className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">I TUOI ACHIEVEMENT</p>
            <p className="text-3xl font-bold gradient-text">{totalPoints.toLocaleString()} punti</p>
            <p className="text-sm text-muted-foreground mt-1">{earned} di {ACHIEVEMENTS.length} achievement sbloccati</p>
          </div>
          <Trophy className="w-12 h-12 text-primary opacity-30" />
        </div>
        <div className="mt-4 w-full h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" style={{ width: `${(earned / ACHIEVEMENTS.length) * 100}%` }} />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ACHIEVEMENTS.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`${rarityColors[a.rarity]} ${!a.earned && 'opacity-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${a.earned ? 'bg-gradient-to-br from-primary/20 to-accent/20' : 'bg-muted'}`}>
                  {a.earned ? a.icon : <Lock className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{a.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      a.rarity === 'LEGENDARY' ? 'bg-yellow-500/10 text-yellow-500' :
                      a.rarity === 'EPIC' ? 'bg-violet-500/10 text-violet-500' :
                      a.rarity === 'RARE' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-muted text-muted-foreground'
                    }`}>{a.rarity}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{a.desc}</p>
                  <p className="text-xs text-primary font-medium mt-1">+{a.points} punti</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
