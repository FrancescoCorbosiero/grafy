import { describe, expect, it } from 'vitest';
import {
  INTERVALLO_TEMPO,
  analizzaStatoGrafo,
  formattaAnno,
  formattaPeriodo,
  serializzaStatoGrafo,
  type StatoGrafo,
} from '../../src/lib/percorsi-url';
import {
  NUMERI_PARTE,
  N_PARTI,
  TIPI_ARCO,
  TIPI_NODO,
  arcoDerivato,
  arcoLeggendario,
} from '../../src/lib/costanti';

/* Test del MOTORE: tipi e parti vengono dalla tassonomia generata dal seme. */
const [tipoA, tipoB] = TIPI_NODO.filter((t) => t !== 'parte');
const archiScelti = TIPI_ARCO.filter((t) => !arcoDerivato(t)).slice(0, 2);
const parti = NUMERI_PARTE.slice(1, 3);

describe('stato del grafo in query string (§6, URL condivisibili)', () => {
  it('serializza e rilegge uno stato completo (andata e ritorno)', () => {
    const stato: StatoGrafo = {
      tipi: [tipoA!, tipoB ?? tipoA!],
      archi: archiScelti,
      parti,
      da: -300,
      a: 1600,
      nodo: 'ficino',
      leggendarie: true,
    };
    const qs = serializzaStatoGrafo(stato);
    expect(analizzaStatoGrafo(qs)).toEqual(stato);
  });

  it('uno stato vuoto produce query vuota', () => {
    expect(serializzaStatoGrafo({})).toBe('');
    expect(analizzaStatoGrafo('')).toEqual({});
  });

  it('ignora valori fuori dominio senza esplodere', () => {
    const stato = analizzaStatoGrafo(
      `?tipi=${tipoA},tipo-inesistente&parti=2,${N_PARTI + 3}&nodo=<script>&archi=${archiScelti[0]},arco-inesistente`
    );
    expect(stato.tipi).toEqual([tipoA]);
    expect(stato.parti).toEqual([2]);
    expect(stato.nodo).toBeUndefined();
    expect(stato.archi).toEqual([archiScelti[0]]);
  });

  it('i tipi leggendari restano indirizzabili via URL', () => {
    // il default li esclude, ma un URL condiviso può accenderli esplicitamente
    const leggendario = TIPI_ARCO.find((t) => arcoLeggendario(t));
    if (!leggendario) return;
    expect(analizzaStatoGrafo(`?archi=${leggendario}`).archi).toEqual([leggendario]);
  });

  it('omette gli estremi temporali di default', () => {
    expect(serializzaStatoGrafo({ da: INTERVALLO_TEMPO[0], a: INTERVALLO_TEMPO[1] })).toBe('');
  });
});

describe('formattazione degli anni', () => {
  it('anni negativi come a.C.', () => {
    expect(formattaAnno(-800)).toBe('800 a.C.');
    expect(formattaAnno(1614)).toBe('1614');
  });
  it('periodo puntuale come anno singolo', () => {
    expect(formattaPeriodo({ da: 1614, a: 1614 })).toBe('1614');
    expect(formattaPeriodo({ da: -600, a: 200 })).toBe('600 a.C. – 200');
  });
});
