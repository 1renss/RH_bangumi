import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'https://api.bgm.tv',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        headers: {
          'Referer': 'https://api.bgm.tv'
        }
      },
      '/img-proxy': {
        target: 'https://lain.bgm.tv',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/img-proxy/, ''),
        headers: {
          'Referer': 'https://lain.bgm.tv',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    }
  }
})
