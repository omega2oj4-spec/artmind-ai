import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],

  server: {
  port: 5190,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:5000',
      changeOrigin: true,
      timeout: 120000,
      proxyTimeout: 120000
    }
  }
},

  build: {
    // Enable code splitting and optimization
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            if (id.includes('react-icons')) {
              return 'ui-vendor';
            }
            return 'vendor';
          }
        }
      }
    },
    // Enable source maps for production debugging
    sourcemap: true
  }
})