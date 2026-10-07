import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')

    return {
        plugins: [
            react(),
            tailwindcss(),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './resources/ts'),
            },
        },
        server: {
            host: true,
            allowedHosts: true,
            port: 3000,
            proxy: {
                '/api': {
                    target: 'http://localhost:3001',
                    changeOrigin: true,
                },
            },
        },
        define: {
            __APP_VERSION__: JSON.stringify(env.APP_VERSION || process.env.APP_VERSION || 'dev'),
        },
    }
})
