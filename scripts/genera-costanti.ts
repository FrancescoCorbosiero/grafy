/**
 * Codegen della tassonomia: da kit/seme.json a src/generated/costanti.ts
 * e src/generated/parti.css. È il PRIMO passo di `npm run data`: tutto il
 * resto del motore (schema Zod, pipeline, viste, palette) legge i tipi di
 * nodo e di arco, le etichette, gli archi derivati e leggendari e le parti
 * dal modulo generato, via il sottile re-export src/lib/costanti.ts.
 *
 * Il seme è la fonte di verità della tassonomia: per adattare il motore a
 * un altro argomento basta sostituire kit/seme.json ed eseguire `npm run
 * data` — nessuna modifica a mano del codice.
 *
 * Derivazioni non presenti alla lettera nel seme (documentate anche nel
 * test tests/unit/genera-costanti.test.ts):
 * - NOMI_PARTE: "<numero romano> · <titolo senza l'eventuale numerale
 *   iniziale>" (es. "I. Definizione ed epistemologia" → "I · Definizione
 *   ed epistemologia", "Fondamenti" → "I · Fondamenti");
 * - NOMI_PARTE_BREVI: dalle parole dell'id dopo il prefisso "parte-N-"
 *   (es. "parte-5-simboli" → "Simboli"), recuperando le forme accentate
 *   dal titolo/sommario della parte ("societa" → "società");
 * - i colori delle parti vengono dai set pre-validati di
 *   src/lib/palette-parti.ts, scelti in base al numero di parti.
 *
 * Uso: tsx scripts/genera-costanti.ts  (oppure `npm run data`)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { N_PARTI_MAX, coloriPerParti } from '../src/lib/palette-parti';

const RADICE = resolve(import.meta.dirname ?? '.', '..');
const SEME = join(RADICE, 'kit/seme.json');
const DIR_GENERATI = join(RADICE, 'src/generated');

interface VoceTassonomia {
  id: string;
  etichetta: string;
  descrizione?: string;
}

interface ParteSeme {
  numero: number;
  id: string;
  titolo: string;
  sommario: string;
}

/** Le costanti derivate dal seme, pronte per l'emissione. */
export interface CostantiGenerate {
  tipiNodo: string[];
  tipiArco: string[];
  etichetteTipoNodo: Record<string, string>;
  etichetteTipoArco: Record<string, string>;
  archiDerivati: string[];
  tipiLeggendari: string[];
  nParti: number;
  nomiParte: Record<number, string>;
  nomiParteBrevi: Record<number, string>;
}

/** Numero romano (basta fino a N_PARTI_MAX, ma la conversione è generale). */
export function romano(n: number): string {
  const tavola: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let resto = n;
  let uscita = '';
  for (const [valore, cifra] of tavola) {
    while (resto >= valore) {
      uscita += cifra;
      resto -= valore;
    }
  }
  return uscita;
}

const senzaAccenti = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Toglie dal titolo un eventuale numerale iniziale ("I.", "IV ·", "2)"):
 * serve un separatore di punteggiatura, così "I linguaggi" (articolo)
 * resta intatto.
 */
export function titoloSenzaNumerale(titolo: string): string {
  return titolo.replace(/^\s*(?:[IVXLCDM]+|\d+)\s*[.·:)\-–—]\s*/, '').trim() || titolo.trim();
}

/**
 * Nome breve della parte dalle parole dell'id (dopo "parte-N-"), con le
 * forme accentate recuperate dal titolo o dal sommario (gli id sono ascii).
 * Se l'id non ha parole proprie, ripiega sul titolo senza numerale.
 */
export function nomeBreveParte(parte: ParteSeme): string {
  const slug = parte.id.replace(new RegExp(`^parte-${parte.numero}-`), '');
  if (slug === parte.id || slug.length === 0) return titoloSenzaNumerale(parte.titolo);
  const accentate = new Map<string, string>();
  for (const parola of `${parte.titolo} ${parte.sommario}`.split(/[^\p{L}]+/u)) {
    if (parola) {
      const chiave = senzaAccenti(parola);
      if (!accentate.has(chiave)) accentate.set(chiave, parola.toLowerCase());
    }
  }
  const parole = slug.split('-').map((p) => accentate.get(p) ?? p);
  const testo = parole.join(' ');
  return testo.charAt(0).toUpperCase() + testo.slice(1);
}

/**
 * Deriva le costanti dal seme. Rilancia con un elenco di problemi se il
 * seme non soddisfa i prerequisiti del motore (controlli minimi: il
 * validatore completo resta kit/valida-seme.ts).
 */
export function derivaCostanti(seme: any): CostantiGenerate {
  const problemi: string[] = [];
  if (seme?.formato !== 'correspondentia-seme@1') {
    problemi.push(`formato: atteso "correspondentia-seme@1", trovato ${JSON.stringify(seme?.formato)}`);
  }

  const tipiNodoSeme: VoceTassonomia[] = seme?.tassonomia?.tipiNodo ?? [];
  const tipiArcoSeme: VoceTassonomia[] = seme?.tassonomia?.tipiArco ?? [];
  const archiDerivati: string[] = seme?.tassonomia?.archiDerivati ?? [];
  const doppioRegistro = seme?.tassonomia?.doppioRegistro ?? { attivo: false };
  const tipiLeggendari: string[] = doppioRegistro.attivo ? (doppioRegistro.tipiLeggendari ?? []) : [];
  const parti: ParteSeme[] = seme?.parti ?? [];

  if (tipiNodoSeme.length === 0) problemi.push('tassonomia.tipiNodo: vuoto');
  if (tipiArcoSeme.length === 0) problemi.push('tassonomia.tipiArco: vuoto');
  for (const lista of [tipiNodoSeme, tipiArcoSeme]) {
    const visti = new Set<string>();
    for (const t of lista) {
      if (!t?.id || !t?.etichetta) problemi.push(`tassonomia: tipo senza id o etichetta (${JSON.stringify(t)})`);
      else if (visti.has(t.id)) problemi.push(`tassonomia: id "${t.id}" duplicato`);
      visti.add(t?.id);
    }
  }
  if (tipiNodoSeme.some((t) => t.id === 'parte')) {
    problemi.push('tassonomia.tipiNodo: "parte" è strutturale, il motore lo aggiunge da sé');
  }
  const idArchi = new Set(tipiArcoSeme.map((t) => t.id));
  for (const t of archiDerivati) {
    if (!idArchi.has(t)) problemi.push(`tassonomia.archiDerivati: "${t}" non è fra i tipiArco`);
  }
  for (const t of tipiLeggendari) {
    if (!idArchi.has(t)) problemi.push(`doppioRegistro.tipiLeggendari: "${t}" non è fra i tipiArco`);
  }
  if (archiDerivati.length === 0) {
    problemi.push(
      'tassonomia.archiDerivati: vuoto — il motore deriva gli archi di contenimento parte→voce ' +
        'e usa il primo tipo dichiarato qui (es. "contiene")'
    );
  }
  parti.forEach((p, i) => {
    if (p?.numero !== i + 1) problemi.push(`parti[${i}]: numeri non consecutivi da 1 (trovato ${p?.numero})`);
    if (!p?.id || !p?.titolo || !p?.sommario) problemi.push(`parti[${i}]: id, titolo o sommario mancante`);
  });
  if (parti.length < 2) problemi.push(`parti: ${parti.length} (minimo 2)`);
  if (parti.length > N_PARTI_MAX) {
    problemi.push(`parti: ${parti.length} — la palette pre-validata arriva a ${N_PARTI_MAX} (src/lib/palette-parti.ts)`);
  }

  if (problemi.length > 0) {
    throw new Error(`seme non utilizzabile per il codegen (${problemi.length} problemi):\n` + problemi.map((p) => `  - ${p}`).join('\n'));
  }

  const nomiParte: Record<number, string> = {};
  const nomiParteBrevi: Record<number, string> = {};
  for (const p of parti) {
    nomiParte[p.numero] = `${romano(p.numero)} · ${titoloSenzaNumerale(p.titolo)}`;
    nomiParteBrevi[p.numero] = nomeBreveParte(p);
  }

  return {
    tipiNodo: ['parte', ...tipiNodoSeme.map((t) => t.id)],
    tipiArco: tipiArcoSeme.map((t) => t.id),
    etichetteTipoNodo: { parte: 'Parte', ...Object.fromEntries(tipiNodoSeme.map((t) => [t.id, t.etichetta])) },
    etichetteTipoArco: Object.fromEntries(tipiArcoSeme.map((t) => [t.id, t.etichetta])),
    archiDerivati,
    tipiLeggendari,
    nParti: parti.length,
    nomiParte,
    nomiParteBrevi,
  };
}

const TESTATA = `/**
 * FILE GENERATO da kit/seme.json — non modificare a mano.
 * Rigenerare con \`npm run data\` (primo passo: scripts/genera-costanti.ts).
 * Il resto del codice importa da src/lib/costanti.ts, che ri-esporta da qui.
 */`;

const lista = (valori: string[]) => valori.map((v) => `  ${JSON.stringify(v)},`).join('\n');
const record = (voci: Record<string | number, string>) =>
  Object.entries(voci)
    .map(([k, v]) => `  ${/^[a-z_][a-z0-9_]*$/i.test(k) ? k : JSON.stringify(Number.isNaN(Number(k)) ? k : Number(k))}: ${JSON.stringify(v)},`)
    .join('\n');

/** Emette il modulo TypeScript delle costanti (tipi statici: as const + derivati). */
export function emettiModulo(c: CostantiGenerate): string {
  return `${TESTATA}

export const TIPI_NODO = [
${lista(c.tipiNodo)}
] as const;

export type TipoNodo = (typeof TIPI_NODO)[number];

export const TIPI_ARCO = [
${lista(c.tipiArco)}
] as const;

export type TipoArco = (typeof TIPI_ARCO)[number];

export const ETICHETTE_TIPO_NODO: Record<TipoNodo, string> = {
${record(c.etichetteTipoNodo)}
};

export const ETICHETTE_TIPO_ARCO: Record<TipoArco, string> = {
${record(c.etichetteTipoArco)}
};

/** Tipi di arco derivati dalla pipeline: mai dichiarati a mano nelle voci. */
export const ARCHI_DERIVATI = [
${lista(c.archiDerivati)}
] as const satisfies readonly TipoArco[];

/** Tipi di arco del registro leggendario: spenti di default, nota obbligatoria. */
export const TIPI_LEGGENDARI = [
${lista(c.tipiLeggendari)}
] as const satisfies readonly TipoArco[];

/** Numero di parti del progetto (dalle \`parti\` del seme). */
export const N_PARTI = ${c.nParti};

export const NOMI_PARTE: Record<number, string> = {
${record(c.nomiParte)}
};

export const NOMI_PARTE_BREVI: Record<number, string> = {
${record(c.nomiParteBrevi)}
};
`;
}

/** Emette le variabili CSS delle parti (tema chiaro e scuro + token Tailwind). */
export function emettiCss(c: CostantiGenerate): string {
  const { chiaro, scuro } = coloriPerParti(c.nParti);
  const variabili = (colori: readonly string[]) =>
    colori.map((colore, i) => `  --parte-${i + 1}: ${colore.toLowerCase()};`).join('\n');
  const token = chiaro.map((_, i) => `  --color-parte-${i + 1}: var(--parte-${i + 1});`).join('\n');
  return `/*
 * FILE GENERATO da kit/seme.json — non modificare a mano.
 * Colori delle ${c.nParti} parti, dai set pre-validati di src/lib/palette-parti.ts
 * (giudice: tests/unit/palette-deuteranopia.test.ts).
 * Rigenerare con \`npm run data\` (scripts/genera-costanti.ts).
 */
:root {
${variabili(chiaro)}
}

[data-theme='dark'] {
${variabili(scuro)}
}

@theme inline {
${token}
}
`;
}

const eseguitoDirettamente = process.argv[1] && resolve(process.argv[1]).includes('genera-costanti');
if (eseguitoDirettamente) {
  let seme: unknown;
  try {
    seme = JSON.parse(readFileSync(SEME, 'utf-8'));
  } catch (errore) {
    console.error(
      `✗ impossibile leggere ${SEME}: ${(errore as Error).message}\n` +
        '  kit/seme.json è la fonte della tassonomia: copiare qui il seme del progetto ' +
        '(per la fabbrica, il seme di riferimento kit/esempio/seme-esoterismo.json).'
    );
    process.exit(1);
  }
  try {
    const costanti = derivaCostanti(seme);
    mkdirSync(DIR_GENERATI, { recursive: true });
    writeFileSync(join(DIR_GENERATI, 'costanti.ts'), emettiModulo(costanti));
    writeFileSync(join(DIR_GENERATI, 'parti.css'), emettiCss(costanti));
    console.log(
      `✓ costanti generate da kit/seme.json: ${costanti.tipiNodo.length} tipi di nodo (con "parte"), ` +
        `${costanti.tipiArco.length} tipi di arco, ${costanti.nParti} parti → src/generated/costanti.ts, src/generated/parti.css`
    );
  } catch (errore) {
    console.error(`✗ ${(errore as Error).message}`);
    process.exit(1);
  }
}
