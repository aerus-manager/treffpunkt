import { Component, type ErrorInfo, type ReactNode } from "react";
import { Download, TriangleAlert } from "lucide-react";
import { downloadBackup } from "@/lib/backup-file";

type State = { error: Error | null };

/** Last line of defence: shows a Norwegian error page instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Treffpunkt crashed", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
        <TriangleAlert className="size-10 text-miss" strokeWidth={2} aria-hidden="true" />
        <h1 className="text-lg font-semibold">Noe gikk galt</h1>
        <p className="max-w-md text-sm break-words text-muted">
          {this.state.error.message || "Prøv å laste siden på nytt."}
        </p>
        <p className="max-w-md text-sm text-muted">
          Dagboken din er lagret på enheten og er ikke borte.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="h-11 rounded-full bg-brass px-5 font-semibold text-brass-ink"
            onClick={() => {
              window.location.hash = "";
              window.location.reload();
            }}
          >
            Last inn på nytt
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm"
            onClick={() => {
              try {
                downloadBackup();
              } catch {
                /* nothing more we can do here */
              }
            }}
          >
            <Download className="size-4" aria-hidden="true" />
            Last ned sikkerhetskopi
          </button>
        </div>
      </main>
    );
  }
}
