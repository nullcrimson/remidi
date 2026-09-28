import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';
import { ProseLink } from './ProseLink';
import { TextButton } from './TextButton';

const ISSUES_URL = 'https://github.com/nullcrimson/remidi/issues';
const STORAGE_PREFIX = 'midiremap:';

function clearSavedData() {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    for (const key of keys) if (key?.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key);
  } catch {
    void 0;
  }
}

function Fallback({ message, onReload }: { message: string; onReload: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="
      flex min-h-screen items-start justify-center bg-page px-5 pt-[12vh]
    "
    >
      <main className="
        flex w-140 max-w-full flex-col gap-4 rounded-card border border-hairline
        bg-card p-6
      "
      >
        <h1 className="font-display text-brand font-semibold text-t1">Something went wrong</h1>
        <p className="text-ui text-t4">
          The converter hit an error it could not recover from. Reloading usually fixes it; if it
          keeps happening, a saved preset may be damaged.
        </p>
        <p className="font-mono text-caption wrap-break-word text-monodim">{message}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Button variant="primary" size="md" onClick={onReload}>Reload</Button>
          <ProseLink href={ISSUES_URL}>Report an issue</ProseLink>
          {!confirming && (
            <TextButton onClick={() => setConfirming(true)}>Reset saved data…</TextButton>
          )}
        </div>
        {confirming && (
          <div className="flex flex-col gap-3 rounded-chip bg-danger/10 p-3">
            <p className="text-ui text-danger">Delete saved presets, favourites and settings?</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  clearSavedData();
                  onReload();
                }}
              >
                Delete and reload
              </Button>
              <TextButton onClick={() => setConfirming(false)}>Cancel</TextButton>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

interface Props {
  children: ReactNode;
  onReload?: () => void;
}

/** Shows a way forward instead of a blank page when rendering throws. */
export class ErrorBoundary extends Component<Props, { error: unknown }> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.error === null) return this.props.children;
    return (
      <Fallback
        message={String(this.state.error)}
        onReload={this.props.onReload ?? (() => window.location.reload())}
      />
    );
  }
}
