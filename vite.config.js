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
      // Enable Fast Refresh for instant updates
      fastRefresh: true,
      // Remove React DevTools in production
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
      // Disable auto-registration in development to prevent unwanted behaviors
      registerType:
        process.env.NODE_ENV === "production" ? "autoUpdate" : "prompt",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],

      // If you don't need a manifest, disable it completely
      manifest: false,

      // Explicitly disable injectRegister to prevent automatic service worker registration
      injectRegister: false,

      // Simple workbox configuration
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Disable navigation preload which can cause unexpected behaviors
        navigationPreload: false,
        // Clean up outdated caches
        cleanupOutdatedCaches: true,
        // Skip waiting to avoid version conflicts
        skipWaiting: false,
        clientsClaim: false,
        // Define runtime caching strategies
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
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
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },

      // Development options
      devOptions: {
        enabled: false, // Disable in dev
        type: "module", // Use module mode
        navigateFallback: false, // Disable fallback to prevent redirects
        suppressWarnings: true, // Suppress workbox warnings
      },

      // Explicitly disable features that might cause orientation messages
      strategies: "generateSW",
      includeManifestIcons: false,
      disable: false,

      // PWA minimal mode
      minify: true,
      // Don't inject any meta tags automatically
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
      overlay: false, // Disable overlay for faster HMR
    },
    warmup: {
      clientFiles: [
        // Pre-warm critical files
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
          // Smart chunk splitting
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
            return "vendor"; // Other dependencies
          }
        },
        // Smaller chunk names
        entryFileNames: "assets/[hash].js",
        chunkFileNames: "assets/[hash].js",
        assetFileNames: "assets/[hash].[ext]",
      },
    },
    // Critical optimizations
    chunkSizeWarningLimit: 500, // Smaller chunks
    cssCodeSplit: true,
    cssMinify: true,
    reportCompressedSize: false,
    // Generate preload directives
    modulePreload: {
      polyfill: false,
      resolveDependencies: (filename, deps, { hostId, hostType }) => {
        // Always preload React
        if (filename.includes("vendor-react")) {
          return deps;
        }
        return [];
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
    exclude: ["@vitejs/plugin-react-swc"],
    force: process.env.NODE_ENV === "development",
  },
  esbuild: {
    // Drop debugger and console in production
    drop: process.env.NODE_ENV === "production" ? ["debugger", "console"] : [],
  },
});
