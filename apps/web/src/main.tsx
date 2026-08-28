import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[UFNS] Render error:', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: '#04070d', color: '#f87171', padding: '40px',
          fontFamily: 'monospace', fontSize: '13px', height: '100vh',
          whiteSpace: 'pre-wrap', overflowY: 'auto'
        }}>
          <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '16px', fontSize: '16px' }}>
            [System Alert] UFNS Render Error
          </div>
          <div style={{ color: '#f87171', marginBottom: '8px' }}>
            {this.state.error.name}: {this.state.error.message}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px' }}>
            {this.state.error.stack}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
