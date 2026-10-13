import { Component, ReactNode, Suspense } from 'react';
import { retryArtwork } from '../artwork/library';

class ErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { error?: Error }
> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(previous: Readonly<{ children: ReactNode; resetKey: string }>) {
    if (previous.resetKey !== this.props.resetKey && this.state.error)
      this.setState({ error: undefined });
  }
  render() {
    if (this.state.error)
      return (
        <section role="alert" className="preview-recovery">
          <h2>Preview could not be rendered</h2>
          <p>{this.state.error.message}</p>
          <p>Your saved profile is kept. Check the fields or retry the preview.</p>
          <button
            className="button"
            onClick={() => {
              retryArtwork();
              this.setState({ error: undefined });
            }}
          >
            Retry preview
          </button>
        </section>
      );
    return this.props.children;
  }
}

export function PreviewBoundary({ children, resetKey }: { children: ReactNode; resetKey: string }) {
  return (
    <ErrorBoundary resetKey={resetKey}>
      <Suspense
        fallback={
          <div className="preview-recovery" role="status">
            Loading preview resources…
          </div>
        }
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
