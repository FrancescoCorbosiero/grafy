/**
 * Palette del motore (§7 del BRIEF).
 *
 * I colori delle parti vengono dai set pre-validati di palette-parti.ts
 * (4–8 parti, tema chiaro e scuro), scelti in base a N_PARTI del seme.
 * La distinguibilità non è garantita "a occhio" ma da
 * tests/unit/palette-deuteranopia.test.ts, che simula la visione deutan
 * (matrici di Machado et al. 2009) e impone una distanza percettiva minima
 * su ogni set. I colori degli archi sono assegnati per posizione ai tipi
 * del seme, con tinte dedicate agli archi derivati e leggendari.
 */
import { N_PARTI, TIPI_ARCO, arcoDerivato, arcoLeggendario } from './costanti';
import { coloriPerParti } from './palette-parti';

export { NOMI_PARTE, NOMI_PARTE_BREVI } from './costanti';
export { PALETTE_PARTI, SFONDO_SCURO, coloriPerParti } from './palette-parti';

export const COLORI_BASE = {
  pergamena: '#F7F4EE',
  inchiostro: '#1A1A2E',
  porpora: '#6B2D5C',
  oro: '#8A6A2F',
} as const;

const SET_PARTI = coloriPerParti(N_PARTI);

/** Colore di cluster per parte (1..N_PARTI), tema chiaro. */
export const COLORI_PARTE: Record<number, string> = Object.fromEntries(
  SET_PARTI.chiaro.map((colore, i) => [i + 1, colore])
);

/** Colore di cluster per parte (1..N_PARTI), tema scuro (variabili CSS generate). */
export const COLORI_PARTE_SCURO: Record<number, string> = Object.fromEntries(
  SET_PARTI.scuro.map((colore, i) => [i + 1, colore])
);

/**
 * Colori degli archi per tipo (tema chiaro): i tipi documentati pescano in
 * ordine dal ciclo di tinte; i derivati e i leggendari hanno tinte proprie
 * (tratteggio leggendario compreso). Con più di otto tipi documentati il
 * ciclo ricomincia.
 */
const CICLO_COLORI_ARCO = [
  '#7A7466',
  '#5B7A99',
  '#A04A3C',
  '#3E7A74',
  '#B08A3E',
  '#6B2D5C',
  '#6E6A8F',
  '#B9B2A0',
] as const;

export const COLORE_ARCO_DERIVATO = '#C9C2B2';
export const COLORE_ARCO_LEGGENDARIO = '#B3475F';

export const COLORI_ARCO: Record<string, string> = (() => {
  const colori: Record<string, string> = {};
  let posizione = 0;
  for (const tipo of TIPI_ARCO) {
    if (arcoDerivato(tipo)) colori[tipo] = COLORE_ARCO_DERIVATO;
    else if (arcoLeggendario(tipo)) colori[tipo] = COLORE_ARCO_LEGGENDARIO;
    else colori[tipo] = CICLO_COLORI_ARCO[posizione++ % CICLO_COLORI_ARCO.length]!;
  }
  return colori;
})();

/** Il colore d'arco per tipo, con ripiego sicuro per tipi fuori tassonomia. */
export function coloreArco(tipo: string): string {
  return COLORI_ARCO[tipo] ?? (arcoLeggendario(tipo) ? COLORE_ARCO_LEGGENDARIO : CICLO_COLORI_ARCO[0]);
}

/** Conversioni colore minime (senza dipendenze). */
export function hexARgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function srgbALineare(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function lineareASrgb(v: number): number {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

/**
 * Simulazione di deuteranopia (severità 1.0), matrice di Machado, Oliveira
 * e Fernandes 2009, applicata in RGB lineare.
 */
export function simulaDeuteranopia(hex: string): [number, number, number] {
  const [r8, g8, b8] = hexARgb(hex);
  const r = srgbALineare(r8);
  const g = srgbALineare(g8);
  const b = srgbALineare(b8);
  const M = [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ];
  const r2 = M[0]![0]! * r + M[0]![1]! * g + M[0]![2]! * b;
  const g2 = M[1]![0]! * r + M[1]![1]! * g + M[1]![2]! * b;
  const b2 = M[2]![0]! * r + M[2]![1]! * g + M[2]![2]! * b;
  return [lineareASrgb(r2), lineareASrgb(g2), lineareASrgb(b2)];
}

/** RGB (0-255) → CIELAB, bianco D65. */
export function rgbALab([r8, g8, b8]: [number, number, number]): [number, number, number] {
  const r = srgbALineare(r8);
  const g = srgbALineare(g8);
  const b = srgbALineare(b8);
  let x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  let y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  let z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x);
  y = f(y);
  z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** Distanza percettiva CIE76 (sufficiente per un vincolo di soglia). */
export function deltaE(hexA: string, hexB: string): number {
  const [l1, a1, b1] = rgbALab(hexARgb(hexA));
  const [l2, a2, b2] = rgbALab(hexARgb(hexB));
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

export function rgbAHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => v.toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
