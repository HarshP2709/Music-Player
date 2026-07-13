import { defineConfig } from 'vite';

export default defineConfig({
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
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        main:           'index.html',
        login:          'login.html',
        register:       'register.html',
        forgotPassword: 'forgot-password.html',
        dashboard:      'dashboard.html',
        playlist:       'playlist.html',
        favorites:      'favorites.html',
        profile:        'profile.html',
      },
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
});
