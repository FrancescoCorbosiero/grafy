import { describe, expect, it } from 'vitest';
import { arcoSchema, periodoSchema, voceSchema } from '../../src/lib/schema';
import {
  ARCHI_DERIVATI,
  N_PARTI,
  TIPI_ARCO,
  TIPI_NODO,
  TIPI_LEGGENDARI,
  arcoDerivato,
  arcoLeggendario,
} from '../../src/lib/costanti';

/*
 * Test del MOTORE: i tipi nei fixture vengono dalla tassonomia generata
 * (kit/seme.json), non da valori cablati. I casi sugli archi derivati e
 * leggendari si attivano solo se il seme li dichiara.
 */
const TIPO_VOCE = TIPI_NODO.find((t) => t !== 'parte')!;
const ARCO_DOCUMENTATO = TIPI_ARCO.find((t) => !arcoDerivato(t) && !arcoLeggendario(t))!;
const ARCO_LEGGENDARIO = TIPI_LEGGENDARI[0];
const ARCO_DERIVATO = ARCHI_DERIVATI[0];

const voceValida = {
  id: 'ficino',
  titolo: 'Marsilio Ficino',
  tipo: TIPO_VOCE,
  parte: 2,
  sommario: 'Traduttore del Corpus Hermeticum, teorico della magia astrale medica.',
  periodo: { da: 1433, a: 1499 },
  luoghi: ['firenze'],
  alias: ['Ficinus'],
  peso: 3,
  archi: [{ verso: 'corpus-hermeticum', tipo: ARCO_DOCUMENTATO, nota: 'Traduzione del 1463' }],
  fonti: ['Yates'],
};

describe('schema della voce (§3.4)', () => {
  it('accetta una voce completa valida', () => {
    expect(voceSchema.safeParse(voceValida).success).toBe(true);
  });

  it('rifiuta id non kebab-case', () => {
    for (const id of ['Ficino', 'ficino_x', 'ficino ', 'à-ficino', '-ficino', 'ficino-']) {
      expect(voceSchema.safeParse({ ...voceValida, id }).success).toBe(false);
    }
  });

  it('rifiuta tipo e parte fuori dominio', () => {
    expect(voceSchema.safeParse({ ...voceValida, tipo: 'tipo-inesistente' }).success).toBe(false);
    expect(voceSchema.safeParse({ ...voceValida, parte: N_PARTI + 1 }).success).toBe(false);
    expect(voceSchema.safeParse({ ...voceValida, parte: 0 }).success).toBe(false);
  });

  it('rifiuta peso fuori da 1-5', () => {
    expect(voceSchema.safeParse({ ...voceValida, peso: 0 }).success).toBe(false);
    expect(voceSchema.safeParse({ ...voceValida, peso: 6 }).success).toBe(false);
  });

  it('rifiuta un periodo rovesciato', () => {
    expect(periodoSchema.safeParse({ da: 1600, a: 1500 }).success).toBe(false);
    expect(periodoSchema.safeParse({ da: -800, a: -900 }).success).toBe(false);
  });

  it('accetta anni negativi (a.C.) ordinati', () => {
    expect(periodoSchema.safeParse({ da: -600, a: -500 }).success).toBe(true);
  });
});

describe('schema degli archi (§3.3)', () => {
  it.runIf(ARCO_LEGGENDARIO)('rifiuta un arco leggendario senza nota', () => {
    expect(arcoSchema.safeParse({ verso: 'massoneria', tipo: ARCO_LEGGENDARIO }).success).toBe(false);
    expect(
      arcoSchema.safeParse({ verso: 'massoneria', tipo: ARCO_LEGGENDARIO, nota: 'breve' }).success
    ).toBe(false);
  });

  it.runIf(ARCO_LEGGENDARIO)('accetta un arco leggendario con nota esplicativa', () => {
    expect(
      arcoSchema.safeParse({
        verso: 'massoneria',
        tipo: ARCO_LEGGENDARIO,
        nota: 'La filiazione templare è una costruzione settecentesca degli alti gradi.',
      }).success
    ).toBe(true);
  });

  it.runIf(ARCO_DERIVATO)('rifiuta archi derivati dichiarati a mano', () => {
    expect(arcoSchema.safeParse({ verso: 'ficino', tipo: ARCO_DERIVATO }).success).toBe(false);
  });

  it('rifiuta tipi di arco sconosciuti', () => {
    expect(arcoSchema.safeParse({ verso: 'ficino', tipo: 'arco-inesistente' }).success).toBe(false);
  });
});
