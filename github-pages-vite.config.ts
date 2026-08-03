import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const publicAssetPrefixes = [
  "banner", "dress-code", "favicon", "file.svg", "fonts/", "gifts/", "globe.svg",
  "hearts-", "hero-", "logo-", "og.png", "rabbits-", "rsvp-", "wedding-", "window.svg",
];

export default defineConfig({
  root: "github-pages",
  base: "/MyG/",
  publicDir: "../public",
  plugins: [
    react(),
    {
      name: "github-pages-public-paths",
      enforce: "pre",
      transform(code, id) {
        if (id.endsWith("app/page.tsx")) {
          return publicAssetPrefixes.reduce(
            (result, prefix) => result.replaceAll(`\"/${prefix}`, `\"/MyG/${prefix}`),
            code,
          );
        }
        if (id.endsWith("app/globals.css")) {
          return code.replaceAll('url("/', 'url("/MyG/');
        }
        return null;
      },
    },
  ],
  build: {
    outDir: "../github-pages-dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "github-pages/index.html"),
        admin: resolve(__dirname, "github-pages/admin/index.html"),
      },
    },
  },
});
