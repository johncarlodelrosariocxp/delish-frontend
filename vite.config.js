import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import compression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";
import { splitVendorChunkPlugin } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
      removeDevtoolsInProd: true,
    }),
    splitVendorChunkPlugin(),
    compression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024,
      deleteOriginFile: false,
    }),
    compression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024,
    }),
    VitePWA({
      registerType:
        process.env.NODE_ENV === "production" ? "autoUpdate" : "prompt",

      // Include all public assets
      includeAssets: ["delish-logo.svg", "favicon.ico", "manifest.json"],

      // Generate proper manifest
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
        globPatterns: ["**/*.{js,css,html,ico,svg,json,png,jpg,jpeg,gif,webp}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigationPreload: false,
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },

      devOptions: {
        enabled: false,
        type: "module",
        navigateFallback: false,
        suppressWarnings: true,
      },

      strategies: "generateSW",
      includeManifestIcons: false,
      disable: false,
      minify: true,
      injectManifest: {
        injectionPoint: undefined,
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
    modulePreload: {
      polyfill: false,
      resolveDependencies: (filename, deps, { hostId, hostType }) => {
        if (filename.includes("vendor-react")) {
          return deps;
        }
        return [];
      },
    },
    // Copy public directory files to dist
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
