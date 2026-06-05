import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  build: {
    target: 'esnext',
    minify: true,
    cssMinify: true,
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion';
          if (id.includes('node_modules/lucide-react')) return 'vendor-lucide';
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
          if (id.includes('/pages/CMOPage')) return 'exec-cmo';
          if (id.includes('/pages/CTOPage')) return 'exec-cto';
          if (id.includes('/pages/PricingPage')) return 'exec-cfo';
          if (id.includes('/pages/COOPage') || id.includes('/pages/COOLeadExecutionPage')) return 'exec-coo';
          if (id.includes('/pages/DirectorPage')) return 'exec-director';
        },
      },
    },
  },
  server: {
    proxy: {
      '/api/integrations':    'http://127.0.0.1:8787',
      '/api/forex':           'http://127.0.0.1:8787',
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
