import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // This tells Vercel to look in the root folder for index.html, 
    // and correctly handle the base path for assets.
    base: './', 
  }
})
