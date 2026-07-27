import { beforeEach, describe, expect, it } from 'vitest';
import { applyLargeText, exportSave, importSave, isLargeText, toggleLargeText } from './settings';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.removeProperty('zoom');
});

describe('isLargeText / toggleLargeText', () => {
  it('is off by default', () => {
    expect(isLargeText()).toBe(false);
  });

  it('toggling flips the stored preference and returns the new value', () => {
    expect(toggleLargeText()).toBe(true);
    expect(isLargeText()).toBe(true);
    expect(toggleLargeText()).toBe(false);
    expect(isLargeText()).toBe(false);
  });

  it('persists across "reloads" (a fresh localStorage read reflects the last toggle)', () => {
    toggleLargeText();
    expect(localStorage.getItem('sushi-large-text')).toBe('1');
  });
});

describe('applyLargeText', () => {
  it('sets CSS zoom to 1.18 when on, and back to 1 when off', () => {
    applyLargeText(true);
    expect(document.documentElement.style.getPropertyValue('zoom')).toBe('1.18');
    applyLargeText(false);
    expect(document.documentElement.style.getPropertyValue('zoom')).toBe('1');
  });
});

describe('importSave / exportSave', () => {
  const KEY = 'sushi-empire-save-v2';

  it('importSave accepts valid JSON and writes it under the given key', () => {
    const ok = importSave(KEY, JSON.stringify({ money: 42 }));
    expect(ok).toBe(true);
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ money: 42 }));
  });

  it('importSave rejects malformed JSON without touching localStorage', () => {
    const ok = importSave(KEY, '{not valid json');
    expect(ok).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('importSave rejects a valid-JSON non-object (e.g. a bare number or null)', () => {
    expect(importSave(KEY, '42')).toBe(false);
    expect(importSave(KEY, 'null')).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('exportSave is a safe no-op when there is nothing saved yet', () => {
    expect(() => exportSave(KEY)).not.toThrow();
  });
});
