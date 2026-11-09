import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { serviceWorkerPlugin } from "./pwa/vite-plugin-sw";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [react(), tailwindcss(), serviceWorkerPlugin(root)],
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
