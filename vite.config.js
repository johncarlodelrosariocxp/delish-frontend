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
      // Fix: Ensure proper JSX handling
      jsxImportSource: "react",
      // Enable Fast Refresh for instant updates
      fastRefresh: process.env.NODE_ENV === "development",
      // Remove React DevTools in production
      removeDevtoolsInProd: process.env.NODE_ENV === "production",
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
              // Fix for Vary: Origin warning
              matchOptions: {
                ignoreVary: true,
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
              // Fix for Vary: Origin warning
              matchOptions: {
                ignoreVary: true,
              },
            },
          },
          // Add for JS/CSS files to fix warnings
          {
            urlPattern: /\.(?:js|css|mjs)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
              matchOptions: {
                ignoreVary: true,
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
      // Fix: Force single React instance to prevent Children error
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(
        __dirname,
        "node_modules/react/jsx-runtime"
      ),
      "react/jsx-dev-runtime": path.resolve(
        __dirname,
        "node_modules/react/jsx-dev-runtime"
      ),
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
    sourcemap: process.env.NODE_ENV === "development", // Enable in dev for debugging
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === "production",
        drop_debugger: process.env.NODE_ENV === "production",
        pure_funcs:
          process.env.NODE_ENV === "production"
            ? ["console.log", "console.debug"]
            : [],
        passes: 2, // Reduced for faster builds
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Smart chunk splitting - ensure React stays together
          if (id.includes("node_modules")) {
            // Group React core together
            if (
              id.includes("node_modules/react") ||
              id.includes("node_modules/react-dom") ||
              id.includes("node_modules/scheduler") ||
              id.includes("react/jsx-runtime")
            ) {
              return "vendor-react";
            }
            if (id.includes("@reduxjs") || id.includes("react-redux")) {
              return "vendor-redux";
            }
            // Group Ant Design and its dependencies
            if (
              id.includes("antd") ||
              id.includes("@ant-design") ||
              id.includes("rc-")
            ) {
              return "vendor-antd";
            }
            if (id.includes("framer-motion")) {
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
        // Better naming for debugging
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
      },
    },
    // Critical optimizations
    chunkSizeWarningLimit: 800, // Increased to avoid warnings
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
    // Fix: Include all React runtime dependencies
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    exclude: ["@vitejs/plugin-react-swc"],
    force: false, // Don't force unless needed
  },
  esbuild: {
    // Drop debugger and console in production
    drop: process.env.NODE_ENV === "production" ? ["debugger", "console"] : [],
    // Ensure proper JSX transformation
    jsx: "automatic",
    jsxDev: process.env.NODE_ENV === "development",
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    __VITE_PWA_ENABLED__: JSON.stringify(process.env.NODE_ENV === "production"),
  },
});
