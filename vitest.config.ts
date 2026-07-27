import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// jsdom kell, mert a store.ts (és az általa importált audio.ts/monetization.ts)
// modul-betöltéskor localStorage-ot és window-ot olvas, nem csak függvényhíváskor.
// A react plugin a .tsx tesztekhez kell (pl. ErrorBoundary.test.tsx) — a fő
// vite.config.ts-ben van, de a vitest saját configot használ, nem örökli.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
});
