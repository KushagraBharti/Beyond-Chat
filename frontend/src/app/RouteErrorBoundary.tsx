import { Component, type ErrorInfo, type ReactNode } from "react";

export class RouteErrorBoundary extends Component<{ readonly children: ReactNode }, { readonly error: Error | null }> {
  state: { readonly error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Workspace route failed", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <main className="route-fallback" role="alert"><div className="route-fallback-card"><strong>This workspace view could not be loaded.</strong><span>Your request was not completed. Reload the page to retry.</span><button type="button" onClick={() => window.location.reload()}>Reload</button></div></main>;
  }
}
