import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@beyond/contracts": fileURLToPath(
        new URL("../packages/contracts/src/index.ts", import.meta.url),
      ),
      "@beyond/product-catalog": fileURLToPath(
        new URL("../packages/product-catalog/src/index.ts", import.meta.url),
      ),
      tslib: fileURLToPath(new URL("./src/shims/tslib.ts", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
  },
});
