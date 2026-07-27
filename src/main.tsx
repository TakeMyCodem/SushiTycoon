import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Szándékosan nincs StrictMode: dev módban kétszer futtatná az effekteket,
// amitől két párhuzamos játékhurok indulna és dupla bevétel jönne.
createRoot(document.getElementById('root')!).render(<App />);

// PWA: csak prod buildben regisztráljuk, dev alatt csak zavarna a HMR-be.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
