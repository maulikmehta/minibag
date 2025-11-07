import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import removeConsole from 'vite-plugin-remove-console';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  plugins: [
    react(),
    visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true
    }),
    // Remove console statements in production builds
    removeConsole({
      includes: ['log', 'debug', 'info', 'warn', 'error'],
      // Keep console.error in production for critical errors
      excludes: ['error']
    })
  ],
  server: {
    port: 5173,
    host: true,
    open: true,
    allowedHosts: [
      '.trycloudflare.com',
      'localhost'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,  // Disabled for production - saves 2.3 MB and prevents source code exposure
    rollupOptions: {
      output: {
        // Manual vendor chunking for better caching
        manualChunks: {
          // Core React libraries (cached across visits)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // WebSocket client (only for active sessions)
          'vendor-socket': ['socket.io-client'],
          // Internationalization (language support)
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          // Charts library (only in admin dashboard)
          'vendor-charts': ['chart.js', 'react-chartjs-2']
        }
      }
    }
  }
});
