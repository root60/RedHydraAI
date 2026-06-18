import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_GITHUB_PAGES_BASE || (mode === 'production' ? '/RedHydraAI/' : '/');

  return {
    base,
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: true
    },
    build: {
      target: 'es2020',
      sourcemap: true,
      chunkSizeWarningLimit: 1200
    }
  };
});
