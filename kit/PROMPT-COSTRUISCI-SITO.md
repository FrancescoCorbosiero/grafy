# Prompt · Costruisci un atlante Correspondentia da un seme

> **Come usarlo.** Apri una sessione di Claude Code su una copia di questo
> repository (una copia della fabbrica — questo repository), metti il seme in
> `kit/seme.json` (o allegalo al prompt chiedendo di salvarlo lì), e incolla
> questo file. Tutto ciò che segue è rivolto a Claude Code.

Questo repository è il **motore** di un atlante ipermediale a grafo: pipeline
dati con validazione Zod, viste (grafo 2D, relazioni testuali, timeline, percorsi,
volume lineare, ricerca, atlante dei simboli, blog), tema "strumento
cartografico", test unitari ed e2e, CI e deploy su GitHub Pages. Il contenuto
attuale (esoterismo occidentale) è **il caso di riferimento da sostituire**
con quello del seme. La UX non si tocca; cambia ciò che il seme dichiara.

## 0 · Valida il seme, poi decidi

```bash
npm ci
npx tsx kit/valida-seme.ts kit/seme.json
```

- Errori (✗): fermati e correggi il seme prima di tutto il resto.
- Avvisi (⚠): riportali all'utente nel riepilogo iniziale con il tuo piano
  (colmarli durante la costruzione o accettarli motivando).
- Verdetto `idoneo-con-adattamenti`: leggi le note della valutazione — sono
  vincoli di progetto (es. doppio registro disattivato ⇒ nascondi
  l'interruttore "leggendarie" in legenda e nello stato URL).

## 1 · Il motore si adatta da sé: seme in posizione, codegen, verifica

Il motore è **seed-native**: la tassonomia non si scrive nel codice.

1. Metti il seme in `kit/seme.json` (fatto al passo 0).
2. Esegui `npm run data`. Il primo passo (`scripts/genera-costanti.ts`)
   genera da `kit/seme.json`:
   - `src/generated/costanti.ts` — tipi di nodo e di arco, etichette, archi
     derivati e leggendari, `N_PARTI`, nomi delle parti (tipi statici);
   - `src/generated/parti.css` — variabili `--parte-*` chiaro/scuro, dai set
     pre-validati in deuteranopia di `src/lib/palette-parti.ts` (4–8 parti).
3. Verifica il codegen: leggi il riepilogo a terminale, apri
   `src/generated/costanti.ts` e controlla tipi, etichette e nomi delle
   parti. Il nome breve di una parte viene dalla coda del suo id
   (`parte-5-simboli` → «Simboli»), con gli accenti recuperati dal titolo:
   se un nome non ti convince, sistemare l'id o il titolo nel seme è la
   correzione giusta. `npm test` deve essere già verde qui: schema,
   invarianti e palette girano sulle costanti generate.

Schema Zod, filtri del grafo, legenda, palette e variabili CSS leggono tutto
dal modulo generato: **nessuna modifica a mano del codice**. Facoltative (mai
prerequisiti): glifi dedicati ai tuoi tipi in `src/lib/icone.ts` (altrimenti
glifo generico), ordine delle corsie della timeline in
`src/components/islands/TimelineView.tsx`, colori d'arco (assegnati per
posizione in `src/lib/palette.ts`).

## 2 · Sostituisci il contenuto con il seme

1. **Svuota** `src/content/voci/`, `src/content/percorsi/`,
   `src/content/blog/`, `contenuti/` e le pagine di `src/pages/diagrammi/`
   (tranne `index.astro`). Elimina anche `scripts/scaffold/` (gli script
   usa-e-getta con cui fu generato l'inventario di riferimento: dichiarano
   la sua tassonomia e coi tuoi tipi non compilano più). Adatta o svuota le
   pagine legate a tipi dell'istanza di riferimento
   (`src/pages/simboli.astro`, l'atlante dei simboli) se il tuo seme non ha
   un tipo corrispondente.
2. **Genera le voci** da `kit/seme.json`: una `.md` per voce con frontmatter
   completo (id, titolo, tipo, parte, peso, sommario, periodo, alias, luoghi,
   archi, fonti) e un **corpo breve provvisorio** (2–4 frasi dal sommario +
   spunti). Le voci `parte-N` si generano dalle `parti` del seme. Scriviti
   uno script usa-e-getta in `kit/` per questa trasformazione: niente
   generazione a mano di 200 file.
3. **Percorsi**: una `.md` per percorso; le `tracce` diventano i `testo`
   delle tappe (se una traccia è sotto le 40 parole, sviluppala già ora).
4. **Identità**: nome e sottotitolo del progetto in `package.json`, `Base.astro`,
   `Intestazione`, `PiePagina`, `index.astro`, `README`, JSON-LD; `BASE` in
   `astro.config.mjs` = nome del nuovo repository; monogramma del marchio
   (2 lettere dal nome) in `Intestazione`, `PiePagina` e `favicon.svg`.
   Il tema resta quello del motore: è già indipendente dall'argomento.
5. Da qui in avanti la pipeline deve girare: `npm test` (schema + invarianti
   del grafo verdi) e `npm run build`. Non procedere con contenuti lunghi
   finché la base non è verde.

## 3 · Scrivi i contenuti (le fasi lunghe)

Nell'ordine che ha funzionato per il caso di riferimento:

1. **Corpi delle voci** alle lunghezze di `regole.lunghezze`, in lotti
   tematici (un tipo o una parte alla volta), rispettando **ogni guardrail**
   del seme in **ogni** corpo. Link interni `[titolo](/voce/id)` solo verso
   voci esistenti — la pipeline li valida e la build fallisce sui rotti.
   Committa per lotti, non in un colpo solo.
2. **Volume lineare**: scrivi i capitoli in `contenuti/` (un file per parte,
   più un capitolo introduttivo "come usare questo volume"), prosa continua
   che attraversa le voci della parte nell'ordine giusto. La pipeline li
   trasforma nei capitoli di `/leggi`.
3. **Diagrammi** (se il seme li dichiara): una pagina Astro ciascuno, SVG
   inline disegnato su misura, tema-consapevole (variabili CSS, mai colori
   fissi), con alternativa testuale completa.
4. **Blog**: 3 articoli iniziali del "diario di redazione" — perché questo
   atlante, come studiarci, la scelta epistemica del doppio registro nel
   dominio (o la sua assenza). Adatta, non copiare, quelli del riferimento.
5. **Home**: statistiche, porte e testi della home leggono già dai dati
   generati; verifica che i testi fissi non citino più il vecchio argomento.

## 4 · Verifica i contenuti (obbligatoria)

I corpi si scrivono in lotti veloci: questa fase li ripassa da studioso, non
da autore. Per **ogni voce di peso 4 e 5**:

1. rileggi il corpo confrontandolo con le **fonti citate in calce** alla
   voce e con il **sommario del seme**: ogni affermazione fattuale
   (datazioni, attribuzioni, filiazioni, primati, numeri) deve essere
   sostenuta da ciò che le fonti dicono davvero;
2. **correggi** le affermazioni non sostenute: riscrivile, attenuale con
   attribuzione esplicita («secondo X…»), o eliminale;
3. tieni un **elenco delle affermazioni rimaste incerte** dopo il
   controllo — quelle che non hai potuto né confermare né smentire con le
   fonti a disposizione.

Consegna all'utente l'elenco delle affermazioni incerte nel riepilogo
finale: **le incertezze si dichiarano, non si silenziano** (è lo stesso
principio del doppio registro del grafo, applicato alla prosa). Questa fase
è processo di rilettura, non tooling: non servono strumenti nuovi.

## 5 · Verifica tecnica, deploy, definizione di fatto

- `npm test` · `npm run build` · `node scripts/verifica-bundle.mjs` ·
  `npx playwright test` (in locale con
  `PLAYWRIGHT_EXECUTABLE=/opt/pw-browsers/chromium` se l'ambiente lo
  richiede). Aggiorna le e2e dove citano titoli del vecchio argomento.
- `npx tsx kit/estrai-seme.ts` deve rigenerare un seme equivalente a quello
  di partenza (le sezioni di progetto sono riprese da `kit/seme.json`; voci,
  parti e percorsi dal contenuto reale — e le `parti` del contenuto devono
  coincidere con quelle del seme). Aggiorna `kit/esempio/` col nuovo seme:
  `npm run seme:controlla` è il check che gira in CI.
- Screenshot di home (chiaro/scuro), un dossier voce, il grafo → all'utente.
- CI verde sul branch; per pubblicare: GitHub Pages → Source "GitHub Actions"
  (impostazione che solo l'utente può attivare).

**Fatto** significa: seme valido e allineato, zero voci col corpo
provvisorio, **verifica dei contenuti della fase 4 eseguita su tutte le voci
di peso 4 e 5 con l'elenco delle affermazioni incerte consegnato**, tutte le
suite verdi, budget bundle rispettato, screenshot consegnati. Se l'utente ha
fissato un budget di tempo/token, la priorità è: base verde (fasi 0–2) >
corpi di peso 5 e 4 > volume > resto dei corpi > diagrammi > blog — ma la
fase 4 non si salta: vale per tutte le voci di peso 4 e 5 che hanno un corpo
definitivo, qualunque sia il punto in cui ti fermi.
