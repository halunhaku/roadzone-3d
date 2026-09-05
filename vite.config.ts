import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@react-three')) {
              return 'r3f-vendor'
            }
            if (id.includes('three-stdlib')) {
              return 'three-stdlib'
            }
            if (id.includes('three')) {
              return 'three-core'
            }
            if (id.includes('react') || id.includes('scheduler')) {
              return 'react-vendor'
            }
            if (id.includes('html-to-image')) {
              return 'export-vendor'
            }
          }
        },
      },
    },
  },
})
