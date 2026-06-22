# Athena AI — Integrazione Apple Watch

Questa guida spiega come collegare l'Apple Watch ad Athena AI tramite l'app iOS nativa.

---

## Come funziona (in breve)

```
Apple Watch  →  app Salute (iPhone)  →  app Athena (iOS)  →  API Athena  →  Recovery Score
```

L'Apple Watch salva i dati in **Salute**. Un sito web non può leggerli (regola di Apple).
Quindi serve un'**app iOS** che chiede il permesso, legge i dati e li manda ad Athena.

L'app legge **4 dati oggettivi**:
- 😴 Ore di sonno
- ❤️ HRV (variabilità cardiaca)
- 💓 Frequenza cardiaca a riposo
- 👟 Passi

I dati **soggettivi** che l'orologio non misura (qualità sonno, stress, energia) vengono
**stimati automaticamente** dal backend a partire da quelli oggettivi. Puoi sempre
modificarli a mano dal sito.

---

## ⚠️ Cosa ti serve (importante, leggi prima)

Apple obbliga a queste cose per usare HealthKit su un iPhone reale:

| Cosa | Costo | Perché |
|------|-------|--------|
| **Account Apple Developer** | 99 $/anno | Obbligatorio: HealthKit non funziona senza, anche per uso personale |
| **Account Expo (EAS)** | Gratis | Per compilare l'app nel cloud (non serve un Mac) |
| **iPhone con Apple Watch abbinato** | — | Per installare e usare l'app |

> Non serve un Mac: la compilazione avviene nel cloud con **EAS Build**.

---

## Setup passo-passo

### 1. Installa gli strumenti (sul tuo computer, una volta sola)
```bash
npm install -g eas-cli
cd apps/mobile
pnpm install
```

### 2. Configura l'indirizzo del backend
Apri `apps/mobile/app.json` e cambia `extra.apiUrl` con l'URL del tuo backend Railway:
```json
"extra": { "apiUrl": "https://tuo-backend.railway.app" }
```

### 3. Collega l'account Apple Developer
```bash
eas login                 # accedi col tuo account Expo
eas build:configure       # configura il progetto
eas credentials           # collega l'Apple Developer account (segui le istruzioni)
```

### 4. Compila l'app (nel cloud)
```bash
eas build --platform ios --profile preview
```
Attendi ~15-20 minuti. Alla fine EAS ti dà un link/QR per installare l'app.

### 5. Installa sull'iPhone
- Apri il link dal tuo iPhone
- Installa l'app "Athena AI"
- (Per la prima installazione potrebbe servire registrare il device: `eas device:create`)

### 6. Usa l'app
1. Apri **Athena AI** sull'iPhone
2. Fai login con lo stesso account del sito
3. Concedi i permessi Salute quando richiesto (attiva **tutte** le categorie)
4. Premi **"Sincronizza ora"** → vedrai il tuo Recovery Score

Da qui in poi l'app sincronizza **automaticamente una volta al giorno** in background.

---

## Pubblicazione su App Store (opzionale, più avanti)
Quando vuoi renderla disponibile a tutti:
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

---

## Architettura tecnica

**App (`apps/mobile/`)**
- `app/index.tsx` — login (salva il JWT in modo sicuro con expo-secure-store)
- `app/sync.tsx` — schermata principale: legge HealthKit, mostra i dati, sincronizza
- `src/lib/healthkit.ts` — lettura dati da Apple Health (`react-native-health`)
- `src/lib/background-sync.ts` — task di sync giornaliero in background
- `src/lib/api.ts` — client verso l'API Athena

**Backend (già pronto)**
- `POST /api/v1/recovery/sync/healthkit` — riceve i dati dell'orologio
- `recovery.service.ts → syncFromHealthKit()` — salva i dati e stima i valori soggettivi
- `recovery.service.ts → estimateSubjectiveMetrics()` — euristiche sonno/stress/energia

**Mappatura dati**
| Apple Health | Campo Athena | Uso nel Recovery Score |
|--------------|--------------|------------------------|
| SleepAnalysis | `sleepHours` | 40% |
| HeartRateVariability (SDNN) | `hrv` | 10% + stima stress |
| RestingHeartRate | `restingHR` | stima energia |
| StepCount | `steps` | 10% |

---

## Note tecniche / limiti
- Il sync in background su iOS non ha un orario garantito: iOS decide quando eseguirlo
  (di solito quando carichi il telefono di notte). Il pulsante "Sincronizza ora" è sempre disponibile.
- L'HRV viene normalizzata in millisecondi (Apple la salva in secondi).
- Se il sonno non ha le fasi dettagliate (iPhone vecchi), l'app usa il tempo "a letto".
