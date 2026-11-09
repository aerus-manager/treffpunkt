import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Statisk bygg for GitHub Pages (https://aerus-manager.github.io/treffpunkt/).
// Bruker ikke TanStack Start/Nitro; appen er ren klientside med hash-ruting.
const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL("./pages", import.meta.url)),
  base: process.env.PAGES_BASE ?? "/treffpunkt/",
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  resolve: { alias: { "@": src } },
  plugins: [tailwindcss(), viteReact()],
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
  },
});
