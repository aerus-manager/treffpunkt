import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TreffpunktApp } from "@/components/faktor-app";
import "./pages.css";

// Statisk inngang for GitHub Pages. Appen bruker hash-navigasjon og lagrer alt lokalt.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TreffpunktApp />
  </StrictMode>,
);
