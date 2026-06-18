import react from '@vitejs/plugin-react';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import type { Alias } from 'vite';
import { defineConfig } from 'vitest/config';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(projectRoot, 'src');
const muiIconMock = path.resolve(srcRoot, 'test/mocks/muiIcon.tsx');
const muiIconsMaterialMock = path.resolve(srcRoot, 'test/mocks/muiIconsMaterial.tsx');

const resolveAliases: Alias[] = [{ find: '@', replacement: srcRoot }];

if (process.env.VITEST) {
  resolveAliases.push(
    {
      find: /^@mui\/icons-material\/(.*)$/,
      replacement: muiIconMock,
    },
    {
      find: '@mui/icons-material',
      replacement: muiIconsMaterialMock,
    },
  );
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: resolveAliases,
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/test/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 20000,
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    deps: {
      optimizer: {
        web: {
          include: ['@mui/icons-material', '@mui/x-data-grid'],
        },
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/types/**',
        'src/vite-env.d.ts',
        'src/main.tsx',
      ],
    },
  },
});