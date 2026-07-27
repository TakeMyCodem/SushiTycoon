/**
 * Hozzáférhetőségi és mentés-beállítások (Nap 4, lásd docs/HETI-TERV.md).
 *
 * Szándékosan localStorage-alapú, state-en kívüli modul — ez nem játékadat,
 * hanem eszköz/preferencia, aminek nem kell túlélnie a `hardReset`-et vagy
 * megjelennie az exportált mentésben.
 */

const LARGE_TEXT_KEY = 'sushi-large-text';

export function isLargeText(): boolean {
  return localStorage.getItem(LARGE_TEXT_KEY) === '1';
}

/** A `zoom` nem szabványos CSS, de a célplatformokon (Chrome/Android WebView,
 * Capacitor) jól működik, és fixed-pozíciós elemeket (navigáció, képességsáv)
 * is helyesen skáláz — ellentétben a `transform: scale`-lel. iOS Safarin
 * egyszerűen nem csinál semmit, ami elfogadható visszaesés. */
export function applyLargeText(on: boolean) {
  document.documentElement.style.setProperty('zoom', on ? '1.18' : '1');
}

export function toggleLargeText(): boolean {
  const next = !isLargeText();
  localStorage.setItem(LARGE_TEXT_KEY, next ? '1' : '0');
  applyLargeText(next);
  return next;
}

/** Mentés exportálása fájlba — a beállítások képernyő adja vissza a játékosnak
 * a kontrollt a saját mentése felett, telefoncsere vagy törlés előtt. */
export function exportSave(saveKey: string) {
  const raw = localStorage.getItem(saveKey);
  if (!raw) return;
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sushi-empire-save-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Mentés visszatöltése fájlból. Csak alapszintű alak-ellenőrzés — a
 * `loadState` a store-ban úgyis a friss alapértékekre húzza rá a mezőket. */
export function importSave(saveKey: string, json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) return false;
    localStorage.setItem(saveKey, json);
    return true;
  } catch {
    return false;
  }
}
