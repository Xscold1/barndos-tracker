import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { readSupabaseConfig } from './src/lib/supabaseConfig.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITE_')
  const config = readSupabaseConfig(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)
  if (config.error) throw new Error(config.error)
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      host: true,          // Exposes Vite to the local network (binds to 0.0.0.0)
      allowedHosts: true,  // Required since Vite 6 to accept dynamic VS Code tunnel URLs
      strictPort: true     // Keeps Vite locked to 5173 instead of randomly changing it
  }
  }
})
