import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// base './' ทำให้ deploy ขึ้น GitHub Pages ได้โดยไม่ต้องรู้ชื่อ repo
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
