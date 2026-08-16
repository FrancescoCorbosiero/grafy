import { describe, expect, it } from 'vitest';
import {
  ErroreValidazione,
  calcolaLayout,
  costruisciGrafo,
  leggiVoci,
  serializza,
  type VoceLetta,
} from '../../scripts/build-data';
import { voceSchema } from '../../src/lib/schema';
import {
  ARCO_CONTENIMENTO,
  NUMERI_PARTE,
  N_PARTI,
  TIPI_ARCO,
  TIPI_NODO,
  arcoDerivato,
  arcoLeggendario,
} from '../../src/lib/costanti';

/*
 * Test del MOTORE, non dell'istanza: i tipi usati nei fixture vengono dalla
 * tassonomia generata (kit/seme.json), così la suite resta verde con
 * qualunque seme. I casi legati a un tipo facoltativo ("luogo") si attivano
 * solo se la tassonomia lo dichiara.
 */
const TIPO_VOCE = TIPI_NODO.find((t) => t !== 'parte' && t !== 'luogo')!;
const ARCHI_DOCUMENTATI = TIPI_ARCO.filter((t) => !arcoDerivato(t) && !arcoLeggendario(t));
const ARCO_1 = ARCHI_DOCUMENTATI[0]!;
const ARCO_2 = ARCHI_DOCUMENTATI[1] ?? ARCO_1;
const haTipoLuogo = (TIPI_NODO as readonly string[]).includes('luogo');
/** L'i-esimo numero di parte, saturando sull'ultima (i fixture non presumono 6 parti). */
const parteN = (i: number) => NUMERI_PARTE[Math.min(i, N_PARTI - 1)]!;

/** Fabbrica una VoceLetta sintetica valida. */
function voce(sovrascrivi: Record<string, unknown>, corpo = 'Corpo di prova della voce.'): VoceLetta {
  const base = {
    id: 'x',
    titolo: 'X',
    tipo: TIPO_VOCE,
    parte: 1,
    sommario: 'Sommario di prova sufficientemente lungo per lo schema.',
    peso: 2,
    luoghi: [],
    alias: [],
    archi: [],
    fonti: [],
  };
  const fm = voceSchema.parse({ ...base, ...sovrascrivi });
  return { fm, corpo, file: `${fm.id}.md` };
}

function tutteLeParti(): VoceLetta[] {
  return NUMERI_PARTE.map((n) =>
    voce({ id: `parte-${n}`, titolo: `Parte ${n}`, tipo: 'parte', parte: n, peso: 5 })
  );
}

describe('costruzione del grafo: invarianti (§6)', () => {
  it('accetta un grafo minimo valido e deriva gli archi di contenimento', () => {
    const parteGnosi = parteN(2);
    const parteFicino = parteN(1);
    const { archi } = costruisciGrafo([
      ...tutteLeParti(),
      voce({ id: 'gnosi', parte: parteGnosi }),
      voce({ id: 'ficino', parte: parteFicino, archi: [{ verso: 'gnosi', tipo: ARCO_2 }] }),
    ]);
    const contiene = archi.filter((a) => a.tipo === ARCO_CONTENIMENTO);
    expect(contiene).toHaveLength(2);
    expect(contiene.map((a) => `${a.da}->${a.a}`).sort()).toEqual(
      [`parte-${parteFicino}->ficino`, `parte-${parteGnosi}->gnosi`].sort()
    );
  });

  it('errore su riferimento pendente', () => {
    expect(() =>
      costruisciGrafo([...tutteLeParti(), voce({ id: 'a', archi: [{ verso: 'inesistente', tipo: ARCO_1 }] })])
    ).toThrowError(/pendente/);
  });

  it('errore se manca un nodo parte', () => {
    expect(() => costruisciGrafo(tutteLeParti().slice(0, N_PARTI - 1))).toThrowError(/manca il nodo radice/);
  });

  it('errore su arco duplicato e su arco riflessivo', () => {
    expect(() =>
      costruisciGrafo([
        ...tutteLeParti(),
        voce({ id: 'b', parte: 1 }),
        voce({
          id: 'a',
          archi: [
            { verso: 'b', tipo: ARCO_1 },
            { verso: 'b', tipo: ARCO_1 },
          ],
        }),
      ])
    ).toThrowError(/duplicato/);
    expect(() =>
      costruisciGrafo([...tutteLeParti(), voce({ id: 'a', archi: [{ verso: 'a', tipo: ARCO_1 }] })])
    ).toThrowError(/riflessivo/);
  });

  it.runIf(haTipoLuogo)('errore se un luogo non esiste o non è di tipo luogo', () => {
    expect(() => costruisciGrafo([...tutteLeParti(), voce({ id: 'a', luoghi: ['atlantide'] })])).toThrowError(
      /luogo pendente/
    );
    expect(() =>
      costruisciGrafo([...tutteLeParti(), voce({ id: 'b', parte: 1 }), voce({ id: 'a', luoghi: ['b'] })])
    ).toThrowError(/tipo/);
  });

  it('ogni nodo è raggiungibile dalle radici (via contenimento)', () => {
    // l'arco di contenimento derivato garantisce la raggiungibilità per costruzione
    const { grafo } = costruisciGrafo([...tutteLeParti(), voce({ id: 'isolato', parte: parteN(4) })]);
    expect(grafo.order).toBe(N_PARTI + 1);
  });
});

describe('layout deterministico', () => {
  it('due esecuzioni producono le stesse coordinate', () => {
    const costruisci = () => {
      const g = costruisciGrafo([
        ...tutteLeParti(),
        voce({ id: 'a', parte: parteN(0), archi: [{ verso: 'b', tipo: ARCO_1 }] }),
        voce({ id: 'b', parte: parteN(1), archi: [{ verso: 'c', tipo: ARCO_2 }] }),
        voce({ id: 'c', parte: parteN(2) }),
      ]);
      calcolaLayout(g.grafo);
      return serializza(g).dati.nodi.map((n) => [n.id, n.x, n.y]);
    };
    expect(costruisci()).toEqual(costruisci());
  });
});

describe('contenuto reale del progetto', () => {
  it('le voci in src/content/voci passano tutte le validazioni', () => {
    const voci = leggiVoci();
    expect(voci.length).toBeGreaterThanOrEqual(10);
    const { grafo, archi } = costruisciGrafo(voci);
    expect(grafo.order).toBe(voci.length);
    // ogni arco leggendario ha la nota (già garantito dallo schema: ricontrollo)
    for (const arco of archi) {
      if (arcoLeggendario(arco.tipo)) {
        expect(arco.nota, `nota mancante su ${arco.chiave}`).toBeTruthy();
        expect(arco.nota!.length).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('la pipeline segnala con ErroreValidazione, non con eccezioni generiche', () => {
    expect(() => leggiVoci('/percorso/inesistente')).toThrowError(ErroreValidazione);
  });
});
