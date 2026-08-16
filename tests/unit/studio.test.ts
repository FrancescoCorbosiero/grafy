import { describe, expect, it } from 'vitest';
import {
  aggregaStudio,
  interpretaStudio,
  prossimeVoci,
  riprendiDa,
  vociDaRipassare,
  type StatoStudio,
  type VoceStudiabile,
} from '../../src/lib/studio';
import { NUMERI_PARTE, N_PARTI, TIPI_NODO } from '../../src/lib/costanti';

/*
 * Test della logica PURA del registro di studio (interpretazione difensiva
 * e aggregazioni): niente DOM, niente localStorage. Il giro completo
 * traccia→consulta, con più tab, è coperto dalle e2e.
 */
const TIPO = TIPI_NODO.find((t) => t !== 'parte')!;
const P = (i: number) => NUMERI_PARTE[Math.min(i, N_PARTI - 1)]!;

const voce = (id: string, parte: number, peso: number, titolo = id): VoceStudiabile => ({
  id,
  titolo,
  tipo: TIPO,
  parte,
  peso,
});

const CORPUS: VoceStudiabile[] = [
  voce('alfa', P(0), 5),
  voce('beta', P(0), 3),
  voce('gamma', P(1), 5),
  voce('delta', P(1), 4),
  voce('epsilon', P(2), 2),
  // il nodo strutturale di parte non conta mai nello studio
  { id: `parte-${P(0)}`, titolo: 'Parte', tipo: 'parte', parte: P(0), peso: 5 },
];

const stato = (voci: StatoStudio['voci'], percorsi: StatoStudio['percorsi'] = {}): StatoStudio => ({
  versione: 1,
  voci,
  percorsi,
});

describe('interpretazione difensiva della memoria', () => {
  it('memoria assente, corrotta o di versione ignota ⇒ stato vuoto', () => {
    for (const grezzo of [null, '', 'non-json{', '[]', '{"versione":99}', '{"voci":{}}']) {
      const s = interpretaStudio(grezzo);
      expect(s).toEqual({ versione: 1, voci: {}, percorsi: {} });
    }
  });

  it('uno stato salvato torna com\'era', () => {
    const originale = stato(
      { alfa: { prima: 1, ultima: 2, visite: 3, letta: true, giudizio: 'assimilata' } },
      { cammino: { tappa: 2, totale: 7, ultima: 5 } }
    );
    expect(interpretaStudio(JSON.stringify(originale))).toEqual(originale);
  });
});

describe('aggregazione sul corpus', () => {
  it('conta consultate, lette e giudizi per parte e per peso, escludendo i nodi parte', () => {
    const r = aggregaStudio(
      stato({
        alfa: { prima: 1, ultima: 9, visite: 2, letta: true, giudizio: 'assimilata' },
        gamma: { prima: 2, ultima: 8, visite: 1, giudizio: 'da-ripassare' },
        [`parte-${P(0)}`]: { prima: 1, ultima: 1, visite: 1 },
      }),
      CORPUS,
      NUMERI_PARTE
    );
    expect(r.totale).toBe(5);
    expect(r.consultate).toBe(2);
    expect(r.lette).toBe(1);
    expect(r.assimilate).toBe(1);
    expect(r.daRipassare).toBe(1);
    const parte1 = r.perParte.find((c) => c.parte === P(0))!;
    expect(parte1).toMatchObject({ totale: 2, consultate: 1, assimilate: 1, daRipassare: 0 });
    const peso5 = r.perPeso.find((p) => p.peso === 5)!;
    expect(peso5).toMatchObject({ totale: 2, consultate: 2, assimilate: 1 });
    // l'ordine dei pesi è decrescente: prima il nucleo
    expect(r.perPeso.map((p) => p.peso)).toEqual([...r.perPeso.map((p) => p.peso)].sort((a, b) => b - a));
  });

  it('senza registro tutto è a zero ma il corpus è contato', () => {
    const r = aggregaStudio(stato({}), CORPUS, NUMERI_PARTE);
    expect(r).toMatchObject({ totale: 5, consultate: 0, lette: 0, assimilate: 0, daRipassare: 0 });
    expect(r.perParte).toHaveLength(N_PARTI);
  });
});

describe('prossime voci da studiare', () => {
  it('privilegia le parti già iniziate, poi il peso decrescente', () => {
    const s = stato({ beta: { prima: 1, ultima: 1, visite: 1 } }); // parte P(0) iniziata
    const suggerite = prossimeVoci(s, CORPUS, 3).map((v) => v.id);
    // prima la voce di peso maggiore della parte iniziata, poi il nucleo delle altre
    expect(suggerite[0]).toBe('alfa');
    expect(suggerite).not.toContain('beta'); // già consultata
    expect(suggerite).toContain('gamma');
  });

  it('senza alcuna consultazione parte dal nucleo (peso 5)', () => {
    const suggerite = prossimeVoci(stato({}), CORPUS, 2).map((v) => v.id);
    expect(suggerite).toEqual(['alfa', 'gamma']);
  });
});

describe('riprendi e da ripassare', () => {
  it('riprendi: le più recenti non assimilate, in ordine di ultima consultazione', () => {
    const s = stato({
      alfa: { prima: 1, ultima: 10, visite: 1, giudizio: 'assimilata' },
      beta: { prima: 1, ultima: 30, visite: 1 },
      gamma: { prima: 1, ultima: 20, visite: 1, giudizio: 'da-ripassare' },
      fantasma: { prima: 1, ultima: 99, visite: 1 }, // non più nel corpus: ignorata
    });
    expect(riprendiDa(s, CORPUS).map((v) => v.id)).toEqual(['beta', 'gamma']);
  });

  it('da ripassare: ordinate per parte e peso', () => {
    const s = stato({
      epsilon: { prima: 1, ultima: 1, visite: 1, giudizio: 'da-ripassare' },
      gamma: { prima: 1, ultima: 1, visite: 1, giudizio: 'da-ripassare' },
    });
    expect(vociDaRipassare(s, CORPUS).map((v) => v.id)).toEqual(['gamma', 'epsilon']);
  });
});
