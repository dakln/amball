import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Один адрес на клиент и сервер: другу нужна одна ссылка, а ngrok — один туннель.
const serving = {
  port: 1420,
  strictPort: true,
  allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.dev', '.ngrok.io'],
  proxy: {
    '/colyseus': {
      target: 'http://localhost:2567',
      ws: true,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/colyseus/, ''),
    },
  },
};

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react'], tsconfigPaths: true },
  build: { rolldownOptions: { output: { keepNames: true } } },
  server: serving,
  preview: serving,
});
