import { defineConfig } from 'vitest/config';

// jsdom kell, mert a store.ts (és az általa importált audio.ts/monetization.ts)
// modul-betöltéskor localStorage-ot és window-ot olvas, nem csak függvényhíváskor.
export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
