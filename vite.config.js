import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
          if (id.includes('node_modules/lucide-react')) return 'vendor-lucide';
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
        },
      },
    },
  },
  server: {
    proxy: {
      '/api/integrations':    'http://127.0.0.1:8787',
      '/api/cto':             'http://127.0.0.1:8787',
      '/api/learning-centre': 'http://127.0.0.1:8787',
      '/api/cmo':             'http://127.0.0.1:8787',
      '/api/cfo':             'http://127.0.0.1:8787',
      '/api/cmo/campaigns':   'http://127.0.0.1:8787',
      '/api/cmo/briefing':    'http://127.0.0.1:8787',
      '/api/slack':           'http://127.0.0.1:8787',
      '/api/lead-email':      'http://127.0.0.1:8787',
    },
  },
});
