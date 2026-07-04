import React from 'react';

// Memoized SVG components to prevent unnecessary re-renders
export const RecoveryRingPro = React.memo(
  function RecoveryRingPro({ score, size = 170, sw = 13 }: { score: number; size?: number; sw?: number }) {
    const r = (size - sw) / 2;
    const cx = size / 2;
    const c = 2 * Math.PI * r;
    const col = score <= 40 ? ['#ef4444', '#f87171'] : score <= 70 ? ['#eab308', '#fbbf24'] : ['#22c55e', '#5ee89a'];
    const id = `ring-${size}-${score}`;
    const ticks = Array.from({ length: 60 }, (_, i) => {
      const a = (i / 60) * 2 * Math.PI;
      const inner = r + sw / 2 + 4;
      const outer = inner + (i % 5 === 0 ? 6 : 3);
      return { x1: cx + Math.cos(a) * inner, y1: cx + Math.sin(a) * inner, x2: cx + Math.cos(a) * outer, y2: cx + Math.sin(a) * outer, major: i % 5 === 0 };
    });
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={id + 'g'} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={col[0]} />
            <stop offset="100%" stopColor={col[1]} />
          </linearGradient>
          <filter id={id + 'f'} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g>
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#2a2a3a" strokeWidth={t.major ? 1.4 : 0.7} />
          ))}
        </g>
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="#16161f" strokeWidth={sw} />
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={`url(#${id}g)`} strokeWidth={sw}
            strokeLinecap="round" strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)}
            filter={`url(#${id}f)`}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
          />
        </g>
      </svg>
    );
  },
  (prev, next) => prev.score === next.score && prev.size === next.size && prev.sw === next.sw
);

export const DonutRing = React.memo(
  function DonutRing({ pct, size = 190, sw = 15, color = '#6366f1' }: { pct: number; size?: number; sw?: number; color?: string }) {
    const r = (size - sw) / 2;
    const c = 2 * Math.PI * r;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a1a24" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .8s ease' }}
        />
      </svg>
    );
  },
  (prev, next) => prev.pct === next.pct && prev.color === next.color
);

export const Sparkline = React.memo(
  function Sparkline({ vals, color }: { vals: number[]; color: string }) {
    const w = 84, h = 24, pad = 2;
    const min = Math.min(...vals), max = Math.max(...vals), rng = (max - min) || 1;
    const pts = vals.map((v, i) => [
      pad + i * (w - pad * 2) / (vals.length - 1),
      pad + (1 - (v - min) / rng) * (h - pad * 2),
    ]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const last = pts[pts.length - 1];
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last[0]} cy={last[1]} r={2.2} fill={color} />
      </svg>
    );
  },
  (prev, next) => prev.color === next.color && prev.vals.length === next.vals.length
);

export const MacroBar = React.memo(
  function MacroBar({ pct, gradient }: { pct: number; gradient: string }) {
    return (
      <div style={{ height: 9, background: '#1a1a24', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 6,
          background: gradient, transformOrigin: 'left',
          animation: 'barGrow .9s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
    );
  },
  (prev, next) => prev.pct === next.pct
);

export const MiniBarChart = React.memo(
  function MiniBarChart({ vals }: { vals: number[] }) {
    const max = Math.max(...vals);
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 32 }}>
        {vals.map((v, i) => (
          <div key={i} style={{
            flex: 1, borderRadius: 4,
            height: `${(v / (max || 1)) * 100}%`,
            background: 'linear-gradient(180deg, #8b5cf6, #6366f1)',
            opacity: 0.8 + i * 0.02,
            transition: 'height .3s ease',
          }} />
        ))}
      </div>
    );
  },
  (prev, next) => prev.vals.length === next.vals.length
);
