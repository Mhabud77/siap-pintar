import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'  // ← tambahkan baris ini


export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: '0.0.0.0',   // ← listen di semua network interface
    port: 5173,
  }
})