'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
  glow?: boolean;
}

export function Progress({ value, max = 100, className, color, glow }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full h-2 bg-muted rounded-full overflow-hidden', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{
          background: color || 'linear-gradient(90deg, hsl(239,84%,67%), hsl(262,80%,65%))',
          boxShadow: glow ? `0 0 12px ${color || 'hsl(239,84%,67%)'}80` : undefined,
        }}
      />
    </div>
  );
}
