import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

/** Emits sw.js with the full list of built files, versioned by their content hashes. */
export function serviceWorkerPlugin(root: string): Plugin {
  return {
    name: "treffpunkt:service-worker",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter(
        (file) => !file.endsWith(".map") && file !== "index.html",
      );
      const publicFiles = readdirSync(join(root, "public"));
      const files = ["/index.html", ...[...publicFiles, ...built].map((file) => `/${file}`)].sort();
      const html = bundle["index.html"];
      const htmlSource = html && html.type === "asset" ? String(html.source) : "";
      const version = createHash("sha256")
        .update(files.join("\n"))
        .update(htmlSource)
        .digest("hex")
        .slice(0, 12);
      const template = readFileSync(join(root, "pwa/sw.js"), "utf8");
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: `const VERSION = ${JSON.stringify(version)};\nconst PRECACHE = ${JSON.stringify(files)};\n${template}`,
      });
    },
  };
}
