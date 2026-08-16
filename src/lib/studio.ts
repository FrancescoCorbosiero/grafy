/**
 * Studio: il registro locale dell'apprendimento. Il sito è statico, quindi
 * tutto vive nel browser (localStorage): niente server, niente profili.
 * Il registro è condiviso fra le tab dello stesso browser e la pagina
 * /studio lo consulta in forma aggregata.
 *
 * Che cosa si registra:
 * - per ogni VOCE: consultazioni (quante, quando), lettura fino in fondo,
 *   e il giudizio di autovalutazione («assimilata» / «da ripassare») — il
 *   risultato dell'apprendimento è un atto dell'utente, non una metrica;
 * - per ogni PERCORSO: l'ultima tappa raggiunta sul totale;
 * - per i CAPITOLI del volume resta la chiave storica `correspondentia-letti`
 *   (capitoli aperti), che qui viene solo letta e azzerata.
 *
 * La chiave è namespaced sulla base del sito: su *.github.io lo storage è
 * per origine e più istanze Correspondentia non devono mescolarsi.
 * Le funzioni di aggregazione in fondo sono pure (testabili senza DOM).
 */

export type GiudizioVoce = 'assimilata' | 'da-ripassare';

export interface StatoVoceStudio {
  /** prima e ultima consultazione (ms epoch) */
  prima: number;
  ultima: number;
  visite: number;
  /** il corpo è stato fatto scorrere fino in fondo almeno una volta */
  letta?: boolean;
  giudizio?: GiudizioVoce;
}

export interface StatoPercorsoStudio {
  /** ultima tappa raggiunta (1-based) sul totale */
  tappa: number;
  totale: number;
  ultima: number;
}

export interface StatoStudio {
  versione: 1;
  voci: Record<string, StatoVoceStudio>;
  percorsi: Record<string, StatoPercorsoStudio>;
}

const BASE = typeof import.meta.env !== 'undefined' ? (import.meta.env.BASE_URL ?? '/') : '/';
export const CHIAVE_STUDIO = `correspondentia-studio:${BASE}`;
/** La chiave storica della progressione di lettura del volume (capitoli aperti). */
export const CHIAVE_CAPITOLI = 'correspondentia-letti';
const EVENTO_STUDIO = 'correspondentia-studio-aggiornato';

const vuoto = (): StatoStudio => ({ versione: 1, voci: {}, percorsi: {} });

const memoriaDisponibile = (): boolean => {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
};

/** Interpreta in modo difensivo ciò che c'è in memoria (dati corrotti ⇒ stato vuoto). */
export function interpretaStudio(grezzo: string | null): StatoStudio {
  if (!grezzo) return vuoto();
  try {
    const dati = JSON.parse(grezzo);
    if (!dati || dati.versione !== 1 || typeof dati.voci !== 'object' || typeof dati.percorsi !== 'object') {
      return vuoto();
    }
    return { versione: 1, voci: dati.voci ?? {}, percorsi: dati.percorsi ?? {} };
  } catch {
    return vuoto();
  }
}

export function leggiStudio(): StatoStudio {
  if (!memoriaDisponibile()) return vuoto();
  return interpretaStudio(localStorage.getItem(CHIAVE_STUDIO));
}

function salvaStudio(stato: StatoStudio): void {
  if (!memoriaDisponibile()) return;
  try {
    localStorage.setItem(CHIAVE_STUDIO, JSON.stringify(stato));
    // l'evento `storage` non arriva alla tab che scrive: avvisa questa a mano
    window.dispatchEvent(new Event(EVENTO_STUDIO));
  } catch {
    /* memoria piena o negata: lo studio resta un di più, mai un errore */
  }
}

/** Registra una consultazione della voce (una per apertura di pagina). */
export function registraVisitaVoce(id: string): void {
  const stato = leggiStudio();
  const adesso = Date.now();
  const voce = stato.voci[id];
  stato.voci[id] = voce
    ? { ...voce, ultima: adesso, visite: voce.visite + 1 }
    : { prima: adesso, ultima: adesso, visite: 1 };
  salvaStudio(stato);
}

/** Registra che il corpo della voce è stato fatto scorrere fino in fondo. */
export function segnaVoceLetta(id: string): void {
  const stato = leggiStudio();
  const adesso = Date.now();
  const voce = stato.voci[id] ?? { prima: adesso, ultima: adesso, visite: 1 };
  if (voce.letta) return;
  stato.voci[id] = { ...voce, letta: true };
  salvaStudio(stato);
}

/** Imposta (o toglie, con undefined) il giudizio di autovalutazione. */
export function impostaGiudizioVoce(id: string, giudizio: GiudizioVoce | undefined): void {
  const stato = leggiStudio();
  const adesso = Date.now();
  const voce = stato.voci[id] ?? { prima: adesso, ultima: adesso, visite: 1 };
  if (giudizio) stato.voci[id] = { ...voce, giudizio };
  else {
    const { giudizio: _via, ...resto } = voce;
    stato.voci[id] = resto;
  }
  salvaStudio(stato);
}

/** Registra l'avanzamento in un percorso (solo in avanti). */
export function registraTappaPercorso(slug: string, tappa: number, totale: number): void {
  const stato = leggiStudio();
  const attuale = stato.percorsi[slug];
  if (attuale && attuale.tappa >= tappa && attuale.totale === totale) return;
  stato.percorsi[slug] = {
    tappa: Math.max(tappa, attuale?.tappa ?? 0),
    totale,
    ultima: Date.now(),
  };
  salvaStudio(stato);
}

/** I capitoli del volume aperti finora (chiave storica). */
export function capitoliLetti(): string[] {
  if (!memoriaDisponibile()) return [];
  try {
    const dati = JSON.parse(localStorage.getItem(CHIAVE_CAPITOLI) ?? '[]');
    return Array.isArray(dati) ? dati.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Azzera tutto il registro di studio (voci, percorsi e capitoli). */
export function azzeraStudio(): void {
  if (!memoriaDisponibile()) return;
  try {
    localStorage.removeItem(CHIAVE_STUDIO);
    localStorage.removeItem(CHIAVE_CAPITOLI);
    window.dispatchEvent(new Event(EVENTO_STUDIO));
  } catch {}
}

/**
 * Richiama `cb` quando il registro cambia: nella stessa tab (evento proprio)
 * o in un'altra tab dello stesso browser (evento `storage`). Restituisce la
 * funzione di annullamento.
 */
export function suAggiornamentoStudio(cb: () => void): () => void {
  const daAltraTab = (e: StorageEvent) => {
    if (e.key === null || e.key === CHIAVE_STUDIO || e.key === CHIAVE_CAPITOLI) cb();
  };
  window.addEventListener(EVENTO_STUDIO, cb);
  window.addEventListener('storage', daAltraTab);
  return () => {
    window.removeEventListener(EVENTO_STUDIO, cb);
    window.removeEventListener('storage', daAltraTab);
  };
}

/* ── aggregazione (funzioni pure, testate in tests/unit/studio.test.ts) ── */

/** Il minimo che serve di una voce per aggregare (da ricerca-voci.json). */
export interface VoceStudiabile {
  id: string;
  titolo: string;
  tipo: string;
  parte: number;
  peso: number;
}

export interface CoperturaParte {
  parte: number;
  totale: number;
  consultate: number;
  assimilate: number;
  daRipassare: number;
}

export interface RiassuntoStudio {
  totale: number;
  consultate: number;
  lette: number;
  assimilate: number;
  daRipassare: number;
  perParte: CoperturaParte[];
  perPeso: Array<{ peso: number; totale: number; consultate: number; assimilate: number }>;
}

const studiabili = (voci: VoceStudiabile[]) => voci.filter((v) => v.tipo !== 'parte');

/** Aggrega il registro sul corpus reale delle voci (i nodi "parte" sono strutturali: esclusi). */
export function aggregaStudio(stato: StatoStudio, voci: VoceStudiabile[], numeriParte: readonly number[]): RiassuntoStudio {
  const corpus = studiabili(voci);
  const perParte: CoperturaParte[] = numeriParte.map((parte) => ({
    parte,
    totale: 0,
    consultate: 0,
    assimilate: 0,
    daRipassare: 0,
  }));
  const perParteIndice = new Map(perParte.map((c) => [c.parte, c]));
  const pesi = new Map<number, { peso: number; totale: number; consultate: number; assimilate: number }>();
  let consultate = 0;
  let lette = 0;
  let assimilate = 0;
  let daRipassare = 0;

  for (const voce of corpus) {
    const registro = stato.voci[voce.id];
    const copertura = perParteIndice.get(voce.parte);
    if (copertura) copertura.totale += 1;
    if (!pesi.has(voce.peso)) pesi.set(voce.peso, { peso: voce.peso, totale: 0, consultate: 0, assimilate: 0 });
    const rigaPeso = pesi.get(voce.peso)!;
    rigaPeso.totale += 1;
    if (!registro) continue;
    consultate += 1;
    rigaPeso.consultate += 1;
    if (copertura) copertura.consultate += 1;
    if (registro.letta) lette += 1;
    if (registro.giudizio === 'assimilata') {
      assimilate += 1;
      rigaPeso.assimilate += 1;
      if (copertura) copertura.assimilate += 1;
    }
    if (registro.giudizio === 'da-ripassare') {
      daRipassare += 1;
      if (copertura) copertura.daRipassare += 1;
    }
  }

  return {
    totale: corpus.length,
    consultate,
    lette,
    assimilate,
    daRipassare,
    perParte,
    perPeso: [...pesi.values()].sort((a, b) => b.peso - a.peso),
  };
}

/**
 * Le prossime voci da studiare: mai consultate, ordinate privilegiando le
 * parti già iniziate (per consolidare prima di allargare), poi il peso
 * decrescente (prima il nucleo), poi l'ordine delle parti.
 */
export function prossimeVoci(stato: StatoStudio, voci: VoceStudiabile[], quante = 6): VoceStudiabile[] {
  const partiIniziate = new Set<number>();
  for (const voce of studiabili(voci)) {
    if (stato.voci[voce.id]) partiIniziate.add(voce.parte);
  }
  return studiabili(voci)
    .filter((v) => !stato.voci[v.id])
    .sort((a, b) => {
      const iniziataA = partiIniziate.has(a.parte) ? 0 : 1;
      const iniziataB = partiIniziate.has(b.parte) ? 0 : 1;
      return (
        iniziataA - iniziataB || b.peso - a.peso || a.parte - b.parte || a.titolo.localeCompare(b.titolo, 'it')
      );
    })
    .slice(0, quante);
}

/** Le voci consultate più di recente e non ancora assimilate: da dove riprendere. */
export function riprendiDa(stato: StatoStudio, voci: VoceStudiabile[], quante = 5): VoceStudiabile[] {
  const perId = new Map(studiabili(voci).map((v) => [v.id, v]));
  return Object.entries(stato.voci)
    .filter(([id, registro]) => perId.has(id) && registro.giudizio !== 'assimilata')
    .sort(([, a], [, b]) => b.ultima - a.ultima)
    .slice(0, quante)
    .map(([id]) => perId.get(id)!);
}

/** Le voci con giudizio «da ripassare», nell'ordine del corpus (parte, peso). */
export function vociDaRipassare(stato: StatoStudio, voci: VoceStudiabile[]): VoceStudiabile[] {
  return studiabili(voci)
    .filter((v) => stato.voci[v.id]?.giudizio === 'da-ripassare')
    .sort((a, b) => a.parte - b.parte || b.peso - a.peso || a.titolo.localeCompare(b.titolo, 'it'));
}
