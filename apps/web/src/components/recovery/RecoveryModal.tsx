'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recoveryApi } from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Moon, Battery, Brain, Footprints } from 'lucide-react';
import { toast } from 'sonner';

interface RecoveryModalProps {
  open: boolean;
  onClose: () => void;
}

function Slider({ icon, label, value, onChange, min, max, step, suffix }: {
  icon: React.ReactNode; label: string; value: number;
  onChange: (v: number) => void; min: number; max: number; step: number; suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium flex items-center gap-2">
          <span className="text-primary">{icon}</span>{label}
        </span>
        <span className="text-sm font-bold tabular-nums text-primary">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary touch-manipulation"
      />
    </div>
  );
}

export function RecoveryModal({ open, onClose }: RecoveryModalProps) {
  const queryClient = useQueryClient();
  const [sleepHours, setSleepHours] = useState(7.5);
  const [sleepQuality, setSleepQuality] = useState(7);
  const [stressLevel, setStressLevel] = useState(4);
  const [energyLevel, setEnergyLevel] = useState(7);
  const [steps, setSteps] = useState('');

  const mutation = useMutation({
    mutationFn: (data: any) => recoveryApi.log(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery-latest'] });
      queryClient.invalidateQueries({ queryKey: ['recovery-history', 7] });
      queryClient.invalidateQueries({ queryKey: ['recovery-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Recupero registrato! Athena aggiornerà i tuoi consigli.');
      onClose();
    },
    onError: (e: any) => toast.error(e?.message || 'Errore nel salvataggio del recupero'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      date: new Date().toISOString().split('T')[0],
      sleepHours,
      sleepQuality,
      stressLevel,
      energyLevel,
    };
    const s = parseInt(steps, 10);
    if (!isNaN(s) && s >= 0) payload.steps = s;
    mutation.mutate(payload);
  };

  return (
    <Modal open={open} onClose={onClose} title="Registra recupero" description="Athena usa questi dati per adattare allenamento e progressioni.">
      <form onSubmit={submit} className="space-y-5">
        <Slider icon={<Moon className="w-4 h-4" />} label="Ore di sonno" value={sleepHours} onChange={setSleepHours} min={3} max={12} step={0.5} suffix="h" />
        <Slider icon={<Moon className="w-4 h-4" />} label="Qualità del sonno" value={sleepQuality} onChange={setSleepQuality} min={1} max={10} step={1} suffix="/10" />
        <Slider icon={<Brain className="w-4 h-4" />} label="Livello di stress" value={stressLevel} onChange={setStressLevel} min={1} max={10} step={1} suffix="/10" />
        <Slider icon={<Battery className="w-4 h-4" />} label="Livello di energia" value={energyLevel} onChange={setEnergyLevel} min={1} max={10} step={1} suffix="/10" />
        <div>
          <label className="text-sm font-medium flex items-center gap-2 mb-2">
            <Footprints className="w-4 h-4 text-primary" /> Passi oggi — opzionale
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="es. 8000"
            className="input-field w-full"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annulla</Button>
          <Button type="submit" variant="gradient" className="flex-1" loading={mutation.isPending}>Salva</Button>
        </div>
      </form>
    </Modal>
  );
}
