import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TreffpunktApp } from "@/components/faktor-app";
import { ErrorBoundary } from "@/lib/error-component";
import "./styles.css";

// Fonts load without blocking first paint (system fonts until they arrive, and
// offline before the service worker has cached them). CORS mode keeps the cached
// responses small.
const fonts = document.createElement("link");
fonts.rel = "stylesheet";
fonts.crossOrigin = "anonymous";
fonts.href =
  "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap";
document.head.appendChild(fonts);

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
