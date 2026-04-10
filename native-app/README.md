# Lupo Games — shell nativa (store)

Questa cartella **non sostituisce** la web app in `../` (Next.js). E' solo un **involucro nativo** che apre la stessa app pubblicata su internet dentro un WebView: **stessa grafica, stessa logica, stessi giochi**, senza duplicare codice.

## Perche Capacitor e non Flutter

| Approccio | Cosa fa | Adatto a Lupo Games |
|-----------|---------|---------------------|
| **Capacitor** (questo progetto) | Incapsula l'URL di produzione (es. Vercel) in un'app iOS/Android | Si: zero riscrittura |
| **Flutter** | Riscrivi UI e logica in Dart | No per "tutto uguale subito": sarebbe un progetto nuovo enorme |

Se un giorno vorrai un'app **100% nativa** Flutter, sara un lavoro separato; qui restiamo allineati alla web app.

## Prerequisiti

- Node.js + npm (sulla macchina dove compili)
- **iOS**: Mac con Xcode, account Apple Developer (per App Store)
- **Android**: Android Studio, JDK, account Google Play Console

## Configurazione

1. Entra nella cartella:

   ```bash
   cd native-app
   ```

2. Copia l'esempio delle variabili e imposta l'URL **HTTPS** del deploy (stesso dominio della PWA):

   ```bash
   cp .env.example .env
   ```

   Modifica `CAPACITOR_SERVER_URL` con l'URL reale (es. `https://tuoprogetto.vercel.app` o dominio custom).

3. Installa le dipendenze:

   ```bash
   npm install
   ```

4. **Prima volta sola** — genera i progetti nativi:

   ```bash
   npx cap add ios
   npx cap add android
   ```

5. Sincronizza config e cartella `www` nei progetti nativi:

   ```bash
   npx cap sync
   ```

6. Apri gli IDE:

   ```bash
   npm run open:ios      # Xcode
   npm run open:android  # Android Studio
   ```

Dopo ogni cambio a `capacitor.config.ts` o a `.env`, riesegui `npx cap sync`.

## Bundle ID e nome in store

- In `capacitor.config.ts`: `appId` (`com.thewolf.lupogames`) — cambialo con **il tuo** identificatore univoco prima della pubblicazione.
- In Xcode / Android Studio verifica anche nome visualizzato, icone e splash (puoi riusare le stesse risorse di `public/` della web app).

## Note App Store / Play Store

- Apple valuta le app che sono soprattutto un sito in WebView: l'app deve offrire **valore** (es. party game in tempo reale va bene se funziona bene e non e "solo un bookmark"). Segui le linee guida attuali.
- L'app deve caricare solo **HTTPS** (gia impostato con `cleartext: false`).
- **Offline**: senza rete la web app non funziona; e coerente con un party game online.

## Comandi utili

| Comando | Effetto |
|---------|---------|
| `npm run sync` | `cap sync` |
| `npm run ios` | sync + apre Xcode |
| `npm run android` | sync + apre Android Studio |
