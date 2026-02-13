import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
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
      },
      devOptions: {
        enabled: false,
      },
      strategies: "generateSW",
      disable: false,
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
        passes: 3,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          ui: ['antd', 'framer-motion'],
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
    include: ["react", "react-dom", "antd", "@reduxjs/toolkit"],
    esbuildOptions: {
      target: "es2022",
    },
  },
});