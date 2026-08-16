import { describe, expect, it } from 'vitest';
import {
  COLORI_BASE,
  COLORI_PARTE,
  COLORI_PARTE_SCURO,
  PALETTE_PARTI,
  SFONDO_SCURO,
  coloriPerParti,
  deltaE,
  rgbAHex,
  simulaDeuteranopia,
} from '../../src/lib/palette';
import { N_PARTI } from '../../src/lib/costanti';

/**
 * §7 del BRIEF: «tinte desaturate distinguibili anche in deuteranopia —
 * verificare con un simulatore, non a occhio». Questo test È il simulatore:
 * proietta i colori di parte nello spazio visivo deutan (matrice di Machado
 * et al. 2009, severità 1.0) e impone una distanza percettiva minima. Da
 * quando la palette è parametrica (kit/seme.json → N_PARTI), il giudizio
 * copre OGNI set pre-validato di palette-parti.ts (4–8 parti), non solo
 * quello in uso.
 *
 * Contratto per set (soglie storiche, da non abbassare):
 * - tema CHIARO: ogni coppia ΔE ≥ 20 in visione tipica e ≥ 12 in deutan;
 *   ogni tinta ΔE ≥ 30 dalla pergamena di fondo;
 * - tema SCURO: ogni tinta ΔE ≥ 30 dallo sfondo scuro. I sei colori scuri
 *   storici dell'istanza di riferimento NON rispettano tutti la soglia
 *   deutan fra loro (coppia peggiore ΔE ≈ 5) e restano immutati per non
 *   alterare l'aspetto delle istanze esistenti; le tinte scure AGGIUNTE
 *   (7ª e 8ª) devono invece rispettare l'intero contratto contro tutte.
 * - ogni set è un prefisso del successivo: un progetto che cresce di una
 *   parte non ricolora le esistenti.
 */
const SOGLIA_TIPICA = 20;
const SOGLIA_DEUTAN = 12;
const SOGLIA_SFONDO = 30;
const SCURI_STORICI = 6;

const deutan = (hex: string) => rgbAHex(simulaDeuteranopia(hex));
const coppie = (n: number): Array<[number, number]> => {
  const c: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) c.push([i, j]);
  return c;
};

const taglie = Object.keys(PALETTE_PARTI)
  .map(Number)
  .sort((a, b) => a - b);

describe.each(taglie)('palette per %i parti', (taglia) => {
  const { chiaro, scuro } = PALETTE_PARTI[taglia]!;

  it('ha esattamente una tinta per parte, in chiaro e in scuro', () => {
    expect(chiaro).toHaveLength(taglia);
    expect(scuro).toHaveLength(taglia);
  });

  it('è un prefisso del set successivo (crescere non ricolora)', () => {
    const successivo = PALETTE_PARTI[taglia + 1];
    if (!successivo) return;
    expect(successivo.chiaro.slice(0, taglia)).toEqual([...chiaro]);
    expect(successivo.scuro.slice(0, taglia)).toEqual([...scuro]);
  });

  it('chiaro: le tinte sono distinguibili in visione tipica', () => {
    for (const [i, j] of coppie(taglia)) {
      const d = deltaE(chiaro[i]!, chiaro[j]!);
      expect(d, `ΔE(${i + 1},${j + 1}) = ${d.toFixed(1)} troppo bassa`).toBeGreaterThanOrEqual(SOGLIA_TIPICA);
    }
  });

  it('chiaro: le tinte restano distinguibili in deuteranopia simulata', () => {
    for (const [i, j] of coppie(taglia)) {
      const a = deutan(chiaro[i]!);
      const b = deutan(chiaro[j]!);
      const d = deltaE(a, b);
      expect(d, `deutan ΔE(${i + 1},${j + 1}) = ${d.toFixed(1)} troppo bassa (${a} vs ${b})`).toBeGreaterThanOrEqual(
        SOGLIA_DEUTAN
      );
    }
  });

  it('chiaro: ogni tinta contrasta con la pergamena di fondo', () => {
    for (let i = 0; i < taglia; i++) {
      const d = deltaE(chiaro[i]!, COLORI_BASE.pergamena);
      expect(d, `parte ${i + 1} troppo vicina al fondo`).toBeGreaterThanOrEqual(SOGLIA_SFONDO);
    }
  });

  it('scuro: ogni tinta contrasta con lo sfondo scuro', () => {
    for (let i = 0; i < taglia; i++) {
      const d = deltaE(scuro[i]!, SFONDO_SCURO);
      expect(d, `parte ${i + 1} troppo vicina allo sfondo scuro`).toBeGreaterThanOrEqual(SOGLIA_SFONDO);
    }
  });

  it('scuro: le tinte aggiunte oltre le sei storiche rispettano l\'intero contratto', () => {
    for (const [i, j] of coppie(taglia)) {
      if (j < SCURI_STORICI) continue; // le coppie interamente storiche restano fuori giudizio (vedi intestazione)
      const dTipica = deltaE(scuro[i]!, scuro[j]!);
      const dDeutan = deltaE(deutan(scuro[i]!), deutan(scuro[j]!));
      expect(dTipica, `scuro ΔE(${i + 1},${j + 1}) = ${dTipica.toFixed(1)}`).toBeGreaterThanOrEqual(SOGLIA_TIPICA);
      expect(dDeutan, `scuro deutan ΔE(${i + 1},${j + 1}) = ${dDeutan.toFixed(1)}`).toBeGreaterThanOrEqual(
        SOGLIA_DEUTAN
      );
    }
  });
});

describe('palette in uso (N_PARTI del seme)', () => {
  it('COLORI_PARTE e COLORI_PARTE_SCURO coincidono con il set scelto da N_PARTI', () => {
    const { chiaro, scuro } = coloriPerParti(N_PARTI);
    expect(Object.keys(COLORI_PARTE)).toHaveLength(N_PARTI);
    chiaro.forEach((colore, i) => expect(COLORI_PARTE[i + 1]).toBe(colore));
    scuro.forEach((colore, i) => expect(COLORI_PARTE_SCURO[i + 1]).toBe(colore));
  });
});
