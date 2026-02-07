import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
// PWA disabled - service worker not needed
// import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // PWA disabled - service worker not needed
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   injectRegister: 'auto',
    //   includeAssets: [
    //     'favicon.ico',
    //     'icons/daldiz-192.png',
    //     'icons/daldiz-512.png'
    //   ],
    //   manifest: {
    //     name: 'Daldız — Tarımsal Denetim Platformu',
    //     short_name: 'Daldız',
    //     description: 'Daldız, sera ve tarımsal alanlar için kapsamlı denetim ve reçete yönetim platformudur.',
    //     start_url: '/',
    //     scope: '/',
    //     display: 'standalone',
    //     orientation: 'portrait',
    //     background_color: '#F7F7F7',
    //     theme_color: '#F7F7F7',
    //     icons: [
    //       {
    //         src: '/icons/daldiz-192.png',
    //         sizes: '192x192',
    //         type: 'image/png'
    //       },
    //       {
    //         src: '/icons/daldiz-512.png',
    //         sizes: '512x512',
    //         type: 'image/png'
    //       }
    //     ]
    //   },
    //   devOptions: {
    //     enabled: true,
    //     type: 'module'
    //   }
    // })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
