import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Zap, Brain, TrendingUp, Dumbbell, Apple, Activity, ChevronRight, Star, Shield, Trophy } from 'lucide-react';

const features = [
  { icon: Brain, title: 'AI Coach Personale', desc: 'Claude analizza ogni tuo allenamento e adatta il programma in tempo reale, come un coach d\'élite fisicamente presente.' },
  { icon: TrendingUp, title: 'Auto-Progressione', desc: 'L\'algoritmo gestisce automaticamente carichi, volume e frequenza. Nessuno stallo, progressi garantiti ogni settimana.' },
  { icon: Dumbbell, title: 'Metodologie d\'Élite', desc: 'RP, Project Invictus, 5/3/1, PPL, Juggernaut e oltre 10 metodologie scientificamente validate.' },
  { icon: Apple, title: 'Nutrizione AI', desc: 'Calcolo TDEE preciso, macro personalizzati e aggiustamento automatico settimanale basato sul tuo peso reale.' },
  { icon: Activity, title: 'Recovery Score', desc: 'Monitora sonno, stress e HRV per calcolare il tuo indice di recupero e ottimizzare ogni sessione.' },
  { icon: Shield, title: 'Scientifico al 100%', desc: 'Ogni decisione è basata su evidenze scientifiche. Nessuna pseudoscienza, solo quello che funziona davvero.' },
];

const plans = [
  { name: 'Free', price: 0, features: ['3 piani AI/mese', 'Libreria base (100 es.)', 'Tracking allenamenti', 'Community'], cta: 'Inizia Gratis', variant: 'outline' as const },
  { name: 'Pro', price: 14.99, features: ['Piani AI illimitati', 'Libreria completa (3000+ es.)', 'Nutrizione AI', 'AI Coach chat', 'Auto-progressione'], cta: 'Inizia Pro', variant: 'gradient' as const, popular: true },
  { name: 'Premium', price: 29.99, features: ['Tutto di Pro', 'Analisi video AI', 'Analisi foto corporea', 'Previsioni AI 24 settimane', 'Biomeccanica AI'], cta: 'Inizia Premium', variant: 'default' as const },
  { name: 'Coach', price: 79.99, features: ['Tutto di Premium', 'Gestione 50 clienti', 'Dashboard coach', 'Report automatici AI', 'White-label'], cta: 'Per Coach', variant: 'outline' as const },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-lg">Athena AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">Prezzi</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login"><Button variant="ghost" size="sm">Accedi</Button></Link>
            <Link href="/register"><Button variant="gradient" size="sm">Inizia Gratis</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent" />
        <div className="absolute top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-8">
            <Star className="w-3.5 h-3.5" />
            Il Coach AI #1 al mondo per il fitness
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none">
            Il tuo coach{' '}
            <span className="gradient-text">di élite</span>
            <br />è artificialmente intelligente
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Athena AI analizza ogni serie, ogni pasto, ogni notte di sonno. Adatta il programma in tempo reale. 
            Supera qualsiasi personal trainer tradizionale.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button variant="gradient" size="xl" className="w-full sm:w-auto">
                <Zap className="w-5 h-5" />
                Inizia Gratis — Nessuna carta richiesta
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="glass" size="xl" className="w-full sm:w-auto">
                Scopri come funziona
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Usato da <strong className="text-foreground">10.000+</strong> atleti · Piano gratuito disponibile sempre
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Non è una semplice app fitness</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              È un ecosistema intelligente che sostituisce personal trainer, nutrizionista e coach di recupero.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="glass-card p-6 hover:border-primary/30 transition-all duration-300 group">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 bg-surface/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Prezzi Semplici</h2>
            <p className="text-muted-foreground">Inizia gratis, scala quando sei pronto.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan, i) => (
              <div key={i} className={`glass-card p-6 flex flex-col relative ${plan.popular ? 'border-primary/50 glow-border' : ''}`}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent text-white text-xs font-bold px-3 py-1 rounded-full">
                    PIÙ POPOLARE
                  </span>
                )}
                <h3 className="font-bold text-xl mb-1">{plan.name}</h3>
                <div className="mb-4">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-black">Gratis</span>
                  ) : (
                    <>
                      <span className="text-3xl font-black">€{plan.price}</span>
                      <span className="text-muted-foreground text-sm">/mese</span>
                    </>
                  )}
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <Trophy className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button variant={plan.variant} className="w-full">{plan.cta}</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">Athena AI</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Athena AI. Tutti i diritti riservati.</p>
        </div>
      </footer>
    </div>
  );
}
