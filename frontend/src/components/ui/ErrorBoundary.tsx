import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props  { children: ReactNode; fallback?: ReactNode; }
interface State  { hasError: boolean; message: string; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', err, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback)  return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-16 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200/80 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-red-600" />
        </div>
        <h3 className="text-[16px] font-black text-slate-900 mb-1">Something went wrong</h3>
        <p className="text-[13px] text-slate-500 mb-5 max-w-[360px]">
          An unexpected error occurred. Please refresh the page.
        </p>
        <button
          onClick={() => this.setState({ hasError: false, message: '' })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200/80 bg-white/90 hover:bg-slate-50 text-slate-700 font-bold text-[13px] transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </div>
    );
  }
}
