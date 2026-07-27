import { Component, type ErrorInfo, type ReactNode } from 'react';
import { SAVE_KEY } from '../game/config';
import { track } from '../game/analytics';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Utolsó védővonal: ha bármelyik komponens render közben eldob egy hibát
 * (pl. egy sérült importált mentés miatt), React enélkül az EGÉSZ fát
 * leszereli — a játékos üres fehér oldalt kap, nulla visszatérési úttal.
 * A mentés maga localStorage-ban biztonságban marad, csak nem érné el.
 *
 * Class component: a `componentDidCatch`/`getDerivedStateFromError` ma is
 * csak így írható meg, function componentből nincs hook-megfelelője.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    track('render_error', { message: error.message, stack: error.stack?.slice(0, 500) });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="overlay">
        <div className="sheet sheet-center">
          <div className="offline-art">🍙💥</div>
          <h2>Something broke</h2>
          <p className="muted small">
            Sorry about that — the game hit an unexpected error. Your save is safe on this
            device; reloading usually fixes it.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => location.reload()}>
            Reload
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (confirm('Reset your save and reload? This cannot be undone — only do this if reloading alone did not help.')) {
                localStorage.removeItem(SAVE_KEY);
                location.reload();
              }
            }}
          >
            Reset save & reload
          </button>
        </div>
      </div>
    );
  }
}
