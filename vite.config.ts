import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4173',
    },
  },
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'dist/**', 'dist-server/**'],
    globals: true,
    setupFiles: './vitest.setup.ts',
  },
});
