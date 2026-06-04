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
import { Zap, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Minimo 2 caratteri'),
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Minimo 8 caratteri'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authApi.register(data) as any;
      const { user, accessToken, refreshToken } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userId', user.id);
      setAuth(user, accessToken, refreshToken);
      toast.success('Account creato! Inizia il tuo onboarding.');
      router.push('/onboarding');
    } catch (err: any) {
      toast.error(err.message || 'Registrazione fallita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-radial from-accent/5 via-transparent to-transparent" />
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-primary/40">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-1">Athena AI</h1>
          <p className="text-muted-foreground">Inizia il tuo percorso con il coach AI più avanzato</p>
        </div>

        <div className="glass-card-elevated p-8">
          <h2 className="text-xl font-bold mb-6">Crea il tuo account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nome</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input {...register('name')} className="input-field pl-10" placeholder="Mario Rossi" />
              </div>
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input {...register('email')} type="email" className="input-field pl-10" placeholder="tu@email.com" />
              </div>
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input {...register('password')} type={showPassword ? 'text' : 'password'} className="input-field pl-10 pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>

            <Button type="submit" variant="gradient" size="lg" className="w-full mt-2" loading={loading}>
              Inizia il tuo percorso
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Registrandoti accetti i <Link href="#" className="text-primary hover:underline">Termini di Servizio</Link> e la <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Hai già un account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">Accedi</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
