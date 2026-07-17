'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { usersApi } from '@/lib/api';
import { toast } from 'sonner';

/* ─── keyframes ─────────────────────────────────────────── */
const STYLES = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

/* ─── tiny helpers ──────────────────────────────────────── */
function CapLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '.14em',
      color: '#6b7280', textTransform: 'uppercase', margin: '0 0 18px',
    }}>
      {children}
    </p>
  );
}

interface FieldProps {
  label: string;
  value: string | number | undefined | null;
}
function ProfileField({ label, value }: FieldProps) {
  return (
    <div>
      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>{label}</p>
      <div style={{
        background: '#15151d',
        border: '1px solid #1e1e2e',
        borderRadius: 11,
        padding: '12px 14px',
        fontSize: 14,
        fontWeight: 600,
        color: value !== undefined && value !== null && value !== '' ? '#e7e7ee' : '#6b7280',
      }}>
        {value !== undefined && value !== null && value !== '' ? String(value) : '—'}
      </div>
    </div>
  );
}

interface PrefRowProps {
  label: string;
  value: string;
  border?: boolean;
}
function PrefRow({ label, value, border = true }: PrefRowProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 0',
      borderBottom: border ? '1px solid #1a1a24' : 'none',
    }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: '#e7e7ee' }}>{label}</span>
      <div style={{
        background: '#15151d',
        border: '1px solid #1e1e2e',
        borderRadius: 9,
        padding: '7px 13px',
        fontSize: 13,
        color: '#a1a1b5',
      }}>
        {value}
      </div>
    </div>
  );
}

/* ─── page ──────────────────────────────────────────────── */
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
  const isPro = user?.subscriptionTier === 'PRO';

  useEffect(() => {
    if (open && profile) {
      setForm({
        name:                    profile.name                    ?? '',
        age:                     profile.age?.toString()         ?? '',
        heightCm:                profile.heightCm?.toString()    ?? '',
        weightKg:                profile.weightKg?.toString()    ?? '',
        trainingDaysPerWeek:     profile.trainingDaysPerWeek?.toString()    ?? '',
        sessionDurationMinutes:  profile.sessionDurationMinutes?.toString() ?? '',
        bio:                     profile.bio                     ?? '',
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
    if (num(form.age) !== undefined)                    payload.age                    = num(form.age);
    if (num(form.heightCm) !== undefined)               payload.heightCm               = num(form.heightCm);
    if (num(form.weightKg) !== undefined)               payload.weightKg               = num(form.weightKg);
    if (num(form.trainingDaysPerWeek) !== undefined)    payload.trainingDaysPerWeek    = num(form.trainingDaysPerWeek);
    if (num(form.sessionDurationMinutes) !== undefined) payload.sessionDurationMinutes = num(form.sessionDurationMinutes);
    payload.bio = form.bio.trim();
    updateMutation.mutate(payload);
  };

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  /* goal label */
  const goalLabel = (g?: string) => {
    if (!g) return '—';
    return g.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <>
      <style>{STYLES}</style>

      <div style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp .4s ease' }}>

        {/* ── Profilo ── */}
        <div style={{
          background: '#111118',
          border: '1px solid #1e1e2e',
          borderRadius: 20,
          padding: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <CapLabel>Profilo</CapLabel>
            <button
              onClick={() => setOpen(true)}
              style={{
                padding: '9px 15px', border: 'none', borderRadius: 11,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                marginTop: -4,
              }}
            >
              Modifica
            </button>
          </div>
          <div className="resp-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ProfileField label="Nome"             value={profile?.name ?? user?.profile?.name} />
            <ProfileField label="Email"            value={user?.email} />
            <ProfileField label="Età"              value={profile?.age ? `${profile.age} anni` : undefined} />
            <ProfileField label="Peso"             value={profile?.weightKg ? `${profile.weightKg} kg` : undefined} />
            <ProfileField label="Altezza"          value={profile?.heightCm ? `${profile.heightCm} cm` : undefined} />
            <ProfileField label="Grasso corporeo"  value={profile?.bodyFatPercentage ? `${profile.bodyFatPercentage}%` : undefined} />
          </div>
          {profile?.bio && (
            <div style={{ marginTop: 16 }}>
              <ProfileField label="Obiettivo" value={goalLabel(profile?.goalType)} />
            </div>
          )}
          {!profile?.bio && profile?.goalType && (
            <div style={{ marginTop: 16 }}>
              <ProfileField label="Obiettivo" value={goalLabel(profile?.goalType)} />
            </div>
          )}
        </div>

        {/* ── Abbonamento ── */}
        <div style={{
          background: '#111118',
          border: '1px solid #1e1e2e',
          borderRadius: 20,
          padding: 24,
        }}>
          <CapLabel>Abbonamento</CapLabel>
          <div className="resp-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* FREE tile */}
            <div style={{
              background: '#15151d',
              border: `1px solid ${isPro ? '#1e1e2e' : 'rgba(99,102,241,.4)'}`,
              borderRadius: 16,
              padding: 20,
              position: 'relative',
              opacity: isPro ? .55 : 1,
            }}>
              {!isPro && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  fontSize: 9, fontWeight: 700, letterSpacing: '.12em',
                  color: '#6366f1', border: '1px solid rgba(99,102,241,.4)',
                  borderRadius: 5, padding: '2px 7px', textTransform: 'uppercase',
                }}>
                  ATTIVO
                </div>
              )}
              <p style={{ fontSize: 13, fontWeight: 700, color: '#a1a1b5', margin: '0 0 6px' }}>FREE</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#e7e7ee', margin: '0 0 14px' }}>€0<span style={{ fontSize: 13, fontWeight: 500, color: '#6b7280' }}>/mese</span></p>
              {['Tracciamento pasti', 'Piano nutrizionale base', 'Workout logging', '1 piano allenamento'].map(f => (
                <p key={f} style={{ fontSize: 12.5, color: '#6b7280', margin: '4px 0' }}>· {f}</p>
              ))}
            </div>

            {/* PRO tile */}
            <div style={{
              background: 'linear-gradient(135deg,rgba(99,102,241,.16),rgba(139,92,246,.1))',
              border: '1px solid rgba(99,102,241,.4)',
              borderRadius: 16,
              padding: 20,
              position: 'relative',
            }}>
              {isPro && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  fontSize: 9, fontWeight: 700, letterSpacing: '.12em',
                  color: '#8b5cf6', border: '1px solid rgba(139,92,246,.4)',
                  borderRadius: 5, padding: '2px 7px', textTransform: 'uppercase',
                }}>
                  ATTIVO
                </div>
              )}
              <p style={{
                fontSize: 13, fontWeight: 700, margin: '0 0 6px',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                display: 'inline-block',
              }}>
                PRO
              </p>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#e7e7ee', margin: '0 0 14px' }}>
                €14,99<span style={{ fontSize: 13, fontWeight: 500, color: '#a1a1b5' }}>/mese</span>
              </p>
              {[
                'Tutto di FREE',
                'AI Coach illimitato',
                'Nutrition Engine',
                'Progressioni automatiche',
                'Analisi avanzate',
                'Piani illimitati',
              ].map(f => (
                <p key={f} style={{ fontSize: 12.5, color: '#c4c4d4', margin: '4px 0' }}>· {f}</p>
              ))}
              {!isPro && (
                <button
                  onClick={() => toast('Upgrade a Pro', { description: 'I pagamenti saranno disponibili a breve.' })}
                  style={{
                    marginTop: 14, width: '100%',
                    padding: '9px 15px', border: 'none', borderRadius: 11,
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Aggiorna a Pro
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Preferenze ── */}
        <div style={{
          background: '#111118',
          border: '1px solid #1e1e2e',
          borderRadius: 20,
          padding: 24,
        }}>
          <CapLabel>Preferenze</CapLabel>
          <div>
            <PrefRow label="Unità di misura"  value="Metrico (kg, cm)" />
            <PrefRow label="Lingua"           value="Italiano" />
            <PrefRow label="Tema"             value="Dark Mode" />
            <PrefRow label="Notifiche"        value="Attive" border={false} />
          </div>
        </div>
      </div>

      {/* ── Edit profile modal ── */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Modifica Profilo"
        description="Aggiorna i tuoi dati personali e di allenamento."
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nome *</label>
            <input
              value={form.name}
              onChange={set('name')}
              className="input-field w-full"
              placeholder="Mario Rossi"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Età</label>
              <input
                type="number" inputMode="numeric"
                value={form.age} onChange={set('age')}
                className="input-field w-full" placeholder="28"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Altezza (cm)</label>
              <input
                type="number" inputMode="numeric"
                value={form.heightCm} onChange={set('heightCm')}
                className="input-field w-full" placeholder="178"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Peso (kg)</label>
              <input
                type="number" step="0.1" inputMode="decimal"
                value={form.weightKg} onChange={set('weightKg')}
                className="input-field w-full" placeholder="75"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Giorni/sett.</label>
              <input
                type="number" inputMode="numeric"
                value={form.trainingDaysPerWeek} onChange={set('trainingDaysPerWeek')}
                className="input-field w-full" placeholder="4"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Durata sessione (min)</label>
            <input
              type="number" inputMode="numeric"
              value={form.sessionDurationMinutes} onChange={set('sessionDurationMinutes')}
              className="input-field w-full" placeholder="60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Bio — opzionale</label>
            <textarea
              value={form.bio} onChange={set('bio')}
              rows={2} className="input-field w-full resize-none"
              placeholder="Qualcosa su di te…"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" variant="gradient" className="flex-1" loading={updateMutation.isPending}>
              Salva
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
