# CHECKPOINT — Athena AI Deployment & Optimization
**Ultimo aggiornamento**: 17 Luglio 2026, ~15:50

## 🌐 URL e credenziali di produzione

- **Frontend (Vercel)**: https://athena-ai-api.vercel.app (progetto Vercel si chiama "athena-ai-api" ma serve `apps/web`, Root Directory = `apps/web`, Framework Preset = Next.js)
- **Backend (Render)**: https://athena-ai-ndvj.onrender.com (servizio "Athena-Ai", piano Free, root = repo, Docker)
- **Database**: Supabase project "Athena-Ai" (`vzbtgoldrzpmafrkxwis.supabase.co`) — password conservata privatamente dall'utente, NON in questo file
  - Usare il **Session Pooler** (IPv4-compatibile), NON la connessione diretta (IPv6, non raggiungibile da Render): host `aws-0-eu-west-1.pooler.supabase.com:5432`, user `postgres.vzbtgoldrzpmafrkxwis`, già configurato correttamente in DATABASE_URL su Render
- **Qdrant Cloud**: cluster `athena-ai-prod` (`338a9b5b-007b-40c5-94d6-8cb32141f295.eu-central-1-0.aws.cloud.qdrant.io`)
- **Branch di lavoro**: `claude/ai-fitness-platform-Ovwzu` (PR #1 su Master69811/Athena-Ai)

## ✅ Variabili d'ambiente confermate presenti su Render
DATABASE_URL, FRONTEND_URL=https://athena-ai-api.vercel.app, JWT_SECRET, JWT_REFRESH_SECRET, NODE_ENV=production, PORT=3001, QDRANT_URL, QDRANT_API_KEY, GEMINI_API_KEY (presente e confermata su Render, valore non riportato qui per sicurezza), CORS_ORIGINS (aggiunta con i domini preview Vercel), REDIS_URL (innocuo/inutilizzato, nessun codice lo legge), SKIP_ENV_VALIDATION (no-op, ignorabile)

## ✅ STATO ATTUALE: App LIVE e funzionante end-to-end
- Backend health check: OK (`{"status":"ok","services":{"database":"ok","api":"ok"}}`)
- Registrazione utente testata via curl: **HTTP 201, funziona**
- CORS testato con dominio Vercel produzione: **204, funziona**
- Onboarding (salvataggio profilo): **HTTP 201, funziona**
- Generazione piano AI (`POST /api/v1/ai-workout/generate`): **HTTP 500 — BUG APERTO, causa ancora da determinare nei log Render** (GEMINI_API_KEY confermata presente, quindi la causa è altrove: chiave forse invalida, nome modello sbagliato, o bug nel parsing risposta AI)

## 📦 Commit già pushati su origin/claude/ai-fitness-platform-Ovwzu (in ordine cronologico)
1. `19c45ee` a11y + mobile UX + fix token refresh race + topbar clock
2. `16fe813` production security hardening (CORS, Swagger gating, exception filter)
3. `d30e19e` squash migration history into single baseline (fix DB init)
4. `421cb32` remove Prisma CLI notice box leaked into migration.sql
5. `70fb6cc` fix production boot crash (validateSecrets bug con stringa vuota nei placeholder — bug critico), Stripe guard, timer cleanup
6. `4b283a5` RagService: QdrantClient lazy instantiation (altro fix boot-crash, url vuoto in produzione)
7. `e72f0fa` **rimozione dati falsi in tutta l'app + fix UX core** (dashboard, progress, achievements, workout page, session page, coach, nutrition, mobile nav, sidebar/topbar, RecoveryModal) — **verificato 135/135 test, build OK, GIÀ PUSHATO**

## ✅ Commit 8: `21191e9` — GIÀ PUSHATO (17 Luglio, 16:34)
- `apps/api/src/modules/ai-workout/ai-workout.service.ts` — gestione errori (try/catch attorno alla chiamata Gemini + parsing JSON, throw ServiceUnavailableException con messaggio chiaro invece di 500 generico opaco)
- `apps/web/src/app/(onboarding)/onboarding/page.tsx` — resilienza wizard onboarding: salvataggio automatico progresso in sessionStorage (sopravvive a redirect/reload), + schermata "Riprova" se la generazione piano fallisce
- `CHECKPOINT.md` — questo file (nota: prima versione conteneva un secret Gemini per errore, bloccato da GitHub push protection, corretto con `git commit --amend` prima del push riuscito)
- Test: 84/84 API + 51/51 web passano. Build: nest build OK. tsc --noEmit pulito su onboarding page.
- **CONFERMATO IN PRODUZIONE (17/07 16:52 UTC)**: redeploy completato, test end-to-end ripetuto. Ora l'errore è pulito: HTTP 503 "Generazione del piano AI temporaneamente non disponibile" (prima era 500 opaco). Il messaggio client NON rivela la causa reale per sicurezza — serve leggere i log Render (`[AiWorkoutService] ERROR ...`) per vedere l'errore Gemini preciso (probabile: formato chiave non valido — vedi nota sopra su formato `AQ.` vs `AIzaSy...`, oppure nome modello errato, oppure quota).
## ✅ Commit 9: `c3ce4a9` — 3 FIX CRITICI, PUSHATO
1. **Causa esatta del bug onboarding**: store zustand (`auth.store.ts`) mai aggiornato dopo onboarding → AppLayout rimandava sempre a /onboarding vuoto. Fix: `onboarding/page.tsx` chiama `setUser()` con profilo aggiornato subito dopo il successo.
2. **Sicurezza — rotazione refresh token rotta**: bcrypt tronca a 72 byte, prefisso JWT fisso ≥72 byte → QUALSIASI refresh token mai emesso restava valido per sempre. Fix: hash SHA-256 prima di bcrypt + verifica crittografica esplicita con `jwtService.verifyAsync`.
3. **Causa esatta 503 su generazione AI**: `GEMINI_MODEL` default `gemini-2.0-flash`, ritirato da Google il 1 giugno 2026. Fix: aggiornato a `gemini-2.5-flash` in tutti i file + .env.example.
   ⚠️ **AZIONE UTENTE RICHIESTA**: se `GEMINI_MODEL` è impostato esplicitamente su Render (sovrascrive il default nel codice), va aggiornato manualmente a `gemini-2.5-flash` lì.

## ✅ Commit 10: `e3fa5e0` — 9 fix aggiuntivi da sweep QA, PUSHATO
- Guardia "già onboarded" su mount pagina onboarding (redirect a /dashboard)
- Cookie `athena_session` ora pulito anche su refresh fallito (evitava loop di redirect fino a 7 giorni)
- `completeOnboarding` ora idempotente (no-op se già completato)
- Pagina Recupero: rimossi dati finti per utenti nuovi (bug `hasData` sempre true)
- Vincolo unicità `(userId, date)` su BodyMeasurement + upsert (nuova migrazione `20260717170000`)
- Nutrizione: invalidazione cache dopo rigenerazione piano AI (target calorie/macro non più stantii)
- 4 query di lettura (workout/nutrition/exercises/history) ora gestiscono errori distintamente da "nessun dato"
- Ricerca esercizi debounced (era una richiesta per tasto)
- Badge RPE workout corretto (leggeva campo sbagliato)
- Chat coach: cronologia ripristinata al mount invece di azzerarsi ad ogni navigazione
- Settings: campo body-fat % corretto (nome campo sbagliato), Bio ora si cancella correttamente
- Achievements: distingue errore API da lista vuota

**STATO TEST END-TO-END (17/07 17:30 UTC)**: testato dopo attesa di ~5 minuti dal push di `6a90e07` — il fix di idempotenza onboarding NON risulta ancora attivo in produzione (il secondo POST /users/onboarding sovrascrive ancora il profilo invece di fare no-op con messaggio "Onboarding was already completed."). Il codice locale è verificato corretto. Sospetto: Render non ha ancora completato il deploy dell'ultimo commit, oppure il deploy è bloccato/fallito.
**PROSSIMO STEP (bloccato in attesa dell'utente)**: utente deve controllare Render → Events per lo stato del deploy di `e3fa5e0`/`6a90e07`, forzare "Manual Deploy" se necessario, poi confermare quando è "Live" per ripetere il test di idempotenza e la generazione AI (serve anche verificare/aggiornare GEMINI_MODEL su Render se impostato esplicitamente, dato che ancora restituisce 503).

## ➡️ PROSSIMI PASSI (in ordine)
1. **Test + build** dei 2 file sopra: `cd apps/api && pnpm exec jest --silent && pnpm exec nest build` per il backend; per il frontend verificare tsc/build Next.js
2. **Commit + push** di questi 2 file (branch `claude/ai-fitness-platform-Ovwzu`)
3. Aspettare auto-redeploy Render (~2-3 min) e Vercel (~1 min)
4. **Ripetere il test end-to-end** della generazione AI via curl (vedi comando sotto) per vedere l'errore REALE (ora che il backend logga dettagliatamente prima di lanciare l'eccezione pulita)
5. **Controllare i log di Render** (Dashboard → Athena-Ai → Logs) subito dopo il test per vedere la vera causa dell'errore 500 sulla generazione AI — cercare righe `[AiWorkoutService] ERROR`
6. Se il problema è la chiave Gemini stessa (formato/validità): verificare su Render → Environment → GEMINI_API_KEY (valore NON riportato qui per sicurezza — non committare mai secret in file di testo). Nota: il formato della chiave vista in precedenza iniziava con `AQ.` invece del classico `AIzaSy...` atteso da `@google/generative-ai` SDK — potrebbe essere un tipo di credenziale Google diverso (es. OAuth) e non una vera Gemini API key da aistudio.google.com/apikey. Da verificare/rigenerare se necessario.
7. Fix e ripetere finché la generazione funziona end-to-end

## Comando di test rapido (bash)
```bash
# Registra un utente di test e prova l'intero flusso
EMAIL="test.$(date +%s)@athena-test.com"
TOKEN=$(curl -s -X POST https://athena-ai-ndvj.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"TestPassword123\",\"name\":\"Test\"}" \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

curl -s -X POST https://athena-ai-ndvj.onrender.com/api/v1/users/onboarding \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test","age":25,"gender":"MALE","heightCm":175,"weightKg":75,"goalType":"HYPERTROPHY","experienceLevel":"BEGINNER","methodology":"PPL","trainingDaysPerWeek":4,"sessionDurationMinutes":60,"hasGym":true,"equipment":[],"injuries":[],"sleepHoursAvg":7.5,"stressLevel":5,"dailyStepsAvg":8000,"workType":"MODERATE"}'

curl -s -X POST https://athena-ai-ndvj.onrender.com/api/v1/ai-workout/generate \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP: %{http_code}\n"
```

## Note operative
- Utente comunica in italiano, preferisce spiegazioni passo-passo per azioni nel browser (non ha accesso CLI diretto, opera tramite screenshot)
- Il progetto usa pnpm/turbo monorepo: `apps/api` (NestJS) + `apps/web` (Next.js)
- Render free tier: cold start fino a 50s dopo inattività
- NON esiste ancora una migrazione "seed" per dati demo — il DB è vuoto/pulito in produzione
