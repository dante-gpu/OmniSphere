import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  resolve: {
    alias: {
      // Alias removed - was causing conflicts with direct imports
    },
  },
  optimizeDeps: {
    // Remove include for wormhole-sdk as alias is preferred
    exclude: ['lucide-react'],
  },
});
