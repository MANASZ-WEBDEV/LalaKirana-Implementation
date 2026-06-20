import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f6fafd',
          textAlign: 'center',
        }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#ba1a1a', marginBottom: '1rem' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#3d4948', marginBottom: '1.5rem', maxWidth: '400px' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#006763',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Retry & Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
