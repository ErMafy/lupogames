# Lupo Games — testi per App Store e Google Play

Lingua principale: **italiano**. Adatta nome visualizzato e URL se usi un dominio custom.

---

## Google Play Console

### Titolo app (max 30 caratteri)

```
Lupo Games
```

### Breve descrizione (max 80 caratteri)

```
Party game sul telefono: stanze private, minigiochi e classifiche in tempo reale.
```

*(78 caratteri)*

### Descrizione completa (max 4000 caratteri)

```
Lupo Games è il party game da fare tutti insieme, ognuno con il proprio smartphone. Crea una stanza, condividi il codice e gioca minigiochi sincronizzati in tempo reale: domande a risposta multipla, continua la frase, segreti e votazioni, e altre sfide pensate per ridere e competere in gruppo.

COSA PUOI FARE
• Crea o entra in una stanza con un codice a quattro lettere
• Scegli avatar e colore per riconoscerti in partita
• L’host avvia i minigiochi: tutti vedono le stesse fasi sul telefono
• Classifica e punteggi aggiornati durante la serata
• Esperienza ottimizzata per mobile: gioca in verticale, in salotto o in giro

A CHI E' RIVOLTO
Per gruppi di amici, famiglie e serate in cui volete qualcosa di semplice da avviare senza console o giochi da tavolo complessi. Serve una connessione internet stabile: i round e gli aggiornamenti arrivano in tempo reale.

REQUISITI
Connessione a internet attiva. Alcune funzioni possono richiedere permessi del browser o dell’app (notifiche, se le abiliti in futuro).

SUPPORTO E PRIVACY
Per assistenza e informativa sulla privacy consulta il sito indicato nello store o nella scheda dell’app. I dati di gioco sono legati alla sessione e al funzionamento del servizio come descritto nell’informativa.

Divertiti, rispetta gli altri giocatori e buona serata con Lupo Games.
```

### Note per la scheda Play (da compilare tu nella console)

- **Categoria suggerita:** Giochi / Casual o Party.
- **Contenuti:** valuta età in base a testi generati dagli utenti nei minigiochi (se presenti); molti store classificano 12+ o 17+ se c’è contenuto user-generated senza filtri aggressivi. Allinea la valutazione alla tua moderazione reale.
- **Dichiarazione sui dati (Data safety):** indica raccolta di dati che effettivamente fai (account stanza, nomi giocatori, eventuali log tecnici, crash analytics se li aggiungi). Coerente con la tua privacy policy pubblica.
- **Privacy policy:** URL obbligatorio — deve essere raggiungibile e descrivere trattamento dati e contatti.

---

## Apple App Store Connect

### Nome app (max 30 caratteri)

```
Lupo Games
```

### Sottotitolo (max 30 caratteri)

```
Party game in tempo reale
```

*(28 caratteri)*

### Testo promozionale (max 170 caratteri, modificabile senza nuova versione)

```
Serata con amici? Crea una stanza, condividi il codice e lancia minigiochi sincronizzati su tutti i telefoni. Classifiche, round veloci e zero complicazioni: tutto dal browser integrato, stessa esperienza della web app.
```

*(169 caratteri)*

### Descrizione (max 4000 caratteri)

```
Lupo Games trasforma la serata in un party game collettivo: ogni partecipante usa il proprio iPhone o iPad, mentre minigiochi e risultati si aggiornano in tempo reale.

COME FUNZIONA
Crea o entra in una stanza con un codice semplice, scegli avatar e nome, e segui le istruzioni dell’host. Quando inizia un minigioco, tutti ricevono le stesse fasi e i punteggi si aggiornano sulla classifica. Ideale per gruppi che vogliono ridere, sfidarsi e passare la serata senza preparazione complessa.

CARATTERISTICHE
• Stanze private con codice
• Vari minigiochi in sequenza, pensati per gruppo
• Interfaccia mobile-first, pensata per una mano e schermi piccoli
• Stato di gioco sincronizzato: meno attese, più azione

REQUISITI
Connessione internet necessaria durante la partita. L’esperienza è ottimizzata per iOS; per prestazioni migliori usa una rete Wi‑Fi o dati stabili.

Lupo Games è pensato per un uso sociale e responsabile. Rispetta le altre persone in stanza e le linee guida della community.

Per privacy, cookie (se applicabili) e diritti degli utenti, consulta l’informativa sul sito collegato dall’app.
```

### Parole chiave (max 100 caratteri, separate da virgola, senza spazi dopo la virgola)

```
party game,multiplayer,quiz,amici,serata,locale,minigiochi,gruppo,sync
```

*(circa 70 caratteri — puoi aggiungere altre parole pertinenti fino al limite)*

### URL di supporto (obbligatorio)

```
https://TUO-DOMINIO.it/supporto
```

*(Sostituisci con una pagina reale: email, FAQ o modulo contatti.)*

### URL marketing (opzionale)

```
https://TUO-DOMINIO.it
```

### URL privacy policy (obbligatorio)

Dopo il deploy, usa la pagina già presente nel progetto:

```
https://TUO-DOMINIO.it/privacy
```

(Il testo legale è in `src/app/privacy/page.tsx`; aggiorna la costante `TITOLARE` con nome, indirizzo e email reali.)

### Note per la revisione Apple (campo “Note per il revisore”)

```
Lupo Games è un party game online: l’app apre in WebView l’istanza web in produzione su HTTPS (stesso prodotto della PWA). Funzionalità: creazione/ingresso stanza, minigiochi sincronizzati, classifiche. Account di test non necessario per la navigazione base; per provare una partita completa servono almeno due dispositivi o due browser con codice stanza condiviso.

URL produzione: https://TUO-DOMINIO
Privacy policy: https://TUO-DOMINIO/privacy
```

### Scheda privacy App (App Privacy)

Compila in base al trattamento reale. Indicazioni tipiche per un’app di questo tipo (verifica con il tuo legale e il codice):

- **Dati collegati all’utente:** es. identificativi di sessione stanza, nome giocatore, eventuali ID tecnici.
- **Scopo:** funzionalità app, analisi solo se usi strumenti analytics.
- **Tracking:** “No” se non usi tracking cross-app come definito da Apple.
- Allinea ogni voce alla privacy policy pubblicata.

---

## Testo “Novità di questa versione” (entrambi gli store, esempio v1.0)

```
Prima pubblicazione su store. Party game in tempo reale: stanze private, minigiochi e classifiche. Stessa esperienza della web app Lupo Games in versione installabile.
```

---

## Checklist prima dell’invio

1. Sostituire tutti i `https://TUO-DOMINIO` con URL reali e attivi.
2. Pubblicare **privacy policy** e **supporto** (anche pagine minime ma chiare).
3. Screenshot: usa dispositivi reali o simulatori con UI aggiornata (home, stanza, un minigioco, classifica).
4. Icona 1024×1024 (Apple) e set icone Play come da linee guida.
5. Allineare età e contenuti alla presenza di testo libero dei giocatori nei minigiochi.

---

*Documento informativo: non sostituisce consulenza legale per privacy, classificazione dei contenuti o termini di servizio.*
