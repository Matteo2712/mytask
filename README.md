# MyTask

App di gestione task e sottotask, offline-first, costruita con lo stesso
stack e le stesse soluzioni già validate su CaliMat (vedi playbook nel
progetto "todolist").

## Cosa c'è già pronto

- `index.html` — l'app vera e propria (PWA), file singolo: HTML, CSS e JS
  tutti inline nello stesso file.
- `manifest.json` — `start_url: "/"` impostato fin da subito (evita il
  problema del 404 su Cloudflare Pages con gli APK PWABuilder).
- `sw.js` — service worker, cache-first per gli asset statici, esclude le
  chiamate a Supabase.
- `_redirects` — rewrite di sicurezza `/index.html → / (200)`.
- `supabase_schema.sql` — tabella `Task_items` con `parent_id` per i sottotask,
  RLS per isolare i dati per utente, trigger `updated_at`.
- `icons/` — icone PWA già generate (192/512, normali + maskable).
- `SUPABASE_URL` / `SUPABASE_KEY` già incollate in `index.html` (progetto
  `edlvmkjctzhqoswpppds`).

## Cosa manca prima di pubblicare

1. **Eseguire `supabase_schema.sql`**: apri il progetto Supabase su
   supabase.com → SQL Editor → incolla il contenuto del file → Run.
   Da lì in poi l'app ha una tabella `Task_items` pronta con RLS attiva.
2. **Verificare in Supabase → Authentication → Providers** che "Email" sia
   abilitato (è il metodo di login/registrazione usato nell'app).

## Deploy (flusso già rodato con CaliMat)

1. **GitKraken**: File → Init Repository sulla cartella `mytask/` → attiva
   "Create repository on GitHub.com" → scegli nome (es. `mytask`) e
   visibilità privata → Commit di tutti i file → Push.
2. **Cloudflare Pages**: collega il repository GitHub `mytask` come nuovo
   progetto Pages (build command vuoto, output directory `/` — è tutto
   statico). Ogni push successivo fa auto-deploy.
3. **PWABuilder**: una volta online su Cloudflare Pages, genera l'APK da
   `https://tuodominio.pages.dev`. Ricorda: se rigeneri l'APK in futuro,
   riusa sempre lo stesso `signing.keystore` (mai farne generare uno nuovo),
   altrimenti la fingerprint in `assetlinks.json` non corrisponde più e
   torna la barra degli indirizzi.

## Come funzionano task e sottotask

- Ogni task ha un `id` generato lato client (`crypto.randomUUID()`) e un
  `parent_id`: `null` = task principale, valorizzato = sottotask di quel task.
- Le scritture passano prima da `localStorage` (l'app funziona sempre,
  anche offline), poi tentano Supabase; se falliscono vengono accodate in
  `mt_pending_sync` e ritentate quando torna la connessione (evento
  `online`, focus finestra, o polling ogni 10s), fino a un massimo di 8
  tentativi per item.
- Il pallino nel pill in alto a destra mostra lo stato: verde = sincronizzato,
  arancione = sync in corso, rosso = modifiche in coda.

## Convenzione di naming tabelle (progetto MyTask)

Tutte le tabelle Supabase di questo progetto iniziano con il prefisso
`TASK_` (es. `Task_items`). Se in futuro aggiungiamo altre tabelle
(es. per etichette, promemoria, condivisioni), vanno chiamate `TASK_LABELS`,
`TASK_REMINDERS`, ecc., seguendo lo stesso schema.
