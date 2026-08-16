import { useEffect, useState } from 'react';
import {
  impostaGiudizioVoce,
  leggiStudio,
  registraVisitaVoce,
  segnaVoceLetta,
  suAggiornamentoStudio,
  type GiudizioVoce,
} from '../../lib/studio';
import { withBase } from '../../lib/percorsi-url';

interface Props {
  /** id della voce di questo dossier */
  id: string;
}

/**
 * Il taccuino di studio della voce: registra la consultazione, osserva se il
 * corpo è stato letto fino in fondo (sentinella #fine-corpo-voce) e offre
 * l'autovalutazione — «assimilata» o «da ripassare» — che è il risultato
 * d'apprendimento consultabile poi in /studio. Tutto resta nel browser;
 * senza JavaScript la pagina è completa e questo riquadro semplicemente
 * non compare.
 */
export default function StudioVoce({ id }: Props) {
  const [visite, setVisite] = useState(0);
  const [letta, setLetta] = useState(false);
  const [giudizio, setGiudizio] = useState<GiudizioVoce | undefined>(undefined);

  useEffect(() => {
    registraVisitaVoce(id);
    const rileggi = () => {
      const registro = leggiStudio().voci[id];
      setVisite(registro?.visite ?? 0);
      setLetta(registro?.letta ?? false);
      setGiudizio(registro?.giudizio);
    };
    rileggi();
    const annulla = suAggiornamentoStudio(rileggi);

    const sentinella = document.getElementById('fine-corpo-voce');
    let osservatore: IntersectionObserver | undefined;
    if (sentinella) {
      osservatore = new IntersectionObserver((visibili) => {
        if (visibili.some((v) => v.isIntersecting)) {
          segnaVoceLetta(id);
          osservatore?.disconnect();
        }
      });
      osservatore.observe(sentinella);
    }
    return () => {
      annulla();
      osservatore?.disconnect();
    };
  }, [id]);

  const commuta = (valore: GiudizioVoce) => {
    impostaGiudizioVoce(id, giudizio === valore ? undefined : valore);
  };

  const bottone = (valore: GiudizioVoce, etichetta: string) => (
    <button
      type="button"
      aria-pressed={giudizio === valore}
      onClick={() => commuta(valore)}
      className={`rounded border px-2 py-1 text-xs transition-colors duration-150 ${
        giudizio === valore
          ? 'border-accento text-accento font-medium bg-incassato'
          : 'border-bordo hover:bg-incassato'
      }`}
    >
      {etichetta}
    </button>
  );

  return (
    <section aria-label="Il tuo studio di questa voce" className="rounded border border-bordo bg-rialzato p-3">
      <h2 className="etichetta" style={{ color: 'var(--testo-tenue)' }}>
        Studio
      </h2>
      <p className="mt-1.5 text-xs" style={{ color: 'var(--testo-tenue)' }} role="status">
        {visite <= 1 ? 'Prima consultazione' : `${visite} consultazioni`}
        {letta && ' · letta fino in fondo'}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {bottone('assimilata', '✓ Assimilata')}
        {bottone('da-ripassare', '↻ Da ripassare')}
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--testo-tenue)' }}>
        Resta sul tuo dispositivo ·{' '}
        <a className="underline decoration-dotted hover:text-accento" href={withBase('/studio')}>
          i tuoi progressi
        </a>
      </p>
    </section>
  );
}
