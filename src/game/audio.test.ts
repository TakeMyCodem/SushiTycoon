import { describe, expect, it } from 'vitest';
import { isMuted, isVibeOn, toggleMute, toggleVibe } from './audio';

// audio.ts reads localStorage once at MODULE LOAD time into module-level
// `let` variables (so the AudioContext lazily created later stays in sync
// without re-checking storage every call) — meaning these tests only ever
// observe *relative* toggles from whatever the module's initial state was,
// not an absolute "starts muted" claim, and there's no reset-to-fresh hook.

describe('toggleMute / isMuted', () => {
  it('flips and returns the new value, matching isMuted() afterwards', () => {
    const before = isMuted();
    const returned = toggleMute();
    expect(returned).toBe(!before);
    expect(isMuted()).toBe(!before);
    toggleMute(); // flip back, so this test doesn't leak state into others
    expect(isMuted()).toBe(before);
  });

  it('persists the new value to localStorage', () => {
    toggleMute();
    expect(localStorage.getItem('sushi-muted')).toBe(isMuted() ? '1' : '0');
    toggleMute(); // restore
  });
});

describe('toggleVibe / isVibeOn', () => {
  it('flips and returns the new value, matching isVibeOn() afterwards', () => {
    const before = isVibeOn();
    const returned = toggleVibe();
    expect(returned).toBe(!before);
    expect(isVibeOn()).toBe(!before);
    toggleVibe(); // flip back
    expect(isVibeOn()).toBe(before);
  });

  it('persists the new value to localStorage', () => {
    toggleVibe();
    expect(localStorage.getItem('sushi-vibe')).toBe(isVibeOn() ? '1' : '0');
    toggleVibe(); // restore
  });
});
