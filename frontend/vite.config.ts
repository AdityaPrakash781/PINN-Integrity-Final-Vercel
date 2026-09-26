import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',   // '/' for Vercel; change to '/Pipeline-Digital-Twin/frontend/' for GitHub Pages
  plugins: [react()],
})
