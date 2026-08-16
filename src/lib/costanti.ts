/**
 * Tassonomia del progetto, senza dipendenze: importabile dal client senza
 * trascinare Zod. I valori NON vivono più qui: sono GENERATI da kit/seme.json
 * (scripts/genera-costanti.ts, primo passo di `npm run data`) e questo modulo
 * li ri-esporta, così nessun import esistente cambia percorso. Qui restano
 * solo i derivati statici di comodo. Gli schemi di validazione vivono in
 * schema.ts (lato build) e riesportano da qui.
 */
export * from '../generated/costanti';

import { ARCHI_DERIVATI, N_PARTI, TIPI_LEGGENDARI } from '../generated/costanti';

/**
 * Il tipo dell'arco di contenimento parte→voce che la pipeline deriva dal
 * campo `parte`: per convenzione il primo di ARCHI_DERIVATI (il codegen
 * esige che il seme ne dichiari almeno uno).
 */
export const ARCO_CONTENIMENTO = ARCHI_DERIVATI[0];

/** true se il tipo è un arco derivato dalla pipeline (mai dichiarato a mano). */
export const arcoDerivato = (tipo: string): boolean =>
  (ARCHI_DERIVATI as readonly string[]).includes(tipo);

/** true se il tipo è un arco leggendario (doppio registro, spento di default). */
export const arcoLeggendario = (tipo: string): boolean =>
  (TIPI_LEGGENDARI as readonly string[]).includes(tipo);

/** I numeri di parte, [1..N_PARTI]. */
export const NUMERI_PARTE: readonly number[] = Array.from({ length: N_PARTI }, (_, i) => i + 1);
