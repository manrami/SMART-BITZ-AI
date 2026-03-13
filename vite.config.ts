import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean,
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Ensure a single copy of react is used across all deps (prevents context conflicts)
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    // Force Vite to pre-bundle these so they share one React context instance
    include: ["leaflet", "react-leaflet"],
  },
}));

