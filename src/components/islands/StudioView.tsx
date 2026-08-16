import { useEffect, useMemo, useState } from 'react';
import {
  aggregaStudio,
  azzeraStudio,
  capitoliLetti,
  leggiStudio,
  prossimeVoci,
  riprendiDa,
  suAggiornamentoStudio,
  vociDaRipassare,
  type StatoStudio,
  type VoceStudiabile,
} from '../../lib/studio';
import { withBase } from '../../lib/percorsi-url';
import { ETICHETTE_TIPO_NODO, NUMERI_PARTE, type TipoNodo } from '../../lib/costanti';
import { NOMI_PARTE, NOMI_PARTE_BREVI } from '../../lib/palette';

interface PercorsoInfo {
  slug: string;
  titolo: string;
  tappe: number;
}

interface CapitoloInfo {
  id: string;
  titolo: string;
}

interface Props {
  percorsi: PercorsoInfo[];
  capitoli: CapitoloInfo[];
}

/**
 * La consultazione del registro di studio: copertura per parte e per peso,
 * autovalutazioni, percorsi e volume, più i passi consigliati. Legge il
 * registro locale e resta sincronizzata con le altre tab (eventi storage):
 * si può studiare su più tab e consultare i risultati qui, dal vivo.
 */
export default function StudioView({ percorsi, capitoli }: Props) {
  const [voci, setVoci] = useState<VoceStudiabile[] | null>(null);
  const [errore, setErrore] = useState(false);
  const [stato, setStato] = useState<StatoStudio>(() => ({ versione: 1, voci: {}, percorsi: {} }));
  const [aperti, setAperti] = useState<string[]>([]);

  useEffect(() => {
    fetch(withBase('/data/ricerca-voci.json'))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((dati: VoceStudiabile[]) => setVoci(dati))
      .catch(() => setErrore(true));
    const rileggi = () => {
      setStato(leggiStudio());
      setAperti(capitoliLetti());
    };
    rileggi();
    return suAggiornamentoStudio(rileggi);
  }, []);

  const riassunto = useMemo(() => (voci ? aggregaStudio(stato, voci, NUMERI_PARTE) : null), [stato, voci]);
  const daRipassare = useMemo(() => (voci ? vociDaRipassare(stato, voci) : []), [stato, voci]);
  const riprendi = useMemo(() => (voci ? riprendiDa(stato, voci) : []), [stato, voci]);
  const prossime = useMemo(() => (voci ? prossimeVoci(stato, voci) : []), [stato, voci]);

  if (errore) {
    return (
      <p role="alert" className="mt-6">
        Impossibile caricare l’indice delle voci: il registro resta salvato, riprova più tardi.
      </p>
    );
  }
  if (!voci || !riassunto) {
    return (
      <p role="status" className="mt-6 text-sm" style={{ color: 'var(--testo-tenue)' }}>
        Caricamento del registro…
      </p>
    );
  }

  const capitoliAperti = capitoli.filter((c) => aperti.includes(c.id));
  const percorsiIniziati = percorsi.filter((p) => stato.percorsi[p.slug]);
  const nulla =
    riassunto.consultate === 0 && capitoliAperti.length === 0 && percorsiIniziati.length === 0;

  const collegamentoVoce = (voce: VoceStudiabile) => (
    <li key={voce.id} className="text-sm leading-snug">
      <a
        className="underline decoration-dotted underline-offset-2 hover:text-accento"
        href={withBase(`/voce/${voce.id}`)}
      >
        {voce.titolo}
      </a>
      <span className="ms-2 text-xs" style={{ color: 'var(--testo-tenue)' }}>
        {ETICHETTE_TIPO_NODO[voce.tipo as TipoNodo] ?? voce.tipo} · {NOMI_PARTE_BREVI[voce.parte]} · peso {voce.peso}
      </span>
    </li>
  );

  return (
    <div className="mt-8 space-y-10">
      {nulla && (
        <section className="rounded border border-bordo bg-rialzato p-4 max-w-2xl">
          <p className="text-sm leading-relaxed">
            Qui si raccoglie il tuo studio: le voci che consulti e giudichi («assimilata», «da
            ripassare»), i percorsi che segui, i capitoli che apri — anche da più tab insieme.
            Tutto resta nel tuo browser. Comincia dal nucleo qui sotto, da un{' '}
            <a className="underline text-accento" href={withBase('/percorsi')}>
              percorso d’autore
            </a>{' '}
            o dal{' '}
            <a className="underline text-accento" href={withBase('/grafo')}>
              grafo
            </a>
            .
          </p>
        </section>
      )}

      {/* Riepilogo */}
      <section aria-labelledby="titolo-riepilogo">
        <h2 id="titolo-riepilogo" className="text-sm font-semibold text-accento">
          Riepilogo
        </h2>
        <p className="mt-2 text-lg font-serif" role="status" aria-live="polite">
          {riassunto.consultate} voci consultate su {riassunto.totale} · {riassunto.assimilate}{' '}
          assimilate · {riassunto.daRipassare} da ripassare
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 max-w-md text-sm sm:grid-cols-3">
          {riassunto.perPeso.map((riga) => (
            <div key={riga.peso} className="flex items-baseline justify-between gap-2 border-b border-bordo py-1">
              <dt style={{ color: 'var(--testo-tenue)' }}>Peso {riga.peso}</dt>
              <dd className="font-medium">
                {riga.consultate}/{riga.totale}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs" style={{ color: 'var(--testo-tenue)' }}>
          Il peso è la centralità della voce nel campo: coprire prima i pesi alti è coprire il
          nucleo.
        </p>
      </section>

      {/* Copertura per parte */}
      <section aria-labelledby="titolo-copertura">
        <h2 id="titolo-copertura" className="text-sm font-semibold text-accento">
          Copertura per parte
        </h2>
        <ul className="mt-3 space-y-3 max-w-2xl">
          {riassunto.perParte.map((parte) => {
            const quota = parte.totale > 0 ? Math.round((parte.consultate / parte.totale) * 100) : 0;
            return (
              <li key={parte.parte}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      aria-hidden="true"
                      className="inline-block size-2.5 rounded-full shrink-0"
                      style={{ background: `var(--parte-${parte.parte})` }}
                    />
                    <span className="truncate">{NOMI_PARTE[parte.parte]}</span>
                  </span>
                  <span className="shrink-0 text-xs" style={{ color: 'var(--testo-tenue)' }}>
                    {parte.consultate}/{parte.totale} consultate
                    {parte.assimilate > 0 && ` · ${parte.assimilate} assimilate`}
                  </span>
                </div>
                <div
                  className="mt-1 h-1.5 rounded-sm bg-incassato overflow-hidden"
                  role="img"
                  aria-label={`Parte ${parte.parte}: ${quota}% consultata`}
                >
                  <div
                    className="h-full rounded-sm"
                    style={{ width: `${quota}%`, background: `var(--parte-${parte.parte})` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Da ripassare */}
      {daRipassare.length > 0 && (
        <section aria-labelledby="titolo-ripassare">
          <h2 id="titolo-ripassare" className="text-sm font-semibold text-accento">
            Da ripassare ({daRipassare.length})
          </h2>
          <ul className="mt-2 space-y-1.5">{daRipassare.map(collegamentoVoce)}</ul>
        </section>
      )}

      {/* Riprendi */}
      {riprendi.length > 0 && (
        <section aria-labelledby="titolo-riprendi">
          <h2 id="titolo-riprendi" className="text-sm font-semibold text-accento">
            Riprendi da dove eri
          </h2>
          <ul className="mt-2 space-y-1.5">{riprendi.map(collegamentoVoce)}</ul>
        </section>
      )}

      {/* Prossimi passi */}
      {prossime.length > 0 && (
        <section aria-labelledby="titolo-prossime">
          <h2 id="titolo-prossime" className="text-sm font-semibold text-accento">
            Prossimi passi consigliati
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--testo-tenue)' }}>
            Voci mai consultate: prima le parti che hai già iniziato, poi il nucleo delle altre.
          </p>
          <ul className="mt-2 space-y-1.5">{prossime.map(collegamentoVoce)}</ul>
        </section>
      )}

      {/* Percorsi */}
      <section aria-labelledby="titolo-percorsi-studio">
        <h2 id="titolo-percorsi-studio" className="text-sm font-semibold text-accento">
          Percorsi d’autore
        </h2>
        <ul className="mt-2 space-y-1.5 text-sm">
          {percorsi.map((percorso) => {
            const avanzamento = stato.percorsi[percorso.slug];
            const completato = avanzamento && avanzamento.tappa >= percorso.tappe;
            return (
              <li key={percorso.slug} className="flex flex-wrap items-baseline gap-x-2">
                <a
                  className="underline decoration-dotted underline-offset-2 hover:text-accento"
                  href={withBase(`/percorso/${percorso.slug}`)}
                >
                  {percorso.titolo}
                </a>
                <span className="text-xs" style={{ color: 'var(--testo-tenue)' }}>
                  {completato
                    ? `completato · ${percorso.tappe} tappe`
                    : avanzamento
                      ? `tappa ${avanzamento.tappa} di ${percorso.tappe}`
                      : `mai iniziato · ${percorso.tappe} tappe`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Volume */}
      <section aria-labelledby="titolo-volume-studio">
        <h2 id="titolo-volume-studio" className="text-sm font-semibold text-accento">
          Volume lineare
        </h2>
        <p className="mt-2 text-sm">
          {capitoliAperti.length} capitoli aperti su {capitoli.length}.{' '}
          <a className="underline decoration-dotted text-accento" href={withBase('/leggi')}>
            Vai al volume →
          </a>
        </p>
      </section>

      <footer className="border-t border-bordo pt-4 flex flex-wrap items-center gap-4">
        <p className="text-xs max-w-md" style={{ color: 'var(--testo-tenue)' }}>
          Il registro vive solo in questo browser (localStorage), condiviso fra le sue tab: niente
          account, niente server.
        </p>
        <button
          type="button"
          className="ms-auto rounded border border-bordo px-2.5 py-1.5 text-xs hover:bg-incassato"
          onClick={() => {
            if (window.confirm('Azzerare tutto il registro di studio di questo browser?')) {
              azzeraStudio();
            }
          }}
        >
          Azzera il registro
        </button>
      </footer>
    </div>
  );
}
