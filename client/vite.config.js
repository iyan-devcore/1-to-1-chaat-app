import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), basicSsl()],
    server: {
        proxy: {
            '/auth': {
                target: 'http://localhost:3000',
                changeOrigin: true
            },
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true
            },
            '/uploads': {
                target: 'http://localhost:3000',
                changeOrigin: true
            },
            '/socket.io': {
                target: 'http://localhost:3000',
                ws: true
            }
        }
    }
})
