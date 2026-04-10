import type { CapacitorConfig } from '@capacitor/cli';
import 'dotenv/config';

/**
 * Shell nativa: carica la stessa web app di produzione nel WebView.
 * Grafica e logica restano quelle di Next.js / Pusher / Prisma lato server.
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.replace(/\/$/, '') ||
  'https://REPLACE_WITH_YOUR_VERCEL_URL';

const config: CapacitorConfig = {
  appId: 'com.thewolf.lupogames',
  appName: 'Lupo Games',
  webDir: 'www',
  server: {
    url: serverUrl,
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0A1B',
    },
  },
};

export default config;
