import React, { Component, ReactNode } from 'react';
import logger from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('❌ React Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
          <div className="max-w-md rounded-lg border border-red-500/50 bg-gray-800 p-6 text-center">
            <h1 className="mb-4 text-2xl font-bold text-red-500">Something went wrong</h1>
            <p className="mb-4 text-gray-300">
              An unexpected error occurred. Please refresh the page to try again.
            </p>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details className="mt-4 text-left text-sm text-gray-400">
                <summary className="cursor-pointer text-red-400">Error details</summary>
                <pre className="mt-2 overflow-auto rounded bg-gray-900 p-2">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

