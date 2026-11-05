import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FPMS Caught React Error in Boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public handleClearSessionAndHome = () => {
    localStorage.removeItem('fpms_token');
    localStorage.removeItem('fpms_user');
    localStorage.removeItem('fpms_profile');
    localStorage.removeItem('fpms_department');
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] w-full p-6 my-4 bg-white border border-rose-200 rounded-xl shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">
            {this.props.fallbackTitle || 'A display issue occurred in this section'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mb-4">
            {this.state.error?.message ||
              'The view encountered an unexpected state. Your data is safe on the server.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReload}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Component</span>
            </button>
            <button
              onClick={this.handleClearSessionAndHome}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return to Public Home</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
