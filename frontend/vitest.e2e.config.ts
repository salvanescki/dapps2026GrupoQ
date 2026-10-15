/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    css: true,
    include: ['tests/e2e/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', ['lcov', { projectRoot: path.resolve(__dirname, '..') }], 'html'],
      reportsDirectory: './coverage/e2e',
      include: [
        'src/views/**/*.{ts,tsx}',
        'src/routes/**/*.{ts,tsx}',
        'src/context/**/*.{ts,tsx}',
        'src/services/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.d.ts',
      ],
    },
  },
});
