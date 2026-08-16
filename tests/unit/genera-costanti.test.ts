import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  derivaCostanti,
  emettiCss,
  emettiModulo,
  nomeBreveParte,
  romano,
  titoloSenzaNumerale,
} from '../../scripts/genera-costanti';

/**
 * Il codegen è il ponte seme→motore: qui lo si esegue su DUE semi reali.
 * - kit/seme.json (il riferimento): l'uscita deve coincidere con i valori
 *   storici delle costanti scritte a mano — è il criterio di equivalenza
 *   della migrazione, fissato per sempre in CI;
 * - kit/semi/seme-informatica.json (tassonomia diversa): l'uscita attesa
 *   dimostra che il codegen è davvero guidato dal seme, comprese le
 *   derivazioni non letterali (numero romano nel nome della parte, nome
 *   breve dall'id con recupero degli accenti dal titolo).
 */
const RADICE = join(__dirname, '../..');
const leggiSeme = (percorso: string) => JSON.parse(readFileSync(join(RADICE, percorso), 'utf8'));

const semeProgetto = leggiSeme('kit/seme.json');
// nella fabbrica kit/seme.json È il seme di riferimento e l'equivalenza
// storica va garantita in CI; in un'istanza il seme è un altro per
// definizione e il caso si disattiva da sé (resta quello sull'informatica)
const eIlRiferimento = semeProgetto?.progetto?.nome === 'Correspondentia Theatri';

describe('il seme del progetto (kit/seme.json) è utilizzabile dal codegen', () => {
  it('deriva costanti coerenti col contratto del motore', () => {
    const c = derivaCostanti(semeProgetto);
    expect(c.tipiNodo[0]).toBe('parte');
    expect(c.tipiNodo.length).toBeGreaterThanOrEqual(4);
    expect(c.tipiArco.length).toBeGreaterThanOrEqual(4);
    expect(c.archiDerivati.length).toBeGreaterThanOrEqual(1);
    expect(c.nParti).toBeGreaterThanOrEqual(2);
    expect(Object.keys(c.nomiParte)).toHaveLength(c.nParti);
    expect(Object.keys(c.nomiParteBrevi)).toHaveLength(c.nParti);
  });
});

describe.runIf(eIlRiferimento)('codegen sul seme di riferimento (kit/seme.json)', () => {
  const c = derivaCostanti(semeProgetto);

  it('riproduce le costanti storiche del motore, valore per valore', () => {
    expect(c.tipiNodo).toEqual([
      'parte',
      'corrente',
      'concetto',
      'pratica',
      'simbolo',
      'persona',
      'opera',
      'evento',
      'luogo',
    ]);
    expect(c.tipiArco).toEqual([
      'influenza',
      'deriva_da',
      'si_oppone_a',
      'usa_simbolo',
      'pratica',
      'elabora',
      'rilegge',
      'contiene',
      'contemporaneo_di',
      'attribuzione_infondata',
    ]);
    expect(c.etichetteTipoNodo).toEqual({
      parte: 'Parte',
      corrente: 'Corrente',
      concetto: 'Concetto',
      pratica: 'Pratica',
      simbolo: 'Simbolo',
      persona: 'Persona',
      opera: 'Opera',
      evento: 'Evento',
      luogo: 'Luogo',
    });
    expect(c.etichetteTipoArco).toEqual({
      influenza: 'influenza',
      deriva_da: 'deriva da',
      si_oppone_a: 'si oppone a',
      usa_simbolo: 'usa il simbolo',
      pratica: 'pratica',
      elabora: 'elabora',
      rilegge: 'rilegge',
      contiene: 'contiene',
      contemporaneo_di: 'contemporaneo di',
      attribuzione_infondata: 'attribuzione infondata',
    });
    expect(c.archiDerivati).toEqual(['contiene']);
    expect(c.tipiLeggendari).toEqual(['attribuzione_infondata']);
    expect(c.nParti).toBe(6);
    expect(c.nomiParte).toEqual({
      1: 'I · Definizione ed epistemologia',
      2: 'II · Correnti storiche',
      3: 'III · Concetti strutturali',
      4: 'IV · Pratiche e vie',
      5: 'V · Linguaggio simbolico',
      6: 'VI · Ricezioni moderne',
    });
    expect(c.nomiParteBrevi).toEqual({
      1: 'Definizione',
      2: 'Correnti',
      3: 'Concetti',
      4: 'Pratiche',
      5: 'Simboli',
      6: 'Ricezioni',
    });
  });

  it('emette un modulo con tipi statici e le variabili CSS delle sei parti', () => {
    const modulo = emettiModulo(c);
    expect(modulo).toContain('] as const;');
    expect(modulo).toContain('export type TipoNodo = (typeof TIPI_NODO)[number];');
    expect(modulo).toContain('as const satisfies readonly TipoArco[];');
    expect(modulo).toContain('export const N_PARTI = 6;');
    const css = emettiCss(c);
    expect(css).toContain('--parte-6: #8b86af;');
    expect(css).toContain('--parte-6: #9d99c0;');
    // stringa composta: se fosse scritta per esteso, lo scanner dei sorgenti
    // di Tailwind la prenderebbe per un uso reale del token e lo emetterebbe
    expect(css).toContain(['--color', 'parte-6: var(--parte-6);'].join('-'));
    expect(css).not.toContain('--parte-7');
  });
});

describe('codegen su una tassonomia diversa (kit/semi/seme-informatica.json)', () => {
  const c = derivaCostanti(leggiSeme('kit/semi/seme-informatica.json'));

  it('deriva tipi ed etichette dal seme, con "parte" strutturale in testa', () => {
    expect(c.tipiNodo).toEqual([
      'parte',
      'area',
      'concetto',
      'algoritmo',
      'linguaggio',
      'sistema',
      'persona',
      'opera',
      'evento',
      'luogo',
    ]);
    expect(c.tipiArco).toEqual([
      'influenza',
      'deriva_da',
      'si_oppone_a',
      'elabora',
      'implementa',
      'formalizza',
      'contemporaneo_di',
      'contiene',
      'attribuzione_infondata',
    ]);
    expect(c.etichetteTipoNodo.area).toBe('Area');
    expect(c.etichetteTipoArco.implementa).toBe('implementa');
    expect(c.archiDerivati).toEqual(['contiene']);
    expect(c.tipiLeggendari).toEqual(['attribuzione_infondata']);
  });

  it('deriva i nomi delle parti: numerale romano e nome breve accentato', () => {
    expect(c.nParti).toBe(6);
    expect(c.nomiParte).toEqual({
      1: 'I · Fondamenti',
      2: 'II · Macchine',
      3: 'III · Linguaggi e astrazioni',
      4: 'IV · Algoritmi e complessità',
      5: 'V · Sistemi e reti',
      6: 'VI · Intelligenza e società',
    });
    // "parte-6-intelligenza-e-societa" (id ascii) recupera l'accento dal titolo
    expect(c.nomiParteBrevi).toEqual({
      1: 'Fondamenti',
      2: 'Macchine',
      3: 'Linguaggi',
      4: 'Algoritmi',
      5: 'Sistemi e reti',
      6: 'Intelligenza e società',
    });
  });
});

describe('prerequisiti del motore: il codegen si ferma con errori chiari', () => {
  const base = () => leggiSeme('kit/semi/seme-informatica.json');

  it('rifiuta un seme senza archi derivati (il contenimento ne ha bisogno)', () => {
    const seme = base();
    seme.tassonomia.archiDerivati = [];
    expect(() => derivaCostanti(seme)).toThrowError(/archiDerivati/);
  });

  it('rifiuta "parte" dichiarato fra i tipi di nodo', () => {
    const seme = base();
    seme.tassonomia.tipiNodo.push({ id: 'parte', etichetta: 'Parte' });
    expect(() => derivaCostanti(seme)).toThrowError(/strutturale/);
  });

  it('rifiuta più parti di quante la palette pre-validata ne copra', () => {
    const seme = base();
    for (let n = 7; n <= 9; n++) {
      seme.parti.push({ numero: n, id: `parte-${n}-extra`, titolo: `Extra ${n}`, sommario: 'Sommario della parte extra di prova.' });
    }
    expect(() => derivaCostanti(seme)).toThrowError(/palette/);
  });

  it('rifiuta parti non numerate consecutivamente da 1', () => {
    const seme = base();
    seme.parti[1].numero = 5;
    expect(() => derivaCostanti(seme)).toThrowError(/consecutivi/);
  });
});

describe('derivazioni elementari', () => {
  it('numeri romani', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(romano)).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']);
  });

  it('numerale iniziale tolto solo con separatore di punteggiatura', () => {
    expect(titoloSenzaNumerale('I. Definizione ed epistemologia')).toBe('Definizione ed epistemologia');
    expect(titoloSenzaNumerale('IV · Pratiche e vie')).toBe('Pratiche e vie');
    expect(titoloSenzaNumerale('2) Macchine')).toBe('Macchine');
    expect(titoloSenzaNumerale('Fondamenti')).toBe('Fondamenti');
    // "I" qui è un articolo, non un numerale: resta al suo posto
    expect(titoloSenzaNumerale('I linguaggi della macchina')).toBe('I linguaggi della macchina');
  });

  it('nome breve dalla coda dell\'id, con accenti dal titolo', () => {
    expect(
      nomeBreveParte({ numero: 6, id: 'parte-6-intelligenza-e-societa', titolo: 'Intelligenza e società', sommario: 'Sommario.' })
    ).toBe('Intelligenza e società');
    expect(
      nomeBreveParte({ numero: 5, id: 'parte-5-simboli', titolo: 'V. Linguaggio simbolico', sommario: 'Sommario.' })
    ).toBe('Simboli');
    // id senza coda propria: ripiega sul titolo senza numerale
    expect(nomeBreveParte({ numero: 2, id: 'parte-2', titolo: 'II. Correnti storiche', sommario: 'Sommario.' })).toBe(
      'Correnti storiche'
    );
  });
});
