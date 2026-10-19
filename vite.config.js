import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { creerMiddlewareIa } from './server/ia/middlewareIa.js'

// Chat IA : l'API /api/ia/* est servie par ce serveur (npm run dev, et
// npm run preview pour la version compilée). Les clés des fournisseurs
// (GEMINI_API_KEY…, sans préfixe VITE_) restent côté serveur : Vite n'envoie
// au navigateur que les variables VITE_*. Voir .env.example.
const apiIa = (env) => ({
  name: 'pomodoro-api-ia',
  configureServer(serveur) {
    serveur.middlewares.use(creerMiddlewareIa(env))
  },
  configurePreviewServer(serveur) {
    serveur.middlewares.use(creerMiddlewareIa(env))
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), apiIa(loadEnv(mode, process.cwd(), ''))],
}))
