# Athena AI — Web App & PWA Guide

Athena AI è una **Progressive Web App (PWA)**: gira nel browser e può essere
installata sulla schermata Home dell'iPhone (e Android) come una vera app, a
schermo intero, senza barre di Safari.

Questa guida è scritta anche per chi **non è tecnico**.

---

## Cosa è stato aggiunto (riepilogo tecnico)

### File creati
| File | Motivo |
|------|--------|
| `apps/web/public/manifest.json` | Definisce nome, icone, colori e modalità standalone della PWA |
| `apps/web/public/sw.js` | Service worker: cache asset statici + fallback offline. **Non tocca mai `/api/*`** |
| `apps/web/public/icons/icon-192.png` | Icona PWA 192px |
| `apps/web/public/icons/icon-512.png` | Icona PWA 512px |
| `apps/web/public/icons/icon-192-maskable.png` | Icona adattiva Android 192px |
| `apps/web/public/icons/icon-512-maskable.png` | Icona adattiva Android 512px |
| `apps/web/public/icons/apple-touch-icon.png` | Icona iPhone "Aggiungi a Home" (180px) |
| `apps/web/public/icons/favicon-32.png` / `favicon-16.png` | Favicon browser desktop |
| `apps/web/src/components/pwa/ServiceWorkerRegistration.tsx` | Registra il service worker lato client (solo in produzione) |
| `apps/web/vercel.json` | Header corretti per il service worker su Vercel |
| `netlify.toml` | Configurazione deploy per Netlify |

### File modificati
| File | Cosa è cambiato | Funzionalità alterata? |
|------|-----------------|------------------------|
| `apps/web/src/app/layout.tsx` | Aggiunti `manifest`, `icons`, `appleWebApp`, export `viewport`, registrazione SW | **No** — solo metadati additivi |
| `apps/web/next.config.mjs` | Aggiunti header per `/sw.js` e `/manifest.json` | **No** — solo HTTP headers |

### Conferma: nessuna funzionalità alterata
- ❌ Nessuna modifica a logiche di business
- ❌ Nessuna modifica a workflow
- ❌ Nessuna modifica al database
- ❌ Nessuna modifica alle API
- ❌ Nessuna modifica all'autenticazione
- ❌ Nessuna modifica a schermate o comportamento
- ✅ Il service worker **bypassa sempre** `/api/*` e tutte le richieste non-GET (login, mutazioni): il backend resta l'unica fonte di verità.

### Rollback
```bash
# Torna esattamente allo stato pre-PWA:
git reset --hard pre-pwa-backup
```

---

## 1. Avviare l'app sul web (in locale)

Sul tuo PC, dalla cartella del progetto:

```bash
# Installa le dipendenze (solo la prima volta)
pnpm install

# Avvia tutto (frontend + backend)
pnpm dev
```

Apri il browser su **http://localhost:3000**

> Per provare solo il frontend: `pnpm --filter @athena/web dev`

---

## 2. Pubblicarla online (la via più semplice: Vercel)

Vercel è gratis per progetti personali ed è il modo più semplice.

### Passo dopo passo
1. Vai su **https://vercel.com** e registrati con GitHub.
2. Clicca **"Add New… → Project"**.
3. Seleziona il repository **athena-ai**.
4. In **"Root Directory"** scegli **`apps/web`** (importante: è un monorepo!).
5. Framework: Vercel rileva **Next.js** in automatico.
6. In **"Environment Variables"** aggiungi:
   - `NEXT_PUBLIC_API_URL` = l'URL pubblico della tua API (es. `https://api.tuodominio.com`)
7. Clicca **Deploy** e aspetta ~2 minuti.
8. Vercel ti dà un link tipo `https://athena-ai.vercel.app` — quella è la tua app online! ✅

### Alternative
- **Netlify**: importa il repo, la configurazione è già in `netlify.toml`. Installa il plugin `@netlify/plugin-nextjs` (lo fa in automatico).
- **Cloudflare Pages**: framework preset = Next.js, build command `next build`, root `apps/web`. Richiede il runtime `@cloudflare/next-on-pages` per le funzioni server.

---

## 3. Aprirla da Safari (iPhone)

1. Sul tuo iPhone, apri **Safari** (deve essere Safari, non Chrome).
2. Vai sull'indirizzo della tua app:
   - Online: `https://athena-ai.vercel.app`
   - In locale (PC e iPhone sulla stessa WiFi): `http://192.168.1.XX:3000`
3. Aspetta che l'app si carichi.

---

## 4. Installarla sulla schermata Home dell'iPhone

1. Con l'app aperta in **Safari**, tocca il pulsante **Condividi**
   (il quadrato con la freccia verso l'alto, in basso al centro).
2. Scorri e tocca **"Aggiungi a Home"** (Add to Home Screen).
3. Tocca **"Aggiungi"** in alto a destra.
4. Chiudi Safari: ora hai l'icona ⚡ **Athena AI** sulla schermata Home.
5. Aprila dall'icona: si apre **a schermo intero**, senza barre di Safari, come una vera app. 🎉

> ⚠️ Nota iPhone: l'installazione "Aggiungi a Home" funziona **solo da Safari**.
> Da Chrome o altri browser l'opzione non compare (è una limitazione di iOS).

### Android
Su Android, da Chrome, comparirà automaticamente un banner **"Installa app"**,
oppure menu **⋮ → Installa app / Aggiungi a schermata Home**.

---

## 5. Verificare che funzioni correttamente

1. **Icona corretta**: sulla Home deve apparire l'icona viola con il fulmine ⚡.
2. **Schermo intero**: aprendo dall'icona non devi vedere la barra degli indirizzi di Safari.
3. **Login funziona**: accedi normalmente — l'autenticazione passa sempre dal backend.
4. **Offline base**: con l'app già aperta una volta, attivando la modalità aereo
   l'interfaccia caricata resta visibile (le azioni che richiedono internet,
   ovviamente, no).
5. **Lighthouse (opzionale, da PC)**: in Chrome → DevTools (F12) → tab **Lighthouse**
   → categoria **PWA** → "Analyze". Dovresti vedere installabilità ✅.

---

## Domande frequenti

**Il service worker può rompere il login o i dati?**
No. Per progetto, il service worker **non intercetta mai** le chiamate `/api/*`
né le richieste POST/PUT/PATCH/DELETE. Tutto ciò che riguarda dati, login e
mutazioni va sempre direttamente al backend.

**In sviluppo (localhost) il service worker è attivo?**
No, è disabilitato in `development` per evitare problemi di cache mentre lavori.
Si attiva solo in produzione (`pnpm build && pnpm start`, o dopo il deploy).

**Come aggiorno le icone con un logo vero?**
Sostituisci i PNG in `apps/web/public/icons/` mantenendo gli stessi nomi e
dimensioni. Le icone attuali sono generate con il brand Athena (gradiente
viola + fulmine).
