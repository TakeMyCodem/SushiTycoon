import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * No @testing-library here — the project doesn't otherwise need a component
 * test harness, so this uses plain react-dom/client + act() directly rather
 * than adding a dependency for one component.
 */
function Bomb(): never {
  throw new Error('boom');
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('ErrorBoundary', () => {
  it('renders children normally when nothing throws', () => {
    act(() => {
      root.render(<ErrorBoundary><div data-testid="ok">fine</div></ErrorBoundary>);
    });
    expect(container.textContent).toContain('fine');
  });

  it('catches a render error and shows the fallback instead of an empty page', () => {
    // React logs the error to console during the throw — expected noise, not a real failure.
    const originalError = console.error;
    console.error = () => {};
    act(() => {
      root.render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    });
    console.error = originalError;

    expect(container.textContent).toContain('Something broke');
    expect(container.querySelector('button')).not.toBeNull();
  });
});
