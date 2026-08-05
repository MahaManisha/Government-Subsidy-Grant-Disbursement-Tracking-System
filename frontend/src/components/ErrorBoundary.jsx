import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4">
          <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-black text-slate-800">{this.props.fallbackMessage || "An unexpected error occurred."}</h2>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
            {this.state.error?.message || "The application encountered a rendering failure."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onRetry) {
                this.props.onRetry();
              } else {
                window.location.reload();
              }
            }}
            className="mt-4 inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
