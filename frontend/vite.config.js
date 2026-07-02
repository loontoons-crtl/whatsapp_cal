import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, the React app runs on :5173 and proxies API calls to the backend on :3000.
// In prod, the backend serves the built frontend, so relative URLs just work.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/share-target': 'http://localhost:3000',
    },
  },
});
