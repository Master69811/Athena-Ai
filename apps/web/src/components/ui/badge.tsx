import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        secondary: 'bg-muted text-muted-foreground',
        success: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
        warning: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]',
        destructive: 'bg-destructive/10 text-destructive',
        rare: 'bg-blue-500/10 text-blue-500',
        epic: 'bg-violet-500/10 text-violet-500',
        legendary: 'bg-yellow-500/10 text-yellow-500',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
