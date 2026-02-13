import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
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
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: false,
      injectRegister: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
      strategies: "generateSW",
      includeManifestIcons: false,
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
    // FIXED: Change from "es2020" to "es2022" or "esnext"
    target: "es2022", // or use "esnext" for latest features
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
            if (id.includes("framer-motion")) {
              return "vendor-ui";
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
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
    exclude: ["@vitejs/plugin-react-swc"],
    force: process.env.NODE_ENV === "development",
    // ADD THIS to ensure esbuild uses compatible target
    esbuildOptions: {
      target: "es2022", // Match the build target
    },
  },
});