import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  base: "/", // ADD THIS LINE - CRITICAL FOR VERCEl

  plugins: [
    react({
      fastRefresh: true,
      removeDevtoolsInProd: true,
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["delish-logo.svg"],
      manifest: {
        name: "Delish Restaurant POS",
        short_name: "Delish POS",
        description: "Delish Restaurant Point of Sale System",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        id: "/",
        icons: [
          {
            src: "delish-logo.svg",
            sizes: "192x192 512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
        shortcuts: [
          {
            name: "New Order",
            short_name: "Order",
            description: "Create a new order",
            url: "/orders",
          },
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "View dashboard",
            url: "/",
          },
          {
            name: "Menu",
            short_name: "Menu",
            description: "View menu items",
            url: "/menu",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: false,
    },
    warmup: {
      clientFiles: [
        "./src/main.tsx",
        "./src/App.tsx",
        "./src/components/Dashboard.tsx",
      ],
    },
  },
  build: {
    target: "es2020",
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.debug"],
        passes: 3,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) {
              return "vendor-react";
            }
            if (id.includes("@reduxjs") || id.includes("react-redux")) {
              return "vendor-redux";
            }
            if (id.includes("@chakra-ui") || id.includes("framer-motion")) {
              return "vendor-ui";
            }
            if (
              id.includes("axios") ||
              id.includes("lodash") ||
              id.includes("date-fns")
            ) {
              return "vendor-utils";
            }
            return "vendor";
          }
        },
        entryFileNames: "assets/[hash].js",
        chunkFileNames: "assets/[hash].js",
        assetFileNames: "assets/[hash].[ext]",
      },
    },
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
    cssMinify: true,
    reportCompressedSize: false,
    copyPublicDir: true,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
    exclude: ["@vitejs/plugin-react-swc"],
    force: process.env.NODE_ENV === "development",
  },
  esbuild: {
    drop: process.env.NODE_ENV === "production" ? ["debugger", "console"] : [],
  },
});
