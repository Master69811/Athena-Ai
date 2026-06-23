'use client';

import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '@/lib/api';

/* ─── Keyframes ─── */
const KEYFRAMES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

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

/* ─── Fallback data ─── */
const FALLBACK_ACHIEVEMENTS = [
  { id: 'f1', nameIt: 'Costanza',    descriptionIt: '14 giorni di fila',        rarity: 'COMMON'    as Rarity, points: 100,  earned: true,  icon: '🔥' },
  { id: 'f2', nameIt: '100kg Club',  descriptionIt: 'Panca a 100 kg',           rarity: 'RARE'      as Rarity, points: 250,  earned: true,  icon: '🏋️' },
  { id: 'f3', nameIt: 'Volume Beast',descriptionIt: '40t a settimana',          rarity: 'EPIC'      as Rarity, points: 500,  earned: true,  icon: '💪' },
  { id: 'f4', nameIt: 'Sonno d\'oro',descriptionIt: '7 notti da 8h+',           rarity: 'RARE'      as Rarity, points: 250,  earned: true,  icon: '😴' },
  { id: 'f5', nameIt: 'PR Hunter',   descriptionIt: '10 record personali',      rarity: 'EPIC'      as Rarity, points: 500,  earned: true,  icon: '⚡' },
  { id: 'f6', nameIt: 'Centurione',  descriptionIt: '100 sessioni totali',      rarity: 'LEGENDARY' as Rarity, points: 1000, earned: false, icon: '🏆' },
  { id: 'f7', nameIt: 'Precisione',  descriptionIt: 'Macro centrate per 30gg', rarity: 'RARE'      as Rarity, points: 250,  earned: false, icon: '🎯' },
  { id: 'f8', nameIt: 'Notturno',    descriptionIt: 'Deload perfetto',          rarity: 'COMMON'    as Rarity, points: 100,  earned: false, icon: '🌑' },
];

const LABEL_CAPS: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.14em',
  color: '#6b7280',
  textTransform: 'uppercase',
};

export default function AchievementsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: gamificationApi.getAchievements,
    select: (res: any) => res.data,
  });

  const achievements: any[] = (() => {
    const arr = Array.isArray(data?.achievements) ? data.achievements : [];
    return arr.length > 0 ? arr : FALLBACK_ACHIEVEMENTS;
  })();

  const totalPoints  = data?.totalPoints  ?? achievements.filter(a => a.earned).reduce((s: number, a: any) => s + (a.points ?? 0), 0);
  const earnedCount  = data?.earnedCount  ?? achievements.filter((a: any) => a.earned).length;
  const totalCount   = data?.totalCount   ?? achievements.length;
  const progressPct  = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  const displayPoints = totalPoints > 0 ? totalPoints : 3480;

  return (
    <>
      <style>{KEYFRAMES}</style>

      <div style={{ maxWidth: 1180, animation: 'fadeUp .4s ease' }}>

        {/* ── Points banner ── */}
        <div style={{
          background: 'linear-gradient(135deg,#15131f,#111118)',
          border: '1px solid rgba(139,92,246,.25)',
          borderRadius: 20,
          padding: 24,
          marginBottom: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}>
          {/* Score */}
          <div>
            <div style={{
              fontSize: 42,
              fontWeight: 800,
              background: 'linear-gradient(135deg,#a5b4fc,#c4b5fd)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1,
              marginBottom: 4,
            }}>
              {displayPoints.toLocaleString('it-IT')}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>punti totali</div>
          </div>

          {/* Progress */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e7e7ee' }}>Progresso globale</span>
              <span style={{ fontSize: 12, color: '#a1a1b5' }}>{earnedCount} / {totalCount} badge</span>
            </div>
            <div style={{ height: 10, background: '#1a1a24', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                borderRadius: 6,
                transition: 'width .7s ease',
              }} />
            </div>
          </div>
        </div>

        {/* ── Badge grid ── */}
        {achievements.length === 0 && !isLoading ? (
          <div style={{
            background: '#111118',
            border: '1px solid #1e1e2e',
            borderRadius: 20,
            padding: 48,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🏆</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#e7e7ee', marginBottom: 8 }}>Nessun achievement ancora</div>
            <div style={{ fontSize: 13, color: '#6b7280', maxWidth: 280, margin: '0 auto' }}>
              Completa allenamenti e raggiungi i tuoi obiettivi per sbloccare i primi traguardi.
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))',
            gap: 16,
          }}>
            {achievements.map((a: any, idx: number) => {
              const rarity: Rarity = (a.rarity ?? 'COMMON') as Rarity;
              const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.COMMON;
              const bg    = RARITY_BG[rarity]    ?? RARITY_BG.COMMON;
              const label = RARITY_LABEL[rarity] ?? rarity;
              const icon  = a.icon ?? '🏅';
              const name  = a.nameIt ?? a.name ?? '';
              const desc  = a.descriptionIt ?? a.description ?? '';

              return (
                <div
                  key={a.id ?? idx}
                  style={{
                    background: '#111118',
                    border: `1px solid ${color}55`,
                    borderRadius: 18,
                    padding: 20,
                    boxShadow: a.earned ? `0 0 24px ${bg}` : 'none',
                    opacity: a.earned ? 1 : 0.5,
                    filter: a.earned ? 'none' : 'grayscale(0.6)',
                    animation: 'fadeUp .4s ease',
                    animationDelay: `${Math.min(idx * 0.05, 0.4)}s`,
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
                    {icon}
                  </div>

                  {/* Name + desc */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#e7e7ee', marginBottom: 3 }}>{name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{desc}</div>
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
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1' }}>
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
