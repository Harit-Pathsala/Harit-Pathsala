import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server on 8000; build output is a normal static bundle in dist/.
export default defineConfig({
  plugins: [react()],
  server: { port: 8000, open: true },
  preview: { port: 8000 },
  base: './',
});
