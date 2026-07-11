import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
// Dev server runs on HTTPS (self-signed) so it matches the HTTPS backend and
// secure cookies work end to end. The browser will warn about the self-signed
// certificate in development — accept it to proceed.
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    https: true,
    port: 5173,
  },
})
