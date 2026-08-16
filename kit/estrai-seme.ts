/**
 * Estrae il "seme" di questo sito: il file unico da cui un progetto
 * Correspondentia può essere rigenerato per un altro argomento-nodo.
 * Serve da esempio verificato del formato (kit/SEME.schema.json) e da
 * check di allineamento contenuto↔seme (`--verifica`, in CI).
 *
 * CHI CONTROLLA CHE COSA (per non essere una tautologia):
 * - le sezioni ESTRATTE DAL CONTENUTO REALE — parti, voci, percorsi,
 *   diagrammi — vengono da src/content e src/pages: qui `--verifica`
 *   controlla che il seme committato in kit/esempio/ non diverga dal sito;
 * - le sezioni DI PROGETTO — progetto, valutazione, tassonomia, regole —
 *   non sono ricavabili dal contenuto e vengono lette alla lettera da
 *   kit/seme.json (la fonte del codegen, scripts/genera-costanti.ts). NON
 *   vengono più ri-derivate dalle costanti del motore: quelle costanti
 *   sono a loro volta generate da kit/seme.json, e il confronto sarebbe
 *   circolare. L'aderenza del contenuto alla tassonomia è già garantita
 *   dalla pipeline (lo schema Zod costruito sulle costanti generate
 *   rifiuta tipi fuori dal seme a ogni build);
 * - il ponte fra i due mondi è il controllo esplicito qui sotto: le
 *   `parti` dichiarate in kit/seme.json (che guidano il codegen: N_PARTI,
 *   nomi, palette) devono coincidere con le parti reali del contenuto.
 *
 * Uso:  tsx kit/estrai-seme.ts            (ri)scrive kit/esempio/seme-esoterismo.json
 *       tsx kit/estrai-seme.ts --verifica  confronta senza scrivere (CI)
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEME_PROGETTO = join(RADICE, 'kit/seme.json');
const USCITA = join(RADICE, 'kit/esempio/seme-esoterismo.json');

/* ── sezioni di progetto: da kit/seme.json (fonte del codegen) ────────── */

if (!existsSync(SEME_PROGETTO)) {
  console.error(
    '✗ kit/seme.json non esiste: è la fonte di tassonomia, progetto, valutazione e regole.\n' +
      '  Copiare qui il seme del progetto (per la fabbrica: kit/esempio/seme-esoterismo.json).'
  );
  process.exit(1);
}
const semeProgetto = JSON.parse(readFileSync(SEME_PROGETTO, 'utf8'));

/* ── voci e parti: dal contenuto reale ────────────────────────────────── */

const dirVoci = join(RADICE, 'src/content/voci');
const frontmatter = readdirSync(dirVoci)
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map((f) => matter(readFileSync(join(dirVoci, f), 'utf8')).data);

const parti = frontmatter
  .filter((v) => v.tipo === 'parte')
  .sort((a, b) => a.parte - b.parte)
  .map((v) => ({ numero: v.parte, id: v.id, titolo: v.titolo, sommario: v.sommario }));

const voci = frontmatter
  .filter((v) => v.tipo !== 'parte')
  .map((v) => ({
    id: v.id,
    titolo: v.titolo,
    tipo: v.tipo,
    parte: v.parte,
    peso: v.peso,
    sommario: v.sommario,
    ...(v.periodo ? { periodo: v.periodo } : {}),
    ...(v.alias?.length ? { alias: v.alias } : {}),
    ...(v.luoghi?.length ? { luoghi: v.luoghi } : {}),
    archi: (v.archi ?? []).map((a: { verso: string; tipo: string; nota?: string }) => ({
      verso: a.verso,
      tipo: a.tipo,
      ...(a.nota ? { nota: a.nota } : {}),
    })),
    fonti: v.fonti ?? [],
  }));

/* ── percorsi: dal contenuto reale ────────────────────────────────────── */

const dirPercorsi = join(RADICE, 'src/content/percorsi');
const percorsi = readdirSync(dirPercorsi)
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map((f) => matter(readFileSync(join(dirPercorsi, f), 'utf8')).data)
  .sort((a, b) => a.ordine - b.ordine)
  .map((p) => ({
    slug: p.slug,
    titolo: p.titolo,
    sottotitolo: p.sottotitolo,
    ordine: p.ordine,
    tappe: p.tappe.map((t: { voce: string; testo: string }) => ({
      voce: t.voce,
      traccia: t.testo,
    })),
  }));

/* ── diagrammi (pagine su misura, facoltative) ────────────────────────── */

const dirDiagrammi = join(RADICE, 'src/pages/diagrammi');
const diagrammi = readdirSync(dirDiagrammi)
  .filter((f) => f.endsWith('.astro') && f !== 'index.astro')
  .sort()
  .map((f) => {
    const sorgente = readFileSync(join(dirDiagrammi, f), 'utf8');
    const titolo = sorgente.match(/titolo="([^"]+)"/)?.[1] ?? f.replace('.astro', '');
    return { slug: f.replace('.astro', ''), titolo };
  });

/* ── seme completo ────────────────────────────────────────────────────── */

const seme = {
  formato: semeProgetto.formato,
  progetto: semeProgetto.progetto,
  valutazione: semeProgetto.valutazione,
  tassonomia: semeProgetto.tassonomia,
  parti,
  regole: semeProgetto.regole,
  voci,
  percorsi,
  diagrammi,
};

const json = JSON.stringify(seme, null, 2) + '\n';

/* ── ponte contenuto↔codegen: le parti devono coincidere ──────────────── */

const partiSeme = JSON.stringify(semeProgetto.parti, null, 2);
const partiContenuto = JSON.stringify(parti, null, 2);
if (partiSeme !== partiContenuto) {
  console.error(
    '✗ le `parti` di kit/seme.json non coincidono con le parti reali del contenuto:\n' +
      '  il codegen (N_PARTI, nomi, palette) leggerebbe una struttura diversa dal sito.\n' +
      '  Allineare kit/seme.json alle voci di tipo "parte" (o viceversa).'
  );
  process.exit(1);
}

if (process.argv.includes('--verifica')) {
  if (!existsSync(USCITA)) {
    console.error('✗ kit/esempio/seme-esoterismo.json non esiste: eseguire `npm run seme:estrai`');
    process.exit(1);
  }
  if (readFileSync(USCITA, 'utf8') !== json) {
    console.error(
      '✗ il seme di esempio non è allineato al contenuto del sito (o a kit/seme.json): ' +
        'eseguire `npm run seme:estrai` e committare'
    );
    process.exit(1);
  }
  console.log('✓ seme di esempio allineato al contenuto del sito e a kit/seme.json');
} else {
  mkdirSync(dirname(USCITA), { recursive: true });
  writeFileSync(USCITA, json);
  console.log(
    `✓ seme estratto: ${voci.length} voci, ${parti.length} parti, ${percorsi.length} percorsi, ${diagrammi.length} diagrammi → kit/esempio/seme-esoterismo.json`
  );
}
