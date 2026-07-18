'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Zap, Eye, EyeOff, Mail, Lock } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Minimo 8 caratteri'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [shaking, setShaking] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const shake = () => { setShaking(true); setTimeout(() => setShaking(false), 400); };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authApi.login(data) as any;
      const { user, accessToken, refreshToken } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userId', user.id);
      setAuth(user, accessToken, refreshToken);
      toast.success(`Bentornato, ${user.profile?.name || user.email}!`);
      router.push(user.profile?.onboardingCompleted ? '/dashboard' : '/onboarding');
    } catch (err: any) {
      const status = err?.statusCode || err?.status;
      if (status === 401 || status === 400) {
        toast.error('Email o password errati');
      } else {
        toast.error(err?.message || 'Errore di connessione, riprova');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-1">Athena AI</h1>
          <p className="text-muted-foreground">Il tuo coach di élite ti aspetta</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-bold mb-6">Accedi</h2>

          <form onSubmit={handleSubmit(onSubmit, shake)} className={`space-y-4 ${shaking ? 'animate-shake' : ''}`}>
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <div className="relative">
                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.email ? 'text-destructive/70' : 'text-muted-foreground'}`} />
                <input id="login-email" {...register('email')} type="email" autoComplete="email" className={`input-field pl-10 ${errors.email ? 'input-error' : ''}`} placeholder="tu@email.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} />
              </div>
              {errors.email && <p id="email-error" role="alert" className="text-xs text-destructive mt-1 flex items-center gap-1">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.password ? 'text-destructive/70' : 'text-muted-foreground'}`} />
                <input id="login-password" {...register('password')} type={showPassword ? 'text' : 'password'} autoComplete="current-password" className={`input-field pl-10 pr-10 ${errors.password ? 'input-error' : ''}`} placeholder="••••••••" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p id="password-error" role="alert" className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>

            <Button type="submit" variant="gradient" size="lg" className="w-full mt-2" loading={loading}>
              Accedi
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Non hai un account?{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Registrati gratis
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
