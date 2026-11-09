import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TreffpunktApp } from "@/components/faktor-app";
import { ErrorBoundary } from "@/lib/error-component";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <TreffpunktApp />
    </ErrorBoundary>
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
