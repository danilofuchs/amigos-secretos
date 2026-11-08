import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Prebundle lazy animation imports before tests to prevent mid-test Vite reloads.
  optimizeDeps: { include: ['motion/react', 'three', '@base-ui/react/slider'] },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/lib/**/*.test.ts'],
          restoreMocks: true,
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.tsx'],
          setupFiles: ['./src/test/browser.setup.ts'],
          restoreMocks: true,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            viewport: { width: 390, height: 844 },
            screenshotDirectory: './test-results/screenshots',
          },
        },
      },
    ],
  },
});
