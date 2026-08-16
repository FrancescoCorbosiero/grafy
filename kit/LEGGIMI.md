# Kit di replica · da un argomento-nodo a un atlante Correspondentia

Questo sito (Correspondentia Theatri, esoterismo occidentale) è un'istanza di
un motore riutilizzabile: **atlante ipermediale a grafo** con voci tipizzate,
relazioni tipizzate a doppio registro (documentato / dichiarato), timeline,
percorsi narrati, volume lineare, ricerca, blog e registro di studio locale
(/studio: il lettore traccia e consulta il proprio apprendimento). Il kit
serve a replicarlo su un altro argomento in tre passi.

## Il flusso

```
argomento + materiali            seme (JSON)                    sito
        │                            │                           │
        ▼                            ▼                           ▼
 [1] PROMPT-GENERA-SEME  ──►  [2] valida-seme  ──►  [3] PROMPT-COSTRUISCI-SITO
     (qualsiasi Claude)           (questo repo)         (Claude Code su una
      valuta l'argomento,          errori = stop         copia di questo repo,
      produce il seme              avvisi = qualità      col seme in kit/seme.json)
```

1. **Genera il seme** — incolla `PROMPT-GENERA-SEME.md` a Claude con
   l'argomento e i materiali. Il prompt prima **valuta l'argomento-nodo**
   (rubrica a 6 criteri, verdetto esplicito: un argomento che non è un campo
   di relazioni viene respinto con proposte di riperimetrazione), poi
   costruisce tassonomia, parti, inventario delle voci con pesi e datazioni,
   archi con note, fonti, percorsi. Uscita: un JSON conforme a
   `SEME.schema.json`.
2. **Valida il seme** — `npx tsx kit/valida-seme.ts <seme.json>`: struttura,
   integrità referenziale (ogni arco punta a una voce esistente), vincoli
   (note obbligatorie sugli archi leggendari, parti consecutive…) e soglie di
   qualità (densità ≥ 2 archi/voce, zero orfane, coperture di fonti e
   datazioni, pesi a piramide).
3. **Costruisci il sito** — sessione Claude Code su una copia di questo
   repository con il seme in `kit/seme.json` e `PROMPT-COSTRUISCI-SITO.md`
   incollato. Il motore è **seed-native**: la tassonomia non si adatta a
   mano, la genera `npm run data` da `kit/seme.json` (codegen). Restano le
   fasi collaudate di contenuto: rigenerare le voci, scrivere
   corpi/volume/diagrammi/blog, verificare i corpi delle voci principali
   contro le fonti, verificare tutto (unit, e2e, budget) e pubblicare.

## Cosa contiene il seme (e cosa no)

Il seme è **la mappa, non la prosa**: progetto e valutazione, tassonomia
(tipi di nodo e di arco, archi derivati, doppio registro), parti, regole
(guardrail epistemici del dominio, lunghezze per peso), voci (frontmatter
completo: sommario, periodo, alias, luoghi, archi con note, fonti, spunti),
percorsi (tappe con tracce), diagrammi dichiarati. I corpi delle voci, i
capitoli del volume e gli articoli del blog vengono scritti in fase di
costruzione, dentro i guardrail del seme.

## File del kit

| File | Ruolo |
|---|---|
| `seme.json` | **Il seme del progetto corrente**: la fonte da cui `npm run data` genera la tassonomia del motore (nella fabbrica è la copia del seme di riferimento) |
| `AVVIO-NUOVO-REPO.md` | Come mettere la fabbrica su un repo nuovo, generare i progetti e tenerli aggiornati sul motore |
| `SEME.schema.json` | Specifica formale del formato (JSON Schema draft-07) |
| `valida-seme.ts` | Validatore: errori bloccanti + avvisi di qualità |
| `estrai-seme.ts` | Estrae il seme **di questo sito**: voci/parti/percorsi dal contenuto reale, sezioni di progetto riprese da `kit/seme.json` (`--verifica` per il check di allineamento in CI) |
| `esempio/seme-esoterismo.json` | Il seme di questo sito, estratto e validato: riferimento vivo di formato e densità |
| `semi/` | Semi pronti per nuovi progetti (`seme-informatica.json` — «Calculemus», 170 voci, validato senza avvisi) |
| `PROMPT-GENERA-SEME.md` | Da argomento a seme (con la rubrica di validazione dell'argomento) |
| `PROMPT-COSTRUISCI-SITO.md` | Da seme a sito, per Claude Code |

Comandi: `npm run seme:estrai` · `npm run seme:valida` (valida `kit/seme.json`) ·
`npm run seme:controlla` (gira in CI: seme di esempio allineato al contenuto e
alle `parti` di `kit/seme.json`, poi validazione di `kit/seme.json`).

## Limiti onesti

- Il seme di esempio riflette lo stato del contenuto: oggi segnala in avviso
  la copertura fonti al 59% (obiettivo ≥ 80%) — un debito del contenuto, non
  del formato.
- La qualità di un seme generato dipende dalla conoscenza del dominio del
  modello e dai materiali forniti: la rubrica respinge gli argomenti deboli,
  non certifica l'esattezza di ogni arco. La revisione umana dell'inventario
  resta il punto di controllo migliore fra il passo 1 e il passo 3.
- Il motore presuppone la lingua dei contenuti coerente in tutto il sito
  (`progetto.lingua`); l'interfaccia è in italiano e andrebbe tradotta a
  parte per progetti in altre lingue.
