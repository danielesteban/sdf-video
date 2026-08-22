import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  build: {
    rolldownOptions: {
      output: {
        minify: mode === 'production' ? {
          compress: { dropConsole: true },
        } : {},
      },
    },
  },
  server: {
    port: 8080,
  },
}));
