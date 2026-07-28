import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('URL:', supabaseUrl)
console.log('KEY:', supabaseAnonKey ? 'définie ✅' : 'undefined ❌')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Variables d'environnement Supabase manquantes : vérifie VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans ton fichier .env (à la racine du projet, préfixées par VITE_)."
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
