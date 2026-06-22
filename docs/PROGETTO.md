# Athena AI — Documento di Progetto

## Cos'è
App web di fitness personalizzata, guidata da AI. Funziona come un coach personale d'élite: osserva i dati dell'utente, ragiona, e adatta allenamento, nutrizione e recupero in tempo reale.

---

## Utente tipo
- Uomo/donna 20-40 anni
- Va in palestra 3-5 volte a settimana
- Vuole risultati seri (massa, definizione, forza)
- Non vuole spendere 200€/mese per un personal trainer
- Ha uno smartphone, usa app come Strava, MyFitnessPal, Hevy

---

## Schermate principali (15 in totale)

### 1. Landing page
Pagina pubblica di presentazione. Hero con titolo, CTA "Inizia gratis", sezione feature, testimonial. Dark mode.

### 2. Login / Registrazione
Form minimale. Email + password. Link "Hai già un account?". Errori inline.

### 3. Onboarding (7 step)
Wizard progressivo. L'utente inserisce:
- Nome, età, sesso
- Peso, altezza, % grasso corporeo
- Obiettivo (massa, definizione, forza, resistenza, perdita peso)
- Livello esperienza (principiante, intermedio, avanzato)
- Giorni disponibili a settimana + durata sessione
- Attrezzatura disponibile
- Infortuni o limitazioni

Progress bar in alto. Step animati con Framer Motion.

### 4. Dashboard
Schermata principale dopo il login. Contiene:
- **Recovery ring** SVG (punteggio 0-100, colore che cambia: rosso/giallo/verde)
- Macro del giorno (proteine, carboidrati, grassi) con barre di progresso
- Prossimo allenamento in programma
- Decisioni nutrizionali AI ("aumenta calorie di 150 kcal questa settimana")
- Pulsante "Registra recupero" per aprire modal con slider

### 5. Piano workout
Mostra il piano AI generato (12 settimane). Ogni giorno ha nome, gruppi muscolari, esercizi con set/rep/RPE/recupero. Pulsante "Genera nuovo piano AI".

### 6. Sessione live
Schermata usata durante l'allenamento:
- Lista esercizi del giorno
- Per ogni esercizio: bottoni +/− per peso e reps, RPE selector, bottone "Log set"
- Timer di recupero dopo ogni serie
- Suggerimento AI in tempo reale ("riduci di 2.5kg, eri a RPE 9")
- Header con X per finire sessione

### 7. Nutrizione
- Obiettivo calorico giornaliero + macro target
- Barre consumato/target per proteine, carbo, grassi
- Lista pasti del giorno
- Modal "Aggiungi pasto": cerca alimento, seleziona porzione, salva

### 8. Recupero
- Recovery score con ring visivo
- Storico ultimi 7 giorni (grafico)
- Modal input: ore sonno, qualità sonno, stress, energia, passi

### 9. Progress
- Grafico peso nel tempo (LineChart)
- Grafico misure corporee (AreaChart)
- Tabella misure: petto, vita, fianchi, coscia, braccio
- Pulsante "Aggiungi misurazione"

### 10. Analytics
- Volume settimanale per gruppo muscolare (BarChart orizzontale)
- Trend volume ultimi mesi (AreaChart)
- Frequenza allenamenti per giorno della settimana
- Tasto filtro per periodo (4/8/12 settimane)

### 11. AI Coach (chat)
- Interfaccia chat stile iMessage
- Messaggi utente a destra, Athena a sinistra
- Avatar "A" per Athena
- Athena conosce il profilo, il piano, il recupero e le sessioni recenti
- Domande suggerite in basso se la chat è vuota

### 12. Achievement
- Griglia badge conquistati/bloccati
- Rarità: COMMON / RARE / EPIC / LEGENDARY (colori diversi)
- Header con punti totali e barra progresso globale

### 13. Impostazioni
- Sezione Profilo: modifica dati personali
- Sezione Abbonamento: piano FREE vs PRO (€14.99/mese)
- Sezione Preferenze: unità di misura, lingua, tema

### 14. Landing pubblica (marketing)
Separata dalla dashboard. Ha navbar con logo + CTA. Sezione "Come funziona", "Feature", "Prezzi".

---

## Design System

### Colori
| Token | Valore | Uso |
|-------|--------|-----|
| `--primary` | `#6366f1` (indigo) | Bottoni, accenti principali |
| `--accent` | `#8b5cf6` (violet) | Gradienti, badge |
| `--background` | `#09090f` | Sfondo pagina |
| `--surface` | `#111118` | Card |
| `--surface-elevated` | `#1a1a24` | Modal, dropdown |
| `--border` | `#1e1e2e` | Bordi card |
| `--muted-foreground` | `#6b7280` | Testi secondari |

Il gradient principale è: `from-primary (#6366f1) to-accent (#8b5cf6)` — usato su bottoni CTA, testi hero, badge.

### Card
Glassmorphism: `bg-surface/80 backdrop-blur-xl border border-border/50 rounded-2xl p-5`
Variante glow: aggiunge `box-shadow: 0 0 20px hsl(primary / 0.1)`

### Tipografia
- Font: sistema (Inter se disponibile)
- Titoli hero: `text-4xl font-bold` con gradient-text
- Label sezioni: `text-xs uppercase tracking-widest text-muted-foreground`
- Valori metrici: `text-3xl font-bold`

### Bottoni
- **Primary**: sfondo `#6366f1`, testo bianco, `rounded-xl`
- **Gradient**: `bg-gradient-to-r from-primary to-accent`, shadow colorata
- **Outline**: bordo, trasparente, hover `bg-muted`
- **Ghost**: solo hover, niente bordo

### Animazioni
Framer Motion ovunque:
- Card entrano con `opacity: 0 → 1, y: 10 → 0`
- Stagger tra card: `delay: i * 0.05`
- Modal: scale + fade
- Recovery ring: spring animation sull'arco SVG

### Recovery Ring
SVG circolare. Il cerchio si riempie da 0 a 360° in base al punteggio.
- 0-40: rosso (`#ef4444`)
- 41-70: giallo (`#eab308`)
- 71-100: verde (`#22c55e`)
Il numero è al centro, grande e bold.

---

## Stack tecnico (per contesto)
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Recharts
- **Backend**: NestJS, PostgreSQL, Prisma ORM
- **AI**: Google Gemini 2.0 Flash
- **Auth**: JWT (access 15m + refresh 7 giorni)
- **Deploy**: Railway (backend) + Vercel (frontend)

---

## Tono dell'app
- Dark, premium, tech
- Non "fitness motivazionale" con emoji e colori fluo
- Più simile a un tool professionale per atleti seri
- Analogia visiva: Linear.app + Whoop + Notion

---

## Cosa NON è
- Non è un social network fitness
- Non ha video tutorial integrati
- Non vende integratori
- Non è un calorie counter semplice
