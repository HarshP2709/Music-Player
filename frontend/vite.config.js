import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../backend'), '');

  return {
    root: '.',

    envPrefix: 'VITE_',

    server: {
      port: 3000,
      open: '/index.html',
      cors: true,
      proxy: {
        // Proxy API calls to the backend server
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },

    preview: {
      port: 4173,
      open: true,
    },

    build: {
      target: 'esnext',
      outDir: 'dist',
      emptyOutDir: true,

      rollupOptions: {
        input: {
          main: 'index.html',
          login: 'login.html',
          register: 'register.html',
          forgotPassword: 'forgot-password.html',
          dashboard: 'dashboard.html',
          playlist: 'playlist.html',
          favorites: 'favorites.html',
          profile: 'profile.html',
        },
      },
      define: {
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
        'import.meta.env.VITE_SUPABASE_STORAGE_BUCKET': JSON.stringify(env.SUPABASE_STORAGE_BUCKET),
      },
    },

    resolve: {
      alias: {
        '/js': '/js',
        '/css': '/css',
      },
    },

    optimizeDeps: {
      include: ['@supabase/supabase-js'],
    },
  };
});
