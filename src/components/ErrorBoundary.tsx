import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
    console.warn('Mifgash caught a rendering error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0B0F1A] text-[#F4F5FA] flex items-center justify-center p-6">
          <div className="bg-[#151B2B] border border-[#283149] p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#8B7CFF]/20 text-[#8B7CFF] border border-[#8B7CFF]/40 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-xl font-extrabold text-[#F4F5FA]">Something went wrong</h2>
            <p className="text-xs text-[#9AA4BB]">
              An unexpected error occurred while rendering. You can reload the workspace or reset session state.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full py-2.5 bg-[#8B7CFF] hover:bg-[#6D5CE7] text-white rounded-xl text-xs font-bold transition-all"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.clear();
                    window.location.reload();
                  } catch {
                    window.location.reload();
                  }
                }}
                className="w-full py-2.5 bg-[#1B2235] hover:bg-[#283149] text-[#9AA4BB] hover:text-[#F4F5FA] border border-[#283149] rounded-xl text-xs font-bold transition-all"
              >
                Reset App & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
