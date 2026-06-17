import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const muiIconMock = path.resolve(projectRoot, 'src/test/mocks/muiIcon.tsx');
const muiIconsMaterialMock = path.resolve(projectRoot, 'src/test/mocks/muiIconsMaterial.tsx');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: process.env.VITEST
      ? [
          {
            find: /^@mui\/icons-material\/(.*)$/,
            replacement: muiIconMock,
          },
          {
            find: '@mui/icons-material',
            replacement: muiIconsMaterialMock,
          },
        ]
      : [],
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
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
      reporter: ['text', 'html'],
    },
  },
});