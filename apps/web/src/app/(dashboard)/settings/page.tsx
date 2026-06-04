'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { User, Bell, Shield, CreditCard, Palette } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();

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
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <span className="text-sm text-muted-foreground">Piano</span>
            <span className="text-sm font-medium capitalize">{user?.subscriptionTier?.toLowerCase()}</span>
          </div>
          <Button variant="outline" size="sm">Modifica Profilo</Button>
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
            <Button variant="gradient">Aggiorna a Pro — €14.99/mese</Button>
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
    </div>
  );
}
