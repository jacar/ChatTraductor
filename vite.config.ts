
import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react-swc';
  import path from 'path';

  export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: [
        '@radix-ui/react-label',
        'class-variance-authority',
        'tailwind-merge',
        '@radix-ui/react-select',
        'sonner',
        '@radix-ui/react-slot',
      ],
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'dist/client',
    },
    server: {
      port: 3000,
      open: true,
    },
  });