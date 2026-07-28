import { createContext, useContext, useEffect, useState } from 'react'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth'
import { auth } from '../lib/firebase'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargementAuth, setChargementAuth] = useState(true)

  useEffect(() => {
    const desabonner = onAuthStateChanged(auth, (user) => {
      if (user) {
        // App.jsx s'attend à `utilisateur.id` (héritage de Supabase). 
        // Firebase utilise `uid`. On ajoute donc la propriété `id`.
        user.id = user.uid
        setUtilisateur(user)
        setSession({ user })
      } else {
        setUtilisateur(null)
        setSession(null)
      }
      setChargementAuth(false)
    })
    return desabonner
  }, [])

  const connexionAvecEmail = async (email, motDePasse) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, motDePasse)
    const user = userCredential.user
    user.id = user.uid
    return { user }
  }

  const inscriptionAvecEmail = async (email, motDePasse, infosComplementaires = {}) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, motDePasse)
    const user = userCredential.user
    user.id = user.uid
    
    // Si on a un pseudo, on peut le mettre à jour dans le profil Firebase
    if (infosComplementaires.pseudo) {
      await updateProfile(user, {
        displayName: infosComplementaires.pseudo
      })
    }
    return { user }
  }

  const connexionAvecGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const deconnexion = async () => {
    await signOut(auth)
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