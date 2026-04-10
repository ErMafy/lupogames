import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Lupo Games',
  description:
    'Informativa sul trattamento dei dati personali per il servizio Lupo Games.',
};

/** Aggiorna questi dati prima della pubblicazione negli store. */
const TITOLARE = {
  nome: '[Inserisci ragione sociale o nome del titolare]',
  indirizzo: '[Inserisci sede legale o domicilio, se applicabile]',
  email: '[Inserisci email dedicata alla privacy, es. privacy@tuodominio.it]',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] bg-[#0A0A1B] text-white">
      <div className="bg-stars fixed inset-0 pointer-events-none opacity-60" aria-hidden />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 pt-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        {process.env.NODE_ENV === 'development' ? (
          <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2 mb-6">
            Sviluppo: aggiorna nome, indirizzo e email nel file sorgente (costante{' '}
            <code className="text-amber-100">TITOLARE</code>).
          </p>
        ) : null}

        <h1 className="text-2xl font-black tracking-tight mb-2 bg-gradient-to-r from-purple-200 to-pink-300 bg-clip-text text-transparent">
          Informativa sulla privacy
        </h1>
        <p className="text-white/50 text-sm mb-8">Ultimo aggiornamento: 10 aprile 2026</p>

        <div className="space-y-6 text-white/85 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold text-base mb-2">1. Titolare del trattamento</h2>
            <p>
              Il titolare del trattamento dei dati personali relativi all&apos;utilizzo del servizio{' '}
              <strong>Lupo Games</strong> (sito web, Progressive Web App e, ove applicabile, app
              mobile che caricano lo stesso servizio) è:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>
                <strong>{TITOLARE.nome}</strong>
              </li>
              <li>{TITOLARE.indirizzo}</li>
              <li>
                Email:{' '}
                <a href={`mailto:${TITOLARE.email}`} className="text-purple-300 underline">
                  {TITOLARE.email}
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">2. Cosa è Lupo Games</h2>
            <p>
              Lupo Games è un servizio di <strong>party game online</strong>: gli utenti creano o
              entrano in una stanza virtuale tramite un codice, scelgono un nome e un avatar, e
              partecipano a minigiochi sincronizzati in tempo reale con altri partecipanti nella
              stessa stanza.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">
              3. Quali dati trattiamo e perché
            </h2>
            <p>
              Trattiamo solo i dati necessari a far funzionare il gioco e a mantenere la sessione.
              Non è richiesto un account permanente con email o password per giocare in modalità
              standard.
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>
                <strong>Dati di gioco e di sessione</strong> (es. codice stanza, stato della stanza,
                minigioco in corso, round, punteggi, stato tecnico del gioco salvato sul server).{' '}
                <em className="text-white/60">Finalità: esecuzione del servizio richiesto.</em>
              </li>
              <li>
                <strong>Nome (nickname) e avatar</strong> scelti dal giocatore per essere riconosciuto
                in stanza.
                <em className="text-white/60"> Finalità: esecuzione del servizio e identificazione
                nella partita.</em>
              </li>
              <li>
                <strong>Contenuti inseriti durante i minigiochi</strong> (es. risposte di testo,
                voti, risposte a domande), conservati per lo svolgimento del round e della partita.
                <em className="text-white/60"> Finalità: esecuzione del servizio.</em>
              </li>
              <li>
                <strong>Dati tecnici di connessione in tempo reale</strong> (es. identificativi di
                sessione lato provider di messaggistica in tempo reale, necessari per notificare gli
                eventi di gioco ai dispositivi collegati).
                <em className="text-white/60"> Finalità: funzionamento della sincronizzazione in
                tempo reale.</em>
              </li>
              <li>
                <strong>Dati di log e sicurezza lato infrastruttura</strong> che il fornitore di
                hosting o il database possono generare automaticamente (es. indirizzo IP, timestamp,
                richieste HTTP) nei limiti necessari a sicurezza, anti-abuso e funzionamento del
                servizio.
                <em className="text-white/60"> Finalità: sicurezza, stabilità, prevenzione abusi,
                obblighi legittimi.</em>
              </li>
            </ul>
            <p className="mt-3">
              <strong>Base giuridica (Reg. UE 2016/679 — GDPR):</strong> esecuzione del contratto o
              di misure precontrattuali su richiesta dell&apos;interessato (uso del servizio di
              gioco); oppure interesse legittimo del titolare per sicurezza e prevenzione abusi, ove
              applicabile, nel rispetto dei diritti degli utenti.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">
              4. Destinatari e responsabili del trattamento
            </h2>
            <p>
              I dati sono ospitati su infrastrutture cloud. In particolare, per il funzionamento
              attuale del servizio possono essere coinvolti, in qualità di{' '}
              <strong>responsabili del trattamento</strong> o sub-responsabili, secondo i rispettivi
              contratti:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>
                <strong>Vercel Inc.</strong> — hosting dell&apos;applicazione web (e relative API).
              </li>
              <li>
                <strong>Neon</strong> (o altro fornitore PostgreSQL compatibile) — database per
                stanze, giocatori e stato di gioco.
              </li>
              <li>
                <strong>Pusher Ltd</strong> (o servizio equivalente) — canali in tempo reale per
                sincronizzare le azioni tra i client.
              </li>
            </ul>
            <p className="mt-2">
              L&apos;elenco può essere aggiornato: per informazioni aggiornate puoi scrivere
              all&apos;indirizzo email indicato al punto 1.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">
              5. Trasferimenti verso paesi extra-UE
            </h2>
            <p>
              Alcuni fornitori possono trattare dati in paesi al di fuori dello Spazio Economico
              Europeo. Ove avvenga, il trasferimento si basa su strumenti idonei (es. Clausole
              Contrattuali Standard approvate dalla Commissione Europea) o altre garanzie previste
              dal GDPR, come descritto nella documentazione dei rispettivi fornitori.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">6. Periodo di conservazione</h2>
            <p>
              I dati legati a una stanza e ai giocatori sono conservati per il tempo necessario a
              consentire la partita e, successivamente, per un periodo limitato legato alla
              manutenzione tecnica e alla pulizia automatica dei dati obsoleti (stanze concluse o
              inattive da tempo possono essere eliminate dal sistema).
            </p>
            <p className="mt-2">
              Non conserviamo un profilo utente permanente oltre quanto serve alla sessione di
              gioco e alla gestione tecnica del servizio, salvo diversi obblighi di legge o esigenze
              documentate di sicurezza.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">7. Cookie e tecnologie simili</h2>
            <p>
              Il servizio è pensato per funzionare come applicazione web e PWA. Possono essere usati
              cookie o storage locale strettamente necessari al funzionamento (es. preferenze di
              sessione o installazione PWA). Al momento non risulta integrato un sistema di
              profilazione pubblicitaria di terze parti nel codice pubblico del progetto; ove in
              futuro venissero introdotti strumenti di analytics o marketing, questa informativa
              sarà aggiornata e, ove richiesto, verrà richiesto il consenso.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">8. Minori</h2>
            <p>
              Il servizio non è diretto a minori di 13 anni (o all&apos;età minima prevista dalla
              legge applicabile). Se sei un genitore e ritieni che tuo figlio abbia fornito dati,
              contattaci all&apos;indirizzo email del titolare.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">9. Diritti degli interessati</h2>
            <p>
              In qualità di interessato, secondo il GDPR hai diritto di chiedere accesso ai dati che
              ti riguardano, rettifica, cancellazione, limitazione, portabilità (ove applicabile),
              opposizione (ove applicabile) e di proporre reclamo all&apos;autorità di controllo
              (in Italia: Garante per la protezione dei dati personali —{' '}
              <a
                href="https://www.garanteprivacy.it"
                className="text-purple-300 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.garanteprivacy.it
              </a>
              ).
            </p>
            <p className="mt-2">
              Per esercitare i diritti scrivi a{' '}
              <a href={`mailto:${TITOLARE.email}`} className="text-purple-300 underline">
                {TITOLARE.email}
              </a>
              . Alcuni dati di sessione potrebbero non essere associabili a una persona identificata
              oltre il nickname scelto per la singola partita: in tal caso potremmo chiederti
              elementi ragionevoli per verificare la richiesta senza richiedere più dati del
              necessario.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">10. Modifiche</h2>
            <p>
              Possiamo aggiornare questa informativa. La data di ultimo aggiornamento è indicata in
              alto. Ti invitiamo a consultarla periodicamente, in particolare prima di pubblicare
              l&apos;app sugli store.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10">
          <Link
            href="/"
            className="inline-flex items-center text-purple-300 font-semibold text-sm hover:text-pink-300"
          >
            Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}
