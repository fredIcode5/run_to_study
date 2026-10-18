import React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

// --- Fenêtre "Se connecter" : bascule entre le formulaire de connexion et
// celui de création de compte. Branchée sur Supabase Auth via useAuth() :
// connexion email/mot de passe, inscription, et connexion Google (OAuth).
function ModalConnexion({ ouvert, fermer, vueInitiale = 'connexion' }) {
  const { connexionAvecEmail, inscriptionAvecEmail, connexionAvecGoogle, connecte } = useAuth();

  const [vue, setVue] = useState(vueInitiale); // 'connexion' | 'creation'
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  // Champs du formulaire de connexion
  const [emailConnexion, setEmailConnexion] = useState('');
  const [motDePasseConnexion, setMotDePasseConnexion] = useState('');

  // Champs du formulaire de création de compte
  const [emailCreation, setEmailCreation] = useState('');
  const [pseudoCreation, setPseudoCreation] = useState('');
  const [dateNaissanceCreation, setDateNaissanceCreation] = useState('');
  const [motDePasseCreation, setMotDePasseCreation] = useState('');
  const [accepteReglement, setAccepteReglement] = useState(false);
  const [accepteConditions, setAccepteConditions] = useState(false);

  // Revient toujours sur le formulaire de connexion et remet tout à zéro
  // à chaque réouverture de la modale
  useEffect(() => {
    if (ouvert) {
      setVue(vueInitiale);
      setErreur(null);
      setEnvoiEnCours(false);
      setEmailConnexion('');
      setMotDePasseConnexion('');
      setEmailCreation('');
      setPseudoCreation('');
      setDateNaissanceCreation('');
      setMotDePasseCreation('');
      setAccepteReglement(false);
      setAccepteConditions(false);
    }
  }, [ouvert, vueInitiale]);

  // Ferme automatiquement la modale dès que l'utilisateur est authentifié
  // (utile aussi bien pour email/mot de passe que pour le retour d'OAuth Google)
  useEffect(() => {
    if (ouvert && connecte) fermer();
  }, [connecte, ouvert, fermer]);

  if (!ouvert) return null;

  // Traduit les messages d'erreur Supabase les plus courants en français
  const traduireErreur = (err) => {
    const message = err?.message || '';
    if (message.includes('Invalid login credentials')) return 'Identifiant ou mot de passe incorrect.';
    if (message.includes('User already registered')) return 'Un compte existe déjà avec cet e-mail.';
    if (message.includes('Password should be at least')) return 'Le mot de passe est trop court (6 caractères minimum).';
    if (message.includes('Unable to validate email address')) return "Adresse e-mail invalide.";
    return message || "Une erreur est survenue, réessaie.";
  };

  const soumettreConnexion = async (e) => {
    e.preventDefault();
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await connexionAvecEmail(emailConnexion.trim(), motDePasseConnexion);
      // La fermeture se fait via l'effet ci-dessus quand `connecte` passe à true
    } catch (err) {
      setErreur(traduireErreur(err));
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const soumettreCreation = async (e) => {
    e.preventDefault();
    setErreur(null);

    if (!accepteReglement || !accepteConditions) {
      setErreur("Merci d'accepter le règlement et les conditions d'utilisation.");
      return;
    }

    setEnvoiEnCours(true);
    try {
      const { session } = await inscriptionAvecEmail(
        emailCreation.trim(),
        motDePasseCreation,
        { pseudo: pseudoCreation.trim(), date_naissance: dateNaissanceCreation }
      );
      // Si la confirmation par e-mail est activée côté Supabase, aucune session
      // n'est renvoyée immédiatement : on informe l'utilisateur au lieu de fermer.
      if (!session) {
        setErreur("Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.");
      }
    } catch (err) {
      setErreur(traduireErreur(err));
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const cliquerGoogle = async () => {
    setErreur(null);
    try {
      await connexionAvecGoogle();
      // Redirection gérée par Supabase : la page quitte l'appli puis revient.
    } catch (err) {
      setErreur(traduireErreur(err));
    }
  };

  return (
    <div className="modal_fond" onClick={fermer}>
      <div className="modal_fenetre" onClick={(e) => e.stopPropagation()}>
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>

        <div className="modal_contenu connexion_contenu">
          {vue === 'connexion' ? (
            <form onSubmit={soumettreConnexion}>
              <h3 className="connexion_titre">Se connecter</h3>

              <input
                type="email"
                className="connexion_input"
                placeholder="E-mail"
                value={emailConnexion}
                onChange={(e) => setEmailConnexion(e.target.value)}
                autoComplete="email"
                required
              />
              <input
                type="password"
                className="connexion_input"
                placeholder="Mot de passe"
                value={motDePasseConnexion}
                onChange={(e) => setMotDePasseConnexion(e.target.value)}
                autoComplete="current-password"
                required
              />

              {erreur && <p className="connexion_texte_erreur">{erreur}</p>}

              <button type="submit" className="btn_primaire" disabled={envoiEnCours}>
                {envoiEnCours ? 'Connexion...' : 'Se connecter'}
              </button>

              <hr className="connexion_separateur" />

              <p className="connexion_texte_separateur">Se connecter avec</p>

              <button
                type="button"
                className="btn_secondaire connexion_btn_google"
                onClick={cliquerGoogle}
                disabled={envoiEnCours}
              >
                Se connecter avec Google
              </button>

              <p className="connexion_texte_info">Vous n'avez pas de compte ?</p>

              <button
                type="button"
                className="btn_primaire connexion_btn_creer"
                onClick={() => { setVue('creation'); setErreur(null); }}
              >
                Créer un compte
              </button>
            </form>
          ) : (
            <form onSubmit={soumettreCreation}>
              <h3 className="connexion_titre">Créer un compte</h3>

              <input
                type="email"
                className="connexion_input"
                placeholder="E-mail"
                value={emailCreation}
                onChange={(e) => setEmailCreation(e.target.value)}
                autoComplete="email"
                required
              />
              <input
                type="text"
                className="connexion_input"
                placeholder="Pseudo"
                value={pseudoCreation}
                onChange={(e) => setPseudoCreation(e.target.value)}
                required
              />
              <input
                type="date"
                className="connexion_input"
                placeholder="Date de naissance"
                value={dateNaissanceCreation}
                onChange={(e) => setDateNaissanceCreation(e.target.value)}
                required
              />
              <input
                type="password"
                className="connexion_input"
                placeholder="Mot de passe"
                value={motDePasseCreation}
                onChange={(e) => setMotDePasseCreation(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />

              <label className="connexion_case">
                <input
                  type="checkbox"
                  checked={accepteReglement}
                  onChange={(e) => setAccepteReglement(e.target.checked)}
                />
                J'accepte le règlement
              </label>

              <label className="connexion_case">
                <input
                  type="checkbox"
                  checked={accepteConditions}
                  onChange={(e) => setAccepteConditions(e.target.checked)}
                />
                J'accepte les conditions d'utilisation
              </label>

              {erreur && <p className="connexion_texte_erreur">{erreur}</p>}

              <button type="submit" className="btn_primaire connexion_btn_creer" disabled={envoiEnCours}>
                {envoiEnCours ? 'Création...' : 'Créer un compte'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModalConnexion;
