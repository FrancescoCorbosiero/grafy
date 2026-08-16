# Avvio · il repo-fabbrica Correspondentia

Questo repository è il **repo-fabbrica**: motore del sito (Astro + pipeline
dati + viste + test + CI), kit di replica (`kit/`) e semi pronti (`kit/semi/`).
Da questo repository si generano gli atlanti sui vari argomenti-nodo.

## 1 · Verifica la fabbrica

Clona questo repository e verifica che giri (l'istanza di riferimento,
l'esoterismo, funziona subito):

```bash
npm ci
npm run dev        # → http://localhost:4321/grafy/
npm test           # 73 test verdi
```

## 2 · Genera un progetto da un seme esistente

In `kit/semi/` trovi i semi già pronti e validati
(es. `seme-informatica.json` — progetto «Calculemus», 170 voci).

1. Crea il repository del nuovo progetto **come copia della fabbrica**
   (nuovo repo da questo template, o copia dei file).
2. Copia il seme scelto in `kit/seme.json`.
3. Esegui `npm ci && npm run data`: il motore è **seed-native** — il primo
   passo della pipeline genera tassonomia, etichette e palette delle parti
   da `kit/seme.json`, senza modifiche a mano del codice.
4. In `astro.config.mjs` imposta `BASE` al nome del nuovo repository
   (es. `/calculemus`).
5. Apri una sessione **Claude Code** sul nuovo repository e incolla il
   contenuto di `kit/PROMPT-COSTRUISCI-SITO.md`: verificherà il codegen,
   rigenererà i contenuti e scriverà corpi, volume, diagrammi e blog nelle
   fasi previste, verificando tutto (unit, e2e, budget, riletture delle
   voci principali contro le fonti) prima di chiudere.
6. Per pubblicare: **Settings → Pages → Source: GitHub Actions** sul nuovo
   repository.

## 3 · Genera il seme di un argomento nuovo

1. Incolla `kit/PROMPT-GENERA-SEME.md` a Claude (qualsiasi interfaccia)
   con l'argomento e i materiali che hai. Il prompt prima **valuta
   l'argomento-nodo** (rubrica a sei criteri, con verdetto esplicito e
   proposte di riperimetrazione se non regge), poi produce il seme JSON.
2. Salvalo in `kit/semi/<nome>.json` e validalo:

   ```bash
   npx tsx kit/valida-seme.ts kit/semi/<nome>.json
   ```

   Correggi gli errori (bloccanti) e valuta gli avvisi (soglie di qualità:
   densità di archi, coperture di fonti e datazioni, voci orfane, pesi).
3. Rivedi l'inventario a mano: è il punto di controllo che rende buono un
   atlante. Poi torna al passo 2.

## 4 · Tieni le istanze aggiornate sul motore

Ogni istanza è un fork della fabbrica: i fix del motore (pipeline, viste,
test, accessibilità) **non si propagano da soli**. La disciplina minima, da
adottare in ogni istanza:

```bash
git remote add fabbrica https://github.com/FrancescoCorbosiero/grafy   # una volta sola
git fetch fabbrica && git merge fabbrica/main                          # periodicamente
```

I conflitti attesi stanno **solo fuori dalle cartelle di contenuto**
(`src/content/`, `contenuti/`, `kit/seme.json`): quelle la fabbrica non le
tocca, sono esclusivamente dell'istanza. E con il motore seed-native —
tassonomia e palette generate da `kit/seme.json`, nessuna modifica a mano
di costanti o variabili CSS — l'istanza non ha più ragioni di divergere dal
codice del motore, quindi i merge sono quasi sempre puliti. Dopo ogni
merge: `npm test` e `npm run build` come rete di sicurezza. Niente
tooling dedicato: è una disciplina di remote git, non un sistema.

## Riferimenti

- `kit/LEGGIMI.md` — il flusso completo e i limiti onesti del kit
- `kit/SEME.schema.json` — la specifica formale del formato seme
- `kit/esempio/seme-esoterismo.json` — il seme dell'istanza di riferimento,
  estratto dal contenuto reale (`npm run seme:controlla` lo tiene allineato
  in CI)
- `README.md` — architettura del motore, comandi, qualità, deploy
