import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  // FIXED: Add base for relative paths on Vercel/Netlify
  base: "./",
  plugins: [
    react(),
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
      registerType: "autoUpdate",
      includeAssets: ["delish-logo.png", "delish-logo.svg", "favicon.ico"],
      manifest: {
        name: "Delish POS",
        short_name: "Delish POS",
        description: "Delish Restaurant Point of Sale System",
        theme_color: "#2563eb",
        background_color: "#f3f4f6",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/delish-logo-152.png",
            sizes: "152x152",
            type: "image/png",
          },
          {
            src: "/delish-logo-167.png",
            sizes: "167x167",
            type: "image/png",
          },
          {
            src: "/delish-logo-180.png",
            sizes: "180x180",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
      strategies: "generateSW",
      includeManifestIcons: true,
      disable: false,
      minify: true,
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
  },
  build: {
    target: "es2022",
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
            if (id.includes("framer-motion") || id.includes("antd")) {
              return "vendor-ui";
            }
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    cssMinify: true,
    reportCompressedSize: false,
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "antd", "@reduxjs/toolkit"],
    esbuildOptions: {
      target: "es2022",
    },
  },
});