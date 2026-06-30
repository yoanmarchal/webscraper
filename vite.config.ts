import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()] // Gère automatiquement tous tes alias TypeScript ! ],
});