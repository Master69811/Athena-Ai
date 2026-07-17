import React from 'react';

// Memoized SVG components to prevent unnecessary re-renders
export const RecoveryRingPro = React.memo(
  function RecoveryRingPro({ score, size = 170, sw = 13 }: { score: number; size?: number; sw?: number }) {
    const r = (size - sw) / 2;
    const cx = size / 2;
    const c = 2 * Math.PI * r;
    const color = score <= 40 ? 'hsl(var(--destructive))' : score <= 70 ? 'hsl(var(--warning))' : 'hsl(var(--success))';
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="hsl(var(--surface-3))" strokeWidth={sw} />
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeLinecap="round" strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
          />
        </g>
      </svg>
    );
  },
  (prev, next) => prev.score === next.score && prev.size === next.size && prev.sw === next.sw
);

export const DonutRing = React.memo(
  function DonutRing({ pct, size = 190, sw = 15, color = 'hsl(var(--primary))' }: { pct: number; size?: number; sw?: number; color?: string }) {
    const r = (size - sw) / 2;
    const c = 2 * Math.PI * r;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--surface-3))" strokeWidth={sw} />
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
  function MacroBar({ pct, color }: { pct: number; color: string }) {
    return (
      <div style={{ height: 8, background: 'hsl(var(--surface-3))', borderRadius: 9999, overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 9999,
          background: color, transformOrigin: 'left',
          animation: 'barGrow .9s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
    );
  },
  (prev, next) => prev.pct === next.pct && prev.color === next.color
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
            background: 'hsl(var(--primary))',
            opacity: 0.8 + i * 0.02,
            transition: 'height .3s ease',
          }} />
        ))}
      </div>
    );
  },
  (prev, next) => prev.vals.length === next.vals.length
);
