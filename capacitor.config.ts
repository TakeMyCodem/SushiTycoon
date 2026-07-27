import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Ugyanaz a web build megy Androidra és iOS-re.
 *
 *   npm run build
 *   npx cap add android      (egyszer)
 *   npx cap add ios          (egyszer, csak macOS-en)
 *   npx cap sync
 *   npx cap open android
 */
const config: CapacitorConfig = {
  appId: 'com.sushiempire.idle',
  appName: 'Sushi Empire',
  webDir: 'dist',
  backgroundColor: '#0d0b1aff',
  android: {
    // A játék offline is működik, nincs szükség cleartext HTTP-re.
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'never',
  },
};

export default config;
