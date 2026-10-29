import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "node:path";

// Plain static single-page app: host the `dist` folder on any static host.
// Set VITE_BASE (e.g. "/electrolysis-scheduler-web/") when serving from a sub-path such as GitHub Pages.
export default defineConfig({
  base: process.env["VITE_BASE"] ?? "/",
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { port: 8080, host: true },
});
