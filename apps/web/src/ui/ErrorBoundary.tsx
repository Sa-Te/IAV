import { Component, type ErrorInfo, type ReactNode } from "react";

import { log } from "./logBuffer.js";

/**
 * The app-root boundary. React errors do not reach `window.error`, so without
 * this the only record of a render crash is a blank screen and a console entry
 * the user cannot copy.
 */
export class ErrorBoundary extends Component<
  { readonly children: ReactNode },
  { readonly failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    log({
      level: "error",
      source: "react",
      message: error.message,
      ...(error.stack === undefined ? {} : { stack: error.stack }),
    });
    const componentStack = info.componentStack;
    if (componentStack !== null && componentStack !== undefined) {
      log({ level: "error", source: "react", message: componentStack });
    }
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="gallery" role="alert">
        <h1>Something went wrong</h1>
        <p>This view crashed. The error is recorded in the dev log.</p>
      </div>
    );
  }
}
