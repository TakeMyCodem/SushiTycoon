import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages a repo nevét alkönyvtárként szolgálja ki
  // (takemycodem.github.io/SushiTycoon/) — a natív (Capacitor) buildhez
  // viszont gyökér-relatív útvonal kell, ezért csak a Pages workflow
  // kapcsolja be a GH_PAGES env-et.
  base: process.env.GH_PAGES ? '/SushiTycoon/' : '/',
})
