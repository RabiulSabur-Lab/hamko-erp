import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}] Uncaught error:`, error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  private handleClearAndRestart = () => {
    try {
      // Clear session/cache keys but keep vital data if possible
      sessionStorage.clear();
    } catch (e) {
      console.warn("Storage clear notice:", e);
    }
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || "An unexpected error occurred";

      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background text-foreground">
          <div className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-xl p-6 md:p-8 space-y-6 text-center">
            {/* Header Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-inner">
              <AlertTriangle className="h-8 w-8 animate-pulse" />
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Something went wrong
              </h2>
              <p className="text-sm text-muted-foreground">
                একটি অপ্রত্যাশিত সমস্যা দেখা দিয়েছে। অ্যাপলিকেশনটি নিরাপদে রিলোড বা হোম পেজে ফিরে যেতে পারেন।
              </p>
            </div>

            {/* Error Message Summary */}
            <div className="rounded-lg bg-muted/60 p-3 text-left border border-border/60">
              <p className="text-xs font-mono text-destructive break-words line-clamp-3">
                {errorMessage}
              </p>
            </div>

            {/* Technical Details Accordion */}
            {this.state.error && (
              <div className="text-left">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  {this.state.showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {this.state.showDetails ? "Hide error details" : "Show technical details"}
                </button>
                {this.state.showDetails && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-md bg-muted/80 p-3 text-[11px] font-mono text-muted-foreground border border-border/40 whitespace-pre-wrap select-all">
                    <p className="font-semibold text-foreground mb-1">{this.state.error.toString()}</p>
                    {this.state.errorInfo?.componentStack || this.state.error.stack}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Application
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </button>
            </div>

            <div className="pt-1 border-t border-border/40">
              <button
                type="button"
                onClick={this.handleClearAndRestart}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Clear Session & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
