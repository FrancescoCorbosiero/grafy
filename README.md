# Grafy — la fabbrica Correspondentia

Il repository da cui si generano **atlanti ipermediali a grafo** su qualunque
argomento-nodo: motore (Astro + pipeline dati + viste + test + CI), **kit di
replica** (`kit/`: prompt, schema del seme, validatore, semi pronti) e
un'istanza di riferimento completa che tiene la fabbrica verificabile.

- Per usare la fabbrica: **[`kit/AVVIO-NUOVO-REPO.md`](kit/AVVIO-NUOVO-REPO.md)**
- Il flusso argomento → seme → sito: **[`kit/LEGGIMI.md`](kit/LEGGIMI.md)**
- Semi pronti in `kit/semi/` (informatica — «Calculemus», 170 voci validate)

---

## L'istanza di riferimento: Correspondentia Theatri

Atlante ipermediale dell'esoterismo occidentale: un volume di studio (in `contenuti/`)
smontato in **234 voci collegate a grafo** — correnti, concetti, pratiche, simboli, persone,
opere, eventi, luoghi — dove la struttura ipertestuale è la modalità primaria di esplorazione,
e ogni vista grafica ha un equivalente testuale accessibile.

Le **genealogie leggendarie** (Egitto → Templari → Rosacroce → Massoneria; tarocchi → antico
Egitto; Zohar → Shimon bar Yochai…) sono una feature concettuale centrale: archi
`attribuzione_infondata` tratteggiati, spenti di default, ognuno con la nota che spiega
perché l'attribuzione non regge.

## Viste

| Rotta | Contenuto |
|---|---|
| `/grafo` | Vista 2D principale (Sigma.js): filtri, slider temporale −800→2030 con riproduzione, ego-network, cluster, stato in query string |
| `/grafo/elenco` | Fallback accessibile: tabella completa ordinabile e filtrabile |
| `/relazioni` | Il grafo in forma di testo: liste di adiacenza per voce (archi, note, collocazioni) con filtri progressivi |
| `/relazioni/archi` | Tavola completa e ordinabile di tutti gli archi, genealogie leggendarie contrassegnate |
| `/tempo` | Timeline a corsie con zoom semantico, sincronizzata col grafo |
| `/voce/[id]` | Dossier statico: sommario, corpo, archi con note, fonti, mini-grafo ego |
| `/percorso/[slug]` | 4 percorsi d'autore con mappa del cammino sincronizzata allo scroll |
| `/percorsi/trova` | Cammino minimo fra due voci, reso come catena di frasi |
| `/simboli` | Atlante dei simboli con chi li impiega |
| `/diagrammi` | Albero sefirotico, fasi dell'opera, tre mondi di Agrippa, ruota delle corrispondenze |
| `/leggi` | Il volume lineare, capitolo per capitolo, con progressione di lettura |
| `/cerca` | Full-text FlexSearch; palette globale con `Ctrl/Cmd+K` |
| `/studio` | Il registro locale dell'apprendimento: copertura per parte e per peso, autovalutazioni («assimilata»/«da ripassare»), percorsi e volume, prossimi passi — nel browser, sincronizzato fra le tab |

## Architettura dei dati (fonte unica)

Il motore è **seed-native**: la tassonomia (tipi di nodo e di arco, etichette, archi derivati
e leggendari, parti) non è scritta nel codice ma **generata** da `kit/seme.json` come primo
passo della pipeline. Il grafo **non** è un file parallelo al contenuto: viene derivato a
build time dal frontmatter delle voci in `src/content/voci/` (una voce = un nodo; gli archi
sono dichiarati nella voce di partenza; gli archi di contenimento parte→voce sono derivati
dal campo `parte`).

```
kit/seme.json ───────────▶ scripts/genera-costanti.ts ─▶ src/generated/costanti.ts (tassonomia)
     (tassonomia, parti)      · tipi statici (as const)   src/generated/parti.css (colori parte)
src/content/voci/*.md ──▶ scripts/build-data.ts ──▶ src/generated/graph.json (pagine statiche)
     (frontmatter Zod)        · validazioni bloccanti     public/data/graph.json (viste client)
                              · layout ForceAtlas2        public/data/ricerca-*.json (indici)
                                deterministico
contenuti/*.md ──────────▶ scripts/build-capitoli.ts ──▶ src/generated/capitoli/ (per /leggi)
```

Validazioni che **fermano la build**: riferimenti pendenti, archi duplicati o riflessivi,
cicli nel contenimento, nodi non raggiungibili, archi leggendari senza nota, link interni
a voci inesistenti, id non kebab-case, tipi o parti fuori dalla tassonomia del seme.

## Comandi

```bash
npm run dev        # pipeline dati + server di sviluppo
npm run build      # pipeline dati + build statica in dist/
npm test           # pipeline dati + Vitest (schema, invarianti grafo, palette, URL)
npm run test:e2e   # Playwright: i tre percorsi utente critici
npm run data       # solo la pipeline dati
node scripts/verifica-bundle.mjs   # budget: home < 200 KB gzip (dopo build)
```

L'inventario delle voci (id, tipi, pesi, archi) è documentato in `docs/inventario-voci.md`;
le regole redazionali in `docs/guida-di-stile.md`. Il brief completo è `BRIEF.md`.

## Qualità

- **Accessibilità**: ogni vista grafica ha l'alternativa testuale; navigazione completa da
  tastiera; `prefers-reduced-motion` rispettato (niente riproduzione automatica, camera senza
  animazioni); i sei colori di parte sono verificati in deuteranopia **da un test automatico**
  (matrici di Machado in `tests/unit/palette-deuteranopia.test.ts`).
- **Performance**: librerie grafo caricate solo sulle rotte che le usano; bundle della home
  ~72 KB gzip (soglia 200 KB, verificata in CI); nessuna chiamata di rete a runtime (font
  self-hosted, indici pre-generati).
- **Contenuti**: piano descrittivo e piano fattuale sempre distinti; datazione reale vs
  dichiarata per le pseudoepigrafe; le pratiche sono descritte, mai istruite.
- **Apprendimento**: il fine è l'assorbimento organizzato del campo — il registro di studio
  (`/studio`, `src/lib/studio.ts`) traccia consultazioni, letture e autovalutazioni per voce,
  percorso e capitolo, tutto in `localStorage` (niente account né server), condiviso e
  sincronizzato dal vivo fra le tab dello stesso browser; la navigazione è raggruppata per
  gesto (Esplora / Studia) con menu `<details>` che funzionano anche senza JavaScript.

## Deploy

GitHub Pages via Actions (`.github/workflows/deploy.yml`, attivo sul ramo `main`):
in **Settings → Pages** impostare *Source: GitHub Actions*. Il sito è configurato per
`https://francescocorbosiero.github.io/grafy/` (base path in
`astro.config.mjs`). La CI (`ci.yml`) esegue test unitari, build, budget bundle ed e2e.

## Replica per altri argomenti

Il sito è un'istanza di un motore riutilizzabile: il contenuto è separabile in un
**seme** (JSON con tassonomia, parti, voci, archi, regole) da cui un progetto
gemello su un altro argomento-nodo può essere generato e costruito. Basta mettere
il seme in `kit/seme.json` ed eseguire `npm run data`: il motore si adatta da sé
alla tassonomia, senza modifiche a mano del codice. Il flusso in tre passi —
genera il seme (con validazione dell'argomento), valida il seme, costruisci il
sito con Claude Code — è documentato in **[`kit/LEGGIMI.md`](kit/LEGGIMI.md)**.
Il seme di questo stesso sito, estratto dal contenuto reale e validato in CI, è in
`kit/esempio/seme-esoterismo.json` (nella fabbrica, `kit/seme.json` ne è la copia:
l'istanza di riferimento si auto-descrive col proprio seme).
