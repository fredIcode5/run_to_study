import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(undefined)

// --- Fournit l'état d'authentification (session, utilisateur) à toute
// l'application, ainsi que les actions (connexion, inscription, déconnexion).
// La session Supabase est écoutée en temps réel via onAuthStateChange,
// donc tout composant utilisant useAuth() se met à jour automatiquement.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargementAuth, setChargementAuth] = useState(true)

  useEffect(() => {
    let annule = false

    // Récupère la session existante au chargement (ex: utilisateur déjà
    // connecté lors d'une précédente visite, token encore valide)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (annule) return
      setSession(session)
      setUtilisateur(session?.user ?? null)
      setChargementAuth(false)
    })

    // Écoute tous les changements d'état : connexion, déconnexion,
    // rafraîchissement de token, retour d'OAuth (Google)...
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evenement, session) => {
      setSession(session)
      setUtilisateur(session?.user ?? null)
      setChargementAuth(false)
    })

    return () => {
      annule = true
      subscription.unsubscribe()
    }
  }, [])

  const connexionAvecEmail = async (email, motDePasse) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    })
    if (error) throw error
    return data
  }

  // infosComplementaires (ex: { pseudo, date_naissance }) est stocké dans
  // les user_metadata Supabase, accessible ensuite via utilisateur.user_metadata
  const inscriptionAvecEmail = async (email, motDePasse, infosComplementaires = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: {
        data: infosComplementaires,
      },
    })
    if (error) throw error
    return data
  }

  const connexionAvecGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) throw error
  }

  const deconnexion = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const valeur = {
    session,
    utilisateur,
    chargementAuth,
    connecte: !!utilisateur,
    connexionAvecEmail,
    inscriptionAvecEmail,
    connexionAvecGoogle,
    deconnexion,
  }

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const contexte = useContext(AuthContext)
  if (contexte === undefined) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un <AuthProvider>")
  }
  return contexte
}
