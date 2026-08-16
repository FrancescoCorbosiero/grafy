/**
 * Set pre-validati dei colori di parte, per progetti da 4 a 8 parti,
 * in tema chiaro e scuro. Modulo senza dipendenze: è letto sia dal motore
 * (src/lib/palette.ts) sia dal codegen (scripts/genera-costanti.ts), che
 * gira prima che src/generated/costanti.ts esista.
 *
 * Proprietà dei set, imposte da tests/unit/palette-deuteranopia.test.ts:
 * - ogni set è un prefisso del successivo (un progetto che cresce di una
 *   parte non ricolora le parti esistenti);
 * - tema chiaro: ogni coppia dista ΔE ≥ 20 in visione tipica e ≥ 12 in
 *   deuteranopia simulata (Machado et al. 2009), ogni tinta dista ≥ 30
 *   dalla pergamena di fondo;
 * - tema scuro: ogni tinta dista ≥ 30 dallo sfondo scuro; i sei colori
 *   storici (ereditati dall'istanza di riferimento, mai giudicati dal test)
 *   non rispettano tutti la soglia deutan fra loro, e restano immutati per
 *   non alterare l'aspetto delle istanze esistenti; i colori AGGIUNTI
 *   (7ª e 8ª parte) rispettano l'intera soglia contro tutti gli altri.
 */

export const N_PARTI_MIN = 4;
export const N_PARTI_MAX = 8;

export const PALETTE_PARTI: Record<number, { chiaro: readonly string[]; scuro: readonly string[] }> = {
  4: {
    chiaro: ['#31639C', '#8C3A2E', '#6B2D5C', '#B08A3E'],
    scuro: ['#6F97C6', '#C47764', '#C78BB4', '#CFA95E'],
  },
  5: {
    chiaro: ['#31639C', '#8C3A2E', '#6B2D5C', '#B08A3E', '#3E7A74'],
    scuro: ['#6F97C6', '#C47764', '#C78BB4', '#CFA95E', '#6FB0A8'],
  },
  6: {
    // la palette dell'istanza di riferimento: blu ardesia, ruggine, porpora,
    // oro chiaro, verde-azzurro, grigio-violetto
    chiaro: ['#31639C', '#8C3A2E', '#6B2D5C', '#B08A3E', '#3E7A74', '#8B86AF'],
    scuro: ['#6F97C6', '#C47764', '#C78BB4', '#CFA95E', '#6FB0A8', '#9D99C0'],
  },
  7: {
    // + seppia d'inchiostro / sabbia calda
    chiaro: ['#31639C', '#8C3A2E', '#6B2D5C', '#B08A3E', '#3E7A74', '#8B86AF', '#52423D'],
    scuro: ['#6F97C6', '#C47764', '#C78BB4', '#CFA95E', '#6FB0A8', '#9D99C0', '#CFB9AA'],
  },
  8: {
    // + verde muschio / verde pastello
    chiaro: ['#31639C', '#8C3A2E', '#6B2D5C', '#B08A3E', '#3E7A74', '#8B86AF', '#52423D', '#6E9D5A'],
    scuro: ['#6F97C6', '#C47764', '#C78BB4', '#CFA95E', '#6FB0A8', '#9D99C0', '#CFB9AA', '#A8DA95'],
  },
};

/** Sfondo del tema scuro (--sfondo in global.css): riferimento per il contrasto. */
export const SFONDO_SCURO = '#111210';

/**
 * I colori per un progetto con `n` parti: il set di taglia n per 4 ≤ n ≤ 8,
 * un prefisso del set minimo per n < 4. Oltre le 8 parti non esiste un set
 * pre-validato: il codegen si ferma con errore.
 */
export function coloriPerParti(n: number): { chiaro: readonly string[]; scuro: readonly string[] } {
  if (!Number.isInteger(n) || n < 1) throw new Error(`numero di parti non valido: ${n}`);
  if (n > N_PARTI_MAX) {
    throw new Error(
      `${n} parti: la palette pre-validata copre da ${N_PARTI_MIN} a ${N_PARTI_MAX} parti ` +
        '(src/lib/palette-parti.ts); aggiungere un set validato dal test di deuteranopia'
    );
  }
  const set = PALETTE_PARTI[Math.max(n, N_PARTI_MIN)]!;
  return { chiaro: set.chiaro.slice(0, n), scuro: set.scuro.slice(0, n) };
}
