import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    compression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024,
    }),
    compression({
      algorithm: "brotliCompress",
      ext: ".br",
    }),
    process.env.ANALYZE &&
      visualizer({
        filename: "dist/stats.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@reduxjs/toolkit",
      "react-redux",
      "@tanstack/react-query",
      "antd",
      "@ant-design/icons",
      "react-icons",
      "notistack",
      "axios",
      "framer-motion",
    ],
    exclude: ["react-to-print"], // Exclude less critical deps
  },

  build: {
    target: "es2020",
    sourcemap: false, // Disable sourcemaps in production for smaller build
    minify: "esbuild",

    // Optimize asset handling
    assetsInlineLimit: 4096,
    assetsDir: "assets",

    rollupOptions: {
      output: {
        manualChunks: {
          // Core React chunks
          "react-vendor": ["react", "react-dom"],
          "react-runtime": ["react-router-dom", "react-redux"],

          // State management
          "state-management": ["@reduxjs/toolkit", "@tanstack/react-query"],

          // UI Libraries (Ant Design is large, split it)
          "antd-core": ["antd"],
          "antd-icons": ["@ant-design/icons"],
          "ui-utils": ["react-icons", "framer-motion", "notistack"],

          // Utilities
          "http-client": ["axios"],
          "print-utils": ["react-to-print"],
        },
        // Optimize chunk names for caching
        chunkFileNames: "chunks/[name]-[hash].js",
        entryFileNames: "js/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },

    // Reduce chunk size warnings
    chunkSizeWarningLimit: 800,

    // Enable better tree shaking
    treeshake: {
      preset: "recommended",
      moduleSideEffects: false,
    },
  },

  server: {
    host: true,
    port: 5173,
  },

  preview: {
    host: true,
    port: 4173,
  },
});
