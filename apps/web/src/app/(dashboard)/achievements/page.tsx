'use client';

import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '@/lib/api';
import { AlertTriangle, Trophy, Medal } from 'lucide-react';

/* ─── Rarity config ─── */
type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

const RARITY_COLOR: Record<Rarity, string> = {
  COMMON:    '#94a3b8',
  RARE:      '#38bdf8',
  EPIC:      '#a855f7',
  LEGENDARY: '#f59e0b',
};

const RARITY_BG: Record<Rarity, string> = {
  COMMON:    'rgba(148,163,184,.14)',
  RARE:      'rgba(56,189,248,.14)',
  EPIC:      'rgba(168,85,247,.16)',
  LEGENDARY: 'rgba(245,158,11,.16)',
};

const RARITY_LABEL: Record<Rarity, string> = {
  COMMON:    'COMUNE',
  RARE:      'RARO',
  EPIC:      'EPICO',
  LEGENDARY: 'LEGGENDARIO',
};

export default function AchievementsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['achievements'],
    queryFn: gamificationApi.getAchievements,
    select: (res: any) => res.data,
  });

  const { data: level } = useQuery({
    queryKey: ['gamification-level'],
    queryFn: gamificationApi.getLevel,
    select: (res: any) => res.data,
  });

  const achievements: any[] = Array.isArray(data?.achievements) ? data.achievements : [];

  const totalPoints  = data?.totalPoints  ?? achievements.filter(a => a.earned).reduce((s: number, a: any) => s + (a.points ?? 0), 0);
  const earnedCount  = data?.earnedCount  ?? achievements.filter((a: any) => a.earned).length;
  const totalCount   = data?.totalCount   ?? achievements.length;
  const progressPct  = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  const displayPoints = totalPoints ?? 0;

  return (
    <>
      <div className="animate-fade-up" style={{ maxWidth: 1180 }}>

        {/* ── Level card (XP progression) ── */}
        {level && (
          <div className="card border-primary/25" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, flexShrink: 0,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }}>
              <span className="text-caption" style={{ opacity: .85, lineHeight: 1 }}>LIV</span>
              <span className="tabular-nums" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{level.level}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--foreground))' }}>{level.title}</span>
                <span className="text-caption text-content-secondary tabular-nums">
                  {level.xpIntoLevel} / {level.xpForNextLevel} XP
                </span>
              </div>
              <div style={{ height: 10, background: 'hsl(var(--surface-3))', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ width: `${level.progressPct}%`, height: '100%', borderRadius: 9999, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', transition: 'width .8s ease' }} />
              </div>
              <div className="text-caption text-content-tertiary" style={{ marginTop: 8 }}>
                {level.breakdown.sessions} allenamenti · {level.breakdown.personalRecords} record · {level.xp} XP totali
              </div>
            </div>
          </div>
        )}

        {/* ── Points banner ── */}
        <div className="card border-primary/25" style={{
          marginBottom: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}>
          {/* Score */}
          <div>
            <div className="tabular-nums" style={{
              fontSize: 42,
              fontWeight: 700,
              color: 'hsl(var(--foreground))',
              lineHeight: 1,
              marginBottom: 4,
            }}>
              {displayPoints.toLocaleString('it-IT')}
            </div>
            <div className="text-caption text-content-tertiary">punti totali</div>
          </div>

          {/* Progress */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))' }}>Progresso globale</span>
              <span className="text-caption text-content-secondary">{earnedCount} / {totalCount} badge</span>
            </div>
            <div style={{ height: 10, background: 'hsl(var(--surface-3))', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'hsl(var(--primary))',
                borderRadius: 6,
                transition: 'width .7s ease',
              }} />
            </div>
          </div>
        </div>

        {/* ── Badge grid ── */}
        {isError ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div className="w-16 h-16 rounded-2xl bg-surface-3 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-warning" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 8 }}>Impossibile caricare i traguardi, riprova</div>
            <button
              onClick={() => refetch()}
              className="btn-secondary rounded-xl"
              style={{ marginTop: 12, padding: '9px 18px', fontSize: 13 }}
            >
              Riprova
            </button>
          </div>
        ) : achievements.length === 0 && !isLoading ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div className="w-16 h-16 rounded-2xl bg-surface-3 flex items-center justify-center mx-auto mb-4">
              <Trophy size={32} className="text-content-tertiary" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 8 }}>Nessun achievement ancora</div>
            <div className="text-caption text-content-tertiary" style={{ maxWidth: 280, margin: '0 auto' }}>
              Completa allenamenti e raggiungi i tuoi obiettivi per sbloccare i primi traguardi.
            </div>
          </div>
        ) : (
          <div className="resp-tiles" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))',
            gap: 16,
          }}>
            {achievements.map((a: any, idx: number) => {
              const rarity: Rarity = (a.rarity ?? 'COMMON') as Rarity;
              const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.COMMON;
              const bg    = RARITY_BG[rarity]    ?? RARITY_BG.COMMON;
              const label = RARITY_LABEL[rarity] ?? rarity;
              const icon  = a.icon ?? null;
              const name  = a.nameIt ?? a.name ?? '';
              const desc  = a.descriptionIt ?? a.description ?? '';

              return (
                <div
                  key={a.id ?? idx}
                  className="animate-fade-up"
                  style={{
                    background: 'hsl(var(--surface))',
                    border: `1px solid ${a.earned ? color + '40' : 'hsl(var(--border))'}`,
                    borderRadius: 16,
                    padding: 20,
                    opacity: a.earned ? 1 : 0.45,
                    filter: a.earned ? 'none' : 'grayscale(0.6)',
                    animationDelay: `${Math.min(idx * 0.03, 0.3)}s`,
                    animationFillMode: 'both',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {/* Icon tile */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 13,
                    background: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24,
                    filter: a.earned ? 'none' : 'grayscale(1)',
                  }}>
                    {icon ? icon : <Medal size={24} color={color} />}
                  </div>

                  {/* Name + desc */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: 3 }}>{name}</div>
                    <div className="text-caption text-content-tertiary" style={{ lineHeight: 1.4 }}>{desc}</div>
                  </div>

                  {/* Rarity tag + points */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '.06em',
                      textTransform: 'uppercase',
                      color,
                      background: bg,
                      borderRadius: 6,
                      padding: '3px 7px',
                    }}>
                      {label}
                    </span>
                    <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--primary))' }}>
                      +{a.points ?? 0} pt
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </>
  );
}
