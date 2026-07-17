import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
// The dev server runs on HTTPS using a locally-trusted mkcert certificate, so
// the browser shows a normal padlock (no "Not secure" warning). It also proxies
// API + upload traffic to the HTTPS backend, keeping everything first-party
// (https://localhost:5173): no CORS in dev and secure, first-party cookies.
//
// Generate the cert once with: mkcert -install && npm run gen-certs
const keyPath = path.resolve(__dirname, 'certs/key.pem')
const certPath = path.resolve(__dirname, 'certs/cert.pem')
const hasCerts = fs.existsSync(keyPath) && fs.existsSync(certPath)

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Use the trusted mkcert cert when present; otherwise fall back to Vite's
    // default HTTP so the dev server still starts.
    https: hasCerts
      ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
      : undefined,
    proxy: {
      '/api': {
        target: 'https://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'https://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
