'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useAuthStore } from '@/store/auth.store';
import { usersApi } from '@/lib/api';
import { User, CreditCard, Palette } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', age: '', heightCm: '', weightKg: '',
    trainingDaysPerWeek: '', sessionDurationMinutes: '', bio: '',
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: usersApi.getMe,
    select: (res: any) => res.data,
  });

  const profile = me?.profile;

  useEffect(() => {
    if (open && profile) {
      setForm({
        name: profile.name ?? '',
        age: profile.age?.toString() ?? '',
        heightCm: profile.heightCm?.toString() ?? '',
        weightKg: profile.weightKg?.toString() ?? '',
        trainingDaysPerWeek: profile.trainingDaysPerWeek?.toString() ?? '',
        sessionDurationMinutes: profile.sessionDurationMinutes?.toString() ?? '',
        bio: profile.bio ?? '',
      });
    }
  }, [open, profile]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => usersApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Profilo aggiornato!');
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || 'Errore nel salvataggio'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Il nome è obbligatorio'); return; }
    const payload: any = { name: form.name.trim() };
    const num = (v: string) => (v !== '' && !isNaN(parseFloat(v)) ? parseFloat(v) : undefined);
    if (num(form.age) !== undefined) payload.age = num(form.age);
    if (num(form.heightCm) !== undefined) payload.heightCm = num(form.heightCm);
    if (num(form.weightKg) !== undefined) payload.weightKg = num(form.weightKg);
    if (num(form.trainingDaysPerWeek) !== undefined) payload.trainingDaysPerWeek = num(form.trainingDaysPerWeek);
    if (num(form.sessionDurationMinutes) !== undefined) payload.sessionDurationMinutes = num(form.sessionDurationMinutes);
    if (form.bio.trim()) payload.bio = form.bio.trim();
    updateMutation.mutate(payload);
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <CardTitle>Profilo</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-3">
          {profile?.name && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <span className="text-sm text-muted-foreground">Nome</span>
              <span className="text-sm font-medium">{profile.name}</span>
            </div>
          )}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <span className="text-sm text-muted-foreground">Piano</span>
            <span className="text-sm font-medium capitalize">{user?.subscriptionTier?.toLowerCase()}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Modifica Profilo</Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <CardTitle>Abbonamento</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Piano attuale: <strong className="text-foreground capitalize">{user?.subscriptionTier?.toLowerCase()}</strong></p>
          {user?.subscriptionTier === 'FREE' && (
            <Button
              variant="gradient"
              onClick={() => toast('Upgrade a Pro', { description: 'I pagamenti saranno disponibili a breve.' })}
            >
              Aggiorna a Pro — €14.99/mese
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <CardTitle>Preferenze</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-3">
          {[
            { label: 'Unità di misura', value: 'Metrico (kg, cm)' },
            { label: 'Tema', value: 'Dark Mode' },
            { label: 'Lingua', value: 'Italiano' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Edit profile modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Modifica Profilo" description="Aggiorna i tuoi dati personali e di allenamento.">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nome *</label>
            <input value={form.name} onChange={set('name')} className="input-field w-full" placeholder="Mario Rossi" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Età</label>
              <input type="number" inputMode="numeric" value={form.age} onChange={set('age')} className="input-field w-full" placeholder="28" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Altezza (cm)</label>
              <input type="number" inputMode="numeric" value={form.heightCm} onChange={set('heightCm')} className="input-field w-full" placeholder="178" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Peso (kg)</label>
              <input type="number" step="0.1" inputMode="decimal" value={form.weightKg} onChange={set('weightKg')} className="input-field w-full" placeholder="75" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Giorni/sett.</label>
              <input type="number" inputMode="numeric" value={form.trainingDaysPerWeek} onChange={set('trainingDaysPerWeek')} className="input-field w-full" placeholder="4" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Durata sessione (min)</label>
            <input type="number" inputMode="numeric" value={form.sessionDurationMinutes} onChange={set('sessionDurationMinutes')} className="input-field w-full" placeholder="60" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Bio — opzionale</label>
            <textarea value={form.bio} onChange={set('bio')} rows={2} className="input-field w-full resize-none" placeholder="Qualcosa su di te…" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Annulla</Button>
            <Button type="submit" variant="gradient" className="flex-1" loading={updateMutation.isPending}>Salva</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
