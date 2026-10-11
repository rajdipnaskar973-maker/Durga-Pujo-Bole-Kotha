import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vite builds the app; Vitest runs the tests in a simulated browser (jsdom).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
