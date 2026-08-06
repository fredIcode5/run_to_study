import { useState, useEffect, useRef } from 'react'
import { Play, Pause, SquarePen, Gift, Headphones } from 'lucide-react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import './App.css'
import { useAuth } from './context/AuthContext.jsx'
import {
  chargerProfil,
  sauvegarderProfil,
  sauvegarderPhotoProfil,
  sauvegarderPreferences,
  chargerNotes,
  sauvegarderNotes,
  chargerPrereglages,
  sauvegarderPrereglages,
  chargerHistorique,
  ajouterJourHistorique,
  chargerSessionsArchivees,
  sauvegarderSessionArchivee,
  chargerRecompenses,
  ajouterRecompense,
  mettreAJourRecompense,
  rechercherUtilisateurs,
  envoyerDemandeAmi,
  repondreDemandeAmi,
  getDemandesAmis,
  getDemandesEnvoyees,
  getAmis,
  chargerPlanningMois,
  chargerPlanningJour,
  sauvegarderPlanningJour,
} from './lib/firebaseDataService'


// --- Réglages Pomodoro par défaut, utilisés au premier lancement
// et comme valeurs de repli en cas de données invalides ---
const REGLAGES_PAR_DEFAUT = {
  dureeTravail: 25,        // minutes
  dureePause: 5,           // minutes
  couleurChrono: '#1f2430',
  couleurPoignee: '#e2472a',
  couleurBoutons: '#e2472a',
};

// ==========================================================================
// Persistance des données utilisateur : Supabase
// ==========================================================================
// Toutes les données applicatives (notes, préréglages, historique des
// séances, sessions archivées, préférences, photo de profil) sont
// enregistrées et récupérées depuis des tables Supabase protégées par RLS.
// Chaque donnée est rattachée à l'utilisateur connecté via son user.id.
//
// Le mode invité (non connecté) reste SANS persistance : ses données ne
// vivent qu'en mémoire et disparaissent à la déconnexion, au changement
// de compte, ou à la fermeture de l'onglet.
//
// Voir src/lib/supabaseDataService.js pour toutes les opérations CRUD.

// Valeur "vide" de la photo de profil : utilisée pour les invités (mode
// invité, non connectés à un compte Supabase) et comme repli par défaut.
const PHOTO_PROFIL_VIDE = { dataUrl: null, position: { x: 50, y: 50 } };

// Position par défaut du lecteur de musique flottant, calculée en fonction
// de la taille de la fenêtre pour rester visible sur la plupart des écrans
function positionParDefautLecteur() {
  if (typeof window === 'undefined') return { x: 24, y: 300 };
  return {
    x: 24,
    y: Math.max(100, window.innerHeight - 320),
  };
}

// Formate une date en "aaaa-mm-jj" (jour ISO local, sans l'heure), utilisée
// pour indexer les jours dans l'historique Pomodoro (heatmap du profil)
function formaterJourIso(date) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

// Formate une date ISO en "jj/mm/aaaa hh:mm" (locale FR), utilisée dans
// l'en-tête des notes épinglées pour afficher la création/dernière modification
function formaterDateNote(dateIso) {
  try {
    const d = new Date(dateIso);
    if (isNaN(d.getTime())) return '';
    const jour = d.toLocaleDateString('fr-FR');
    const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${jour} ${heure}`;
  } catch {
    return '';
  }
}


function Navbar({ onAccueil, onCourse, onConnexion, modeInvite }) {
  const { connecte, utilisateur, deconnexion } = useAuth();

  // Pseudo affiché une fois connecté : priorité au pseudo renseigné à
  // l'inscription (user_metadata), sinon repli sur l'email du compte.
  const pseudoAffiche = utilisateur?.displayName || utilisateur?.email || '';

  return (
    <>
      <div className="navbar">
        <button onClick={onAccueil}>home</button>
        <button onClick={onCourse}>Course</button>
        {connecte ? (
          <div className="navbar_compte">
            <button type="button" className="navbar_compte_bouton">
              Connecté : {pseudoAffiche}
            </button>
            <div className="navbar_compte_menu">
              <button type="button" className="navbar_compte_menu_item" onClick={deconnexion}>
                Se déconnecter
              </button>
            </div>
          </div>
        ) : modeInvite ? (
          <button onClick={onConnexion} title="Cliquer pour créer un compte ou te connecter">
            Mode invité
          </button>
        ) : (
          <button onClick={onConnexion}>Se connecter</button>
        )}
      </div>
    </>
  );
}


// --- Page d'accueil : vitrine avant d'entrer dans l'appli.
// Le fond (accueil_fond) sert de placeholder pour l'image vitrine à venir
// et occupe le premier écran ; la suite (présentation, fonctionnalités,
// footer) forme une seconde partie accessible par un défilement naturel
// à la molette (voir accueil_suite plus bas).
function Accueil({ onCommencer }) {
  const FONCTIONNALITES_ACCUEIL = [
    {
      id: 'personnalisation',
      titre: 'Personnalisez votre Pomodoro',
      texte: 'Ajustez la durée du minuteur, choisissez parmi plusieurs thèmes visuels, personnalisez les sons de notification et adaptez l\'expérience à votre façon de travailler.',
    },
    {
      id: 'motivation',
      titre: 'Motivez-vous seul ou à plusieurs',
      texte: 'Suivez votre progression en solo ou rejoignez vos amis pour vous encourager mutuellement, comparer vos sessions et rester motivé sur la durée.',
    },
    {
      id: 'medaillons',
      titre: 'Collectez des médaillons uniques à échanger et collectionner',
      texte: 'Débloquez des médaillons en accomplissant vos sessions, complétez votre collection et échangez-les avec d\'autres utilisateurs pour enrichir votre profil.',
    },
    {
      id: 'statistiques',
      titre: 'Trackez vos statistiques avec des outils adaptés',
      texte: 'Visualisez votre temps de concentration, vos séries de Pomodoro et votre progression grâce à des graphiques clairs et des outils de suivi pensés pour vous.',
    },
  ];

  return (
    <div className="accueil">
      <div className="accueil_fond">
        <button
          type="button"
          className="btn_primaire accueil_btn_commencer"
          onClick={onCommencer}
        >
          Commencer à travailler
        </button>
      </div>

      {/* --- Seconde partie de la vitrine : accessible par défilement naturel --- */}
      <div className="accueil_suite">

        <section className="accueil_presentation">
          <h2 className="accueil_presentation_titre">Qu'est-ce que la méthode Pomodoro ?</h2>
          <p className="accueil_presentation_texte">
            La méthode Pomodoro consiste à alterner des périodes de travail
            concentré, généralement de 25 minutes, avec de courtes pauses
            régulières. Ce rythme aide à maintenir un haut niveau de
            concentration, réduit la fatigue mentale et améliore la
            productivité en structurant naturellement la gestion du temps.
          </p>
        </section>

        <section className="accueil_fonctionnalites_grille">
          {FONCTIONNALITES_ACCUEIL.map((fonctionnalite) => (
            <div key={fonctionnalite.id} className="accueil_fonctionnalite_bloc">
              <h3 className="accueil_fonctionnalite_titre">{fonctionnalite.titre}</h3>
              <p className="accueil_fonctionnalite_texte">{fonctionnalite.texte}</p>
            </div>
          ))}
        </section>

        <PiedDePage />
      </div>
    </div>
  );
}


// --- Footer de la vitrine d'accueil : identité de l'appli, liens légaux,
// réseaux sociaux (placeholders) et mention de copyright.
function PiedDePage() {
  const anneeActuelle = new Date().getFullYear();

  const RESEAUX_SOCIAUX_PLACEHOLDER = [
    { id: 'instagram', label: 'Instagram', href: '#' },
    { id: 'twitter', label: 'X / Twitter', href: '#' },
    { id: 'tiktok', label: 'TikTok', href: '#' },
  ];

  return (
    <footer className="site_footer">
      <div className="site_footer_contenu">

        <div className="site_footer_bloc site_footer_identite">
          <span className="site_footer_logo">🍅 Pomodoro</span>
          <p className="site_footer_signature">Made with ❤️ by Pomodoro Team</p>
        </div>

        <nav className="site_footer_bloc site_footer_liens" aria-label="Liens légaux">
          <a href="#" className="site_footer_lien">Contact</a>
          <a href="#" className="site_footer_lien">Terms of Service</a>
          <a href="#" className="site_footer_lien">Privacy Policy</a>
        </nav>

        <div className="site_footer_bloc site_footer_reseaux">
          {RESEAUX_SOCIAUX_PLACEHOLDER.map((reseau) => (
            <a key={reseau.id} href={reseau.href} className="site_footer_lien_reseau">
              {reseau.label}
            </a>
          ))}
        </div>

      </div>

      <p className="site_footer_copyright">
        © {anneeActuelle} Pomodoro Team. Tous droits réservés.
      </p>
    </footer>
  );
}


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


// --- Fenêtre de choix d'accès : affichée dès qu'un utilisateur non connecté
// tente d'accéder à Home ou à Pomodoro (depuis la navbar ou le bouton
// "Commencer à travailler"). Propose 3 options alignées horizontalement.
function ModalConfirmationAccueil({ ouvert, fermer, onConfirmer }) {
  if (!ouvert) return null;
  return (
    <div className="modal_fond" onClick={fermer}>
      <div className="modal_fenetre choix_acces_fenetre" onClick={(e) => e.stopPropagation()}>
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>

        <div className="modal_contenu choix_acces_contenu">
          <h3 className="choix_acces_titre" style={{ textAlign: 'center', marginBottom: '16px' }}>Attention</h3>
          <p className="choix_acces_texte" style={{ textAlign: 'center', marginBottom: '24px' }}>
            Vous utilisez actuellement le mode invité. Si vous retournez à l'accueil, toutes vos notes, sessions et données non sauvegardées seront <strong>définitivement supprimées</strong>. Souhaitez-vous continuer ?
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button type="button" className="btn_secondaire" onClick={fermer}>
              Annuler
            </button>
            <button type="button" className="btn_primaire" onClick={onConfirmer}>
              Continuer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function ModalChoixAcces({ ouvert, fermer, onInscription, onInvite, onConnexion }) {
  if (!ouvert) return null;

  return (
    <div className="modal_fond" onClick={fermer}>
      <div className="modal_fenetre choix_acces_fenetre" onClick={(e) => e.stopPropagation()}>
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>

        <div className="modal_contenu choix_acces_contenu">
          <h3 className="choix_acces_titre">Comment veux-tu continuer ?</h3>

          <div className="choix_acces_options">
            <button type="button" className="btn_secondaire choix_acces_option" onClick={onInscription}>
              S'inscrire
            </button>
            <button type="button" className="btn_secondaire choix_acces_option" onClick={onInvite}>
              invité
            </button>
            <button type="button" className="btn_primaire choix_acces_option" onClick={onConnexion}>
              Se connecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function PanneauJoueur({ pseudo, niveau, distance, position, ouvrirProfil, photoProfil, coins }) {
  return (
    <div className="joueur_info">
      <button
        className="joueur_photo"
        onClick={ouvrirProfil}
        aria-label="Ouvrir le profil"
      >
        {photoProfil?.dataUrl ? (
          <img
            src={photoProfil.dataUrl}
            alt={`Photo de profil de ${pseudo}`}
            className="joueur_photo_img"
            style={{ objectPosition: `${photoProfil.position?.x ?? 50}% ${photoProfil.position?.y ?? 50}%` }}
            draggable={false}
          />
        ) : (
          <span className="joueur_photo_icone">👤</span>
        )}
      </button>

      <div className="joueur_details">
        <div className="joueur_identite">
          <span className="joueur_pseudo">{pseudo}</span>
          <span className="joueur_niveau">Niv. {niveau}</span>
          <div className="joueur_coins" title="Coins gagnés">
            <svg className="icone_coin" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" fill="#fbbf24" />
              <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="12" fontWeight="bold" fill="#b45309">C</text>
            </svg>
            <span>{coins}</span>
          </div>
        </div>

        <div className="joueur_stats">
          <div className="joueur_stat">
            <span className="joueur_stat_valeur">{distance} m</span>
            <span className="joueur_stat_label">Distance</span>
          </div>
          <div className="joueur_stat">
            <span className="joueur_stat_valeur">Position : {position}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


// --- Modale de profil : 3 onglets navigables (Profil / Stats / Social).
// L'onglet actif est un simple état React ; aucun rechargement de page,
// aucune donnée envoyée nulle part pour Stats/Social (structure prête pour
// être complétée plus tard).
function ModalProfil({ ouvert, fermer, pseudo, distanceTotale, historiqueJoursPomodoro, photoProfil, onEnregistrerPhotoProfil, enregistrementPhotoEnCours, erreurPhotoProfil, coins, musiqueAmbiance, bio, setBio, titreSession, numeroSession, taches, sessionsSauvegardees, onConsulterSession }) {
  const [ongletActif, setOngletActif] = useState('profil');

  // Revient toujours sur l'onglet "Profil" à chaque réouverture de la modale
  useEffect(() => {
    if (ouvert) setOngletActif('profil');
  }, [ouvert]);

  if (!ouvert) return null;

  const ONGLETS_PROFIL = [
    { id: 'profil', label: 'Profil' },
    { id: 'planning', label: 'Planning' },
    { id: 'historique', label: 'Historique' },
    { id: 'mon_runner', label: 'mon runner' },
    { id: 'social', label: 'Social' },
    { id: 'progression', label: 'Progression' },
    { id: 'boutique', label: 'Boutique' },
    { id: 'parametres', label: 'Paramètres' },
  ];

  return (
    <div className="modal_fond" onClick={fermer}>
      <div className="modal_fenetre profil_modal_fenetre" onClick={(e) => e.stopPropagation()}>
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>

        <div className="profil_onglets" role="tablist">
          {ONGLETS_PROFIL.map((onglet) => (
            <button
              key={onglet.id}
              type="button"
              role="tab"
              aria-selected={ongletActif === onglet.id}
              className={`profil_onglet_btn ${ongletActif === onglet.id ? 'profil_onglet_btn--actif' : ''}`}
              onClick={() => setOngletActif(onglet.id)}
            >
              {onglet.label}
            </button>
          ))}
        </div>

        <div className="profil_onglet_contenu">
          {ongletActif === 'profil' && (
            <OngletProfil
              pseudo={pseudo}
              distanceTotale={distanceTotale}
              historiqueJoursPomodoro={historiqueJoursPomodoro}
              photoProfil={photoProfil}
              musiqueAmbiance={musiqueAmbiance}
              bio={bio}
              titreSession={titreSession}
              numeroSession={numeroSession}
              taches={taches}
            />
          )}
          {ongletActif === 'planning' && (
            <OngletPlanning />
          )}
          {ongletActif === 'historique' && (
            <OngletHistorique sessionsSauvegardees={sessionsSauvegardees} onConsulter={onConsulterSession} />
          )}
          {ongletActif === 'mon_runner' && <OngletMonRunner />}
          {ongletActif === 'stats' && <OngletStats />}
          {ongletActif === 'social' && <OngletSocial />}
          {ongletActif === 'parametres' && (
            <OngletParametres
              pseudo={pseudo}
              photoProfil={photoProfil}
              onEnregistrerPhotoProfil={onEnregistrerPhotoProfil}
              enregistrementPhotoEnCours={enregistrementPhotoEnCours}
              erreurPhotoProfil={erreurPhotoProfil}
              bio={bio}
              setBio={setBio}
            />
          )}
          {ongletActif === 'progression' && <OngletProgression distanceTotale={distanceTotale} />}
          {ongletActif === 'boutique' && <OngletBoutique coins={coins} />}
        </div>
      </div>
    </div>
  );
}

function OngletMonRunner() {
  const DEFAULT_COLORS = {
    '--couleur-chaussure': '#f4f6fb',
    '--couleur-chaussure-blanc': '#ffffff',
    '--couleur-chaussure-fonce': '#ffffff',
    '--couleur-bras': '#2563eb',
    '--couleur-jambes': '#e84c9d',
    '--couleur-mains': '#2563eb',
    '--couleur-torse': '#000000',
    '--couleur-fessier': '#e84c9d',
    '--couleur-tete': '#2563eb',
    '--couleur-visage': '#050505',
  };

  const CATEGORIES = [
    {
      id: 'peau',
      label: 'Couleur de peau',
      vars: ['--couleur-tete', '--couleur-bras', '--couleur-mains']
    },
    {
      id: 'chaussures',
      label: 'Chaussures',
      vars: ['--couleur-chaussure', '--couleur-chaussure-blanc', '--couleur-chaussure-fonce']
    },
    {
      id: 'bas',
      label: 'Bas du corps',
      vars: ['--couleur-jambes', '--couleur-fessier']
    },
    {
      id: 'tshirt',
      label: 'Tee-shirt',
      vars: ['--couleur-torse']
    },
    {
      id: 'visage',
      label: 'Visage',
      vars: ['--couleur-visage']
    }
  ];

  const iframeRef = useRef(null);
  const [colors, setColors] = useState(() => {
    const saved = localStorage.getItem('runnerColors');
    return saved ? JSON.parse(saved) : DEFAULT_COLORS;
  });
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleCategoryChange = (category, value) => {
    const newColors = { ...colors };
    category.vars.forEach(v => {
      newColors[v] = value;
    });
    setColors(newColors);

    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'UPDATE_RUNNER_COLORS', colors: newColors },
        '*'
      );
    }
  };

  const handleSave = () => {
    localStorage.setItem('runnerColors', JSON.stringify(colors));
    const iframes = document.querySelectorAll('iframe.coureur_defilant, iframe.mon_runner_iframe');
    iframes.forEach(iframe => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          { type: 'UPDATE_RUNNER_COLORS', colors: colors },
          '*'
        );
      }
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  return (
    <div className="profil_onglet_panneau mon_runner_onglet">
      <div className="mon_runner_layout">
        <div className="mon_runner_apercu">
          <iframe
            ref={iframeRef}
            src="/runner.html"
            title="Aperçu du runner"
            className="mon_runner_iframe"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
        <div className="mon_runner_editeur">
          <h3 className="mon_runner_titre">Personnalise ton coureur</h3>
          <div className="mon_runner_colors_list">
            {CATEGORIES.map(category => {
              // La couleur affichée pour la catégorie est celle de sa première variable CSS
              const categoryColor = colors[category.vars[0]] || '#000000';
              return (
                <div key={category.id} className="mon_runner_color_item">
                  <label htmlFor={category.id}>{category.label}</label>
                  <div className="mon_runner_color_picker_wrap">
                    <input
                      type="color"
                      id={category.id}
                      value={categoryColor}
                      onChange={(e) => handleCategoryChange(category, e.target.value)}
                    />
                    <span className="mon_runner_color_valeur">{categoryColor.toUpperCase()}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="btn_primaire mon_runner_btn_save" onClick={handleSave}>
            {savedFeedback ? 'Enregistré ✓' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Onglet "Profil" : identité, médailles (emplacement réservé) et
// heatmap mensuelle des jours avec au moins un Pomodoro terminé.
function OngletProfil({ pseudo, distanceTotale, historiqueJoursPomodoro, photoProfil, musiqueAmbiance, bio, titreSession, numeroSession, taches }) {
  const aUneSessionActive = taches && taches.length > 0;
  const nomSession = titreSession && titreSession.trim() !== '' ? titreSession.trim() : `Session ${numeroSession}`;
  const affichageSession = aUneSessionActive ? nomSession : 'Aucune session active';

  return (
    <div className="profil_onglet_panneau profil_onglet_panneau--profil">
      <div className="profil_layout">
        <div className="profil_colonne_infos">
          <div className="profil_entete">
            <div className="profil_photo">
              {photoProfil?.dataUrl ? (
                <img
                  src={photoProfil.dataUrl}
                  alt={`Photo de profil de ${pseudo}`}
                  className="profil_photo_img"
                  style={{ objectPosition: `${photoProfil.position?.x ?? 50}% ${photoProfil.position?.y ?? 50}%` }}
                  draggable={false}
                />
              ) : (
                <span className="profil_photo_icone">👤</span>
              )}
            </div>
            <span className="profil_pseudo">{pseudo}</span>
          </div>

          <p className="modal_distance_totale">
            Distance totale parcourue : <strong>{distanceTotale} m</strong>
          </p>

          <div className="profil_section">
            <h4 className="profil_section_titre">Présentation</h4>
            <div className="profil_bio_carte" style={{ padding: '16px', background: 'rgba(0, 0, 0, 0.03)', borderRadius: '12px', color: '#1f2430', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', width: '100%', maxWidth: '400px', minHeight: '100px', border: '1px solid rgba(0,0,0,0.05)' }}>
              {bio ? bio : "Présentez-vous..."}
            </div>
          </div>

          <div className="profil_section">
            <h4 className="profil_section_titre">Médailles</h4>
            <div className="profil_medailles_grille">
              {/* Emplacement visuel réservé : aucune médaille pour l'instant */}
            </div>
          </div>

          <div className="profil_section">
            <h4 className="profil_section_titre">Activité Pomodoro</h4>
            <HeatmapPomodoro historique={historiqueJoursPomodoro} />
          </div>
        </div>

        <div className="profil_colonne_activite">
          <div className="profil_activite_carte_unique" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'transparent', padding: '24px', gap: '16px' }}>

            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '10px', textAlign: 'center', width: '100%' }}>
              <span className="badge_activite" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                {aUneSessionActive ? 'En cours' : 'Activité'}
              </span>
              <span className="titre_session" style={{ fontWeight: aUneSessionActive ? '600' : 'normal', fontSize: '1rem', color: '#1f2430' }}>
                {affichageSession}
              </span>
            </div>

            {musiqueAmbiance ? (
              <>
                <div style={{ width: '70%', aspectRatio: '1 / 1', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 6px 16px rgba(0,0,0,0.3)', marginTop: '8px' }}>
                  <MiniatureMusique
                    className="musique_cover_profil"
                    iconeClassName="musique_cover_profil_icone"
                    type={musiqueAmbiance.type}
                    thumbnail={musiqueAmbiance.thumbnail}
                  />
                </div>
                <span style={{ textAlign: 'center', fontWeight: '500', fontSize: '1.05rem', color: '#1f2430', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {musiqueAmbiance.titre || musiqueAmbiance.title || 'Musique en cours'}
                </span>
              </>
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', marginTop: '20px' }}>
                Aucune musique en lecture
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Onglet "Historique" : liste des anciennes sessions Pomodoro archivées.
// Réutilise la même structure de tableau que FenetreAnciennesSessions mais
// directement intégrée dans la modale de profil.
function OngletHistorique({ sessionsSauvegardees, onConsulter }) {
  const [recherche, setRecherche] = useState('');
  const [critereTri, setCritereTri] = useState('chronologie');
  const [ordreCroissant, setOrdreCroissant] = useState(false);

  const sessionsFiltrees = (sessionsSauvegardees || []).filter((s) => {
    const cible = recherche.trim().toLowerCase();
    if (!cible) return true;
    return (
      s.titre.toLowerCase().includes(cible) ||
      s.numero.toLowerCase().includes(cible)
    );
  });

  const sessionsTriees = [...sessionsFiltrees].sort((a, b) => {
    let valA, valB;

    if (critereTri === 'chronologie') {
      valA = parseInt(a.id.split('_')[1]) || 0;
      valB = parseInt(b.id.split('_')[1]) || 0;
    } else if (critereTri === 'theme') {
      valA = a.titre.toLowerCase();
      valB = b.titre.toLowerCase();
    } else if (critereTri === 'tachesCompletees') {
      valA = a.notes.filter(n => n.terminee).length;
      valB = b.notes.filter(n => n.terminee).length;
    }

    if (valA < valB) return ordreCroissant ? -1 : 1;
    if (valA > valB) return ordreCroissant ? 1 : -1;
    return 0;
  });

  return (
    <div className="profil_onglet_panneau profil_onglet_panneau--historique">
      <h3 className="profil_section_titre" style={{ marginBottom: 12 }}>Anciennes sessions</h3>

      <div className="historique_controles">
        <input
          type="text"
          placeholder="Rechercher par titre ou numéro..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="historique_recherche_input"
        />

        <select
          className="historique_tri_select"
          value={critereTri}
          onChange={(e) => setCritereTri(e.target.value)}
        >
          <option value="chronologie">Chronologie</option>
          <option value="theme">Thème</option>
          <option value="tachesCompletees">Tâches complétées</option>
        </select>

        <button
          type="button"
          className="historique_tri_btn"
          onClick={() => setOrdreCroissant(!ordreCroissant)}
          title={ordreCroissant ? "Ordre croissant" : "Ordre décroissant"}
        >
          {ordreCroissant ? '↑' : '↓'}
        </button>
      </div>

      <div className="historique_liste">
        {sessionsTriees.length === 0 ? (
          <p className="historique_vide">Aucune session trouvée.</p>
        ) : (
          <table className="sessions_tableau historique_tableau">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Numéro</th>
                <th>Date</th>
                <th>Heure</th>
                <th>Progression</th>
                <th>Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessionsTriees.map((s) => (
                <tr key={s.id}>
                  <td className="session_titre_cellule">{s.titre}</td>
                  <td>
                    <span className="session_numero_badge">#{s.numero}</span>
                  </td>
                  <td>{s.date}</td>
                  <td>{s.heure}</td>
                  <td>
                    <span className="session_progression_badge">
                      {s.notes.filter((n) => n.terminee).length} / {s.notes.length}
                    </span>
                  </td>
                  <td>
                    <span className="session_notes_badge">{s.notes.length}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="session_action_btn"
                      onClick={() => onConsulter && onConsulter(s)}
                    >
                      Consulter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// --- Heatmap mensuelle façon GitHub : un carré par jour du mois en cours,
// actif dès qu'au moins un Pomodoro a été terminé ce jour-là.
function HeatmapPomodoro({ historique }) {
  const joursActifs = new Set(historique || []);

  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = maintenant.getMonth(); // 0-indexé
  const nombreJours = new Date(annee, mois + 1, 0).getDate();
  const jours = Array.from({ length: nombreJours }, (_, i) => i + 1);
  const nomMois = maintenant.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="heatmap_pomodoro">
      <p className="heatmap_pomodoro_mois">{nomMois}</p>
      <div className="heatmap_pomodoro_grille">
        {jours.map((jour) => {
          const iso = formaterJourIso(new Date(annee, mois, jour));
          const actif = joursActifs.has(iso);
          return (
            <span
              key={iso}
              className={`heatmap_pomodoro_case ${actif ? 'heatmap_pomodoro_case--actif' : ''}`}
              title={`${jour} ${nomMois}${actif ? ' — au moins un Pomodoro terminé' : ''}`}
            />
          );
        })}
      </div>
    </div>
  );
}

// --- Onglet "Planning" : Gestion de sessions et tâches via un calendrier interactif
function OngletPlanning() {
  const { utilisateur } = useAuth();

  // Mois actuellement affiché (par défaut le 1er du mois courant pour simplifier)
  const aujourdhui = new Date();
  const [moisAffiche, setMoisAffiche] = useState(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1));

  // Date sélectionnée (format YYYY-MM-DD)
  const [dateSelectionnee, setDateSelectionnee] = useState(formaterJourIso(aujourdhui));

  // Données du mois (pour les bulles)
  const [donneesMois, setDonneesMois] = useState({});

  // Données du jour sélectionné
  const [titreSession, setTitreSession] = useState('');
  const [themeSession, setThemeSession] = useState('Concentration (par défaut)');
  const [notes, setNotes] = useState([]);

  const [enChargement, setEnChargement] = useState(true);

  // Charger les données globales du mois (les compteurs de notes)
  useEffect(() => {
    if (!utilisateur?.id) return;

    const chargerMois = async () => {
      const prefixe = `${moisAffiche.getFullYear()}-${String(moisAffiche.getMonth() + 1).padStart(2, '0')}`;
      const donnees = await chargerPlanningMois(utilisateur.id, prefixe);
      setDonneesMois(donnees);
    };
    chargerMois();
  }, [moisAffiche, utilisateur?.id]);

  // Charger les détails du jour
  useEffect(() => {
    if (!utilisateur?.id) return;

    let annule = false;
    const chargerJour = async () => {
      setEnChargement(true);
      const data = await chargerPlanningJour(utilisateur.id, dateSelectionnee);
      if (!annule) {
        setTitreSession(data.titreSession || '');
        setThemeSession(data.themeSession || 'Concentration (par défaut)');
        setNotes(data.notes || []);
        setEnChargement(false);
      }
    };
    chargerJour();
    return () => { annule = true; };
  }, [dateSelectionnee, utilisateur?.id]);

  // Sauvegarde automatique (debounce)
  useEffect(() => {
    if (enChargement || !utilisateur?.id) return;

    const timeout = setTimeout(() => {
      sauvegarderPlanningJour(utilisateur.id, dateSelectionnee, {
        titreSession,
        themeSession,
        notes
      });

      // Mettre à jour le compteur du mois en local sans recharger depuis Firebase
      setDonneesMois(prev => ({
        ...prev,
        [dateSelectionnee]: notes.length
      }));
    }, 500);

    return () => clearTimeout(timeout);
  }, [titreSession, themeSession, notes, dateSelectionnee, utilisateur?.id, enChargement]);

  // Événements pour afficher les bulles sur le calendrier
  const events = Object.entries(donneesMois)
    .filter(([_, count]) => count > 0)
    .map(([date, count]) => ({
      date: date,
      extendedProps: { count }
    }));

  const renderEventContent = (eventInfo) => {
    return (
      <div className="planning_bulle_indicateur_fc">
        {eventInfo.event.extendedProps.count}
      </div>
    );
  };

  const THEMES_SESSION = [
    'Concentration (par défaut)',
    'Créativité',
    'Administratif',
    'Révision / Étude',
    'Sport / Physique',
    'Détente / Pause'
  ];

  const handleAjouterNote = () => {
    const id = Date.now().toString();
    setNotes([...notes, { id, contenu: '', terminee: false }]);
  };

  const handleModifierNote = (id, nouveauContenu) => {
    setNotes(notes.map(n => n.id === id ? { ...n, contenu: nouveauContenu } : n));
  };

  const handleToggleNote = (id) => {
    setNotes(notes.map(n => n.id === id ? { ...n, terminee: !n.terminee } : n));
  };

  const handleSupprimerNote = (id) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const dateFormatee = new Date(dateSelectionnee).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="planning_layout">
      {/* Colonne Gauche : Calendrier */}
      <div className="planning_colonne_calendrier">
        <div className="planning_calendrier_conteneur">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={moisAffiche}
            events={events}
            eventContent={renderEventContent}
            dateClick={(info) => {
              setDateSelectionnee(info.dateStr);
            }}
            datesSet={(info) => {
              const middleDate = new Date((info.start.getTime() + info.end.getTime()) / 2);
              // Avoid infinite loops by only updating if the month/year changed
              if (middleDate.getMonth() !== moisAffiche.getMonth() || middleDate.getFullYear() !== moisAffiche.getFullYear()) {
                setMoisAffiche(middleDate);
              }
            }}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            firstDay={1} // Lundi
            height="100%"
          />
        </div>
      </div>

      {/* Colonne Droite : Détails */}
      <div className="planning_colonne_details">
        <h3 className="planning_details_entete" style={{ textTransform: 'capitalize' }}>
          {dateFormatee}
        </h3>

        {enChargement ? (
          <p className="social_message_info">Chargement...</p>
        ) : (
          <>
            <div className="planning_groupe_champ">
              <label className="planning_label">Titre de la session</label>
              <input
                type="text"
                className="planning_input"
                placeholder="Ex: Révision Mathématiques..."
                value={titreSession}
                onChange={(e) => setTitreSession(e.target.value)}
              />
            </div>

            <div className="planning_groupe_champ">
              <label className="planning_label">Thème</label>
              <select
                className="planning_select"
                value={themeSession}
                onChange={(e) => setThemeSession(e.target.value)}
              >
                {THEMES_SESSION.map(theme => (
                  <option key={theme} value={theme}>{theme}</option>
                ))}
              </select>
            </div>

            <div className="planning_groupe_champ" style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="planning_label">Tâches / Notes</label>
                <button type="button" className="btn_primaire" style={{ fontSize: '0.85rem', padding: '6px 12px' }} onClick={handleAjouterNote}>
                  + Ajouter
                </button>
              </div>

              <div className="planning_notes_liste">
                {notes.length === 0 ? (
                  <p className="social_message_info" style={{ textAlign: 'left', fontSize: '0.9rem' }}>Aucune note pour ce jour.</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="planning_note_item">
                      <input
                        type="checkbox"
                        checked={note.terminee}
                        onChange={() => handleToggleNote(note.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        className={`planning_note_input ${note.terminee ? 'terminee' : ''}`}
                        value={note.contenu}
                        onChange={(e) => handleModifierNote(note.id, e.target.value)}
                        placeholder="Texte de la note..."
                      />
                      <button
                        type="button"
                        className="planning_note_btn_supprimer"
                        onClick={() => handleSupprimerNote(note.id)}
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Onglet "Stats" : structure minimale pour l'instant, pensée pour
// accueillir plus tard des sections (temps de concentration, séries de
// Pomodoro, progression, records...) sans revoir l'organisation générale.
function OngletStats() {
  return (
    <div className="profil_onglet_panneau profil_onglet_panneau--stats">
      <h4 className="profil_section_titre">Stats</h4>
      {/* Emplacements réservés pour de futures sections statistiques, ex :
          <div className="profil_section">...temps de concentration...</div>
          <div className="profil_section">...séries de Pomodoro...</div>
          <div className="profil_section">...progression...</div>
          <div className="profil_section">...records...</div> */}
    </div>
  );
}

// --- Onglet "Social" : partagé en deux colonnes.
// Gauche : recherche d'utilisateurs (barre de recherche + résultats placeholder).
// Droite : liste d'amis (placeholder), avec statut et actions rapides.
function OngletSocial() {
  const { utilisateur } = useAuth();
  const [rechercheTerme, setRechercheTerme] = useState('');
  const [resultatsRecherche, setResultatsRecherche] = useState([]);
  const [enChargementRecherche, setEnChargementRecherche] = useState(false);

  // Recherche dynamique avec debounce
  useEffect(() => {
    let timeoutId;

    const lancerRecherche = async () => {
      if (!rechercheTerme || rechercheTerme.trim().length < 2) {
        setResultatsRecherche([]);
        return;
      }

      setEnChargementRecherche(true);
      try {
        const resultats = await rechercherUtilisateurs(rechercheTerme, utilisateur?.id);
        setResultatsRecherche(resultats);
      } catch (err) {
        console.error("Erreur lors de la recherche :", err);
        setResultatsRecherche([]);
      } finally {
        setEnChargementRecherche(false);
      }
    };

    if (rechercheTerme.trim().length >= 2) {
      timeoutId = setTimeout(lancerRecherche, 300); // 300ms de debounce
    } else {
      setResultatsRecherche([]);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [rechercheTerme, utilisateur?.id]);

  const [amis, setAmis] = useState([]);
  const [demandesRecues, setDemandesRecues] = useState([]);
  const [demandesEnvoyees, setDemandesEnvoyees] = useState([]);
  const [chargementSocial, setChargementSocial] = useState(true);

  const chargerDonneesSociales = async () => {
    if (!utilisateur?.id) return;
    setChargementSocial(true);
    try {
      const amisData = await getAmis(utilisateur.id);
      const recuesData = await getDemandesAmis(utilisateur.id);
      const envoyeesData = await getDemandesEnvoyees(utilisateur.id);

      setAmis(amisData);
      setDemandesRecues(recuesData);
      setDemandesEnvoyees(envoyeesData);
    } catch (err) {
      console.error("Erreur chargement social:", err);
    } finally {
      setChargementSocial(false);
    }
  };

  useEffect(() => {
    chargerDonneesSociales();
  }, [utilisateur?.id]);

  const handleAjouterAmi = async (destinataireId) => {
    if (!utilisateur?.id) return;
    try {
      await envoyerDemandeAmi(utilisateur.id, destinataireId);
      await chargerDonneesSociales();
    } catch (err) {
      console.error("Erreur ajout ami", err);
    }
  };

  const handleRepondreDemande = async (demandeId, reponse) => {
    try {
      await repondreDemandeAmi(demandeId, reponse);
      await chargerDonneesSociales();
    } catch (err) {
      console.error("Erreur reponse demande", err);
    }
  };

  // Helper pour savoir si on a déjà envoyé/reçu/accepté une demande avec un utilisateur
  const getStatutAmi = (userId) => {
    if (amis.some(a => a.amiId === userId)) return 'ami';
    if (demandesEnvoyees.some(d => d.destinataire_id === userId)) return 'envoyee';
    if (demandesRecues.some(d => d.expediteur_id === userId)) return 'recue';
    return 'aucun';
  };

  return (
    <div className="profil_onglet_panneau profil_onglet_panneau--social">
      <div className="social_layout">

        {/* Colonne gauche : recherche d'utilisateurs */}
        <div className="social_colonne social_colonne_recherche">
          <h4 className="profil_section_titre">Rechercher des utilisateurs</h4>

          <input
            type="text"
            className="social_recherche_input"
            placeholder="Rechercher un pseudo ou email..."
            value={rechercheTerme}
            onChange={(e) => setRechercheTerme(e.target.value)}
          />

          <div className="social_resultats_liste">
            {enChargementRecherche ? (
              <p className="social_message_info">Recherche en cours...</p>
            ) : resultatsRecherche.length > 0 ? (
              resultatsRecherche.map((resultat) => {
                const statut = getStatutAmi(resultat.id);
                return (
                  <div key={resultat.id} className="social_resultat_rectangle social_carte_compacte">
                    <div className="social_resultat_infos">
                      <div className="social_resultat_photo">
                        {resultat.photo_profil ? (
                          <img src={resultat.photo_profil} alt={`Profil de ${resultat.pseudo}`} className="social_resultat_photo_img" />
                        ) : (
                          <span className="social_resultat_photo_icone">👤</span>
                        )}
                      </div>
                      <div className="social_resultat_identite">
                        <span className="social_resultat_pseudo">{resultat.pseudo}</span>
                        <span className="social_resultat_niveau">Niv. {resultat.niveau}</span>
                      </div>
                    </div>

                    {statut === 'aucun' && (
                      <button type="button" className="btn_secondaire social_resultat_btn_ajouter" onClick={() => handleAjouterAmi(resultat.id)}>
                        Ajouter
                      </button>
                    )}
                    {statut === 'envoyee' && (
                      <button type="button" className="btn_secondaire social_resultat_btn_ajouter" disabled style={{ opacity: 0.6 }}>
                        En attente
                      </button>
                    )}
                    {statut === 'recue' && (
                      <button type="button" className="btn_secondaire social_resultat_btn_ajouter" disabled style={{ opacity: 0.6 }}>
                        Demande reçue
                      </button>
                    )}
                    {statut === 'ami' && (
                      <button type="button" className="btn_secondaire social_resultat_btn_ajouter" disabled style={{ opacity: 0.6 }}>
                        Déjà ami
                      </button>
                    )}
                  </div>
                );
              })
            ) : rechercheTerme.trim().length >= 2 ? (
              <p className="social_message_info">Aucun utilisateur trouvé.</p>
            ) : (
              <p className="social_message_info">Cherchez des amis avec qui courir, travailler et évoluer ensemble.</p>
            )}
          </div>
        </div>

        {/* Colonne droite : liste d'amis */}
        <div className="social_colonne social_colonne_amis">
          <h4 className="profil_section_titre">Liste d'amis</h4>

          <div className="social_amis_liste">
            {chargementSocial ? (
              <p className="social_message_info">Chargement de vos amis...</p>
            ) : (
              <>
                {demandesRecues.length > 0 && (
                  <div className="social_demandes_section">
                    <h5 style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px', marginTop: 0 }}>Demandes reçues</h5>
                    {demandesRecues.map((demande) => (
                      <div key={demande.id} className="social_ami_rectangle social_carte_compacte">
                        <div className="social_ami_photo">
                          {demande.expediteur?.photo_profil ? (
                            <img src={demande.expediteur.photo_profil} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            <span className="social_ami_photo_icone">👤</span>
                          )}
                        </div>
                        <div className="social_ami_contenu">
                          <div className="social_ami_ligne_haut">
                            <span className="social_ami_pseudo">{demande.expediteur?.pseudo}</span>
                            <div className="social_ami_actions">
                              <button type="button" className="btn_secondaire" onClick={() => handleRepondreDemande(demande.id, 'refusee')}>
                                Refuser
                              </button>
                              <button type="button" className="btn_primaire" onClick={() => handleRepondreDemande(demande.id, 'acceptee')}>
                                Accepter
                              </button>
                            </div>
                          </div>
                          <span className="social_ami_activite_label">Niv. {demande.expediteur?.niveau}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {amis.length > 0 ? (
                  <div className="social_amis_approuves">
                    {demandesRecues.length > 0 && <h5 style={{ fontSize: '0.85rem', color: '#6b7280', margin: '16px 0 8px 0' }}>Amis</h5>}
                    {amis.map((ami) => (
                      <div key={ami.id} className="social_ami_rectangle social_carte_compacte">
                        <div className="social_ami_photo">
                          {ami.photo_profil ? (
                            <img src={ami.photo_profil} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            <span className="social_ami_photo_icone">👤</span>
                          )}
                        </div>
                        <div className="social_ami_contenu">
                          <div className="social_ami_ligne_haut">
                            <span className="social_ami_pseudo">{ami.pseudo}</span>
                          </div>
                          <span className="social_ami_activite_label">Niv. {ami.niveau}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  demandesRecues.length === 0 && (
                    <p className="social_message_info">Vous n'avez actuellement aucun ami.</p>
                  )
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}


// --- Onglet "Paramètres" : gestion du compte (photo de profil avec
// repositionnement, e-mail, mot de passe, comptes liés, suppression de
// compte) et des informations personnelles (date de naissance, sexe).
// Purement front-end pour l'instant : aucune donnée n'est envoyée à un
// serveur, "Enregistrer les modifications" est un emplacement réservé
// prêt à être branché sur une vraie API plus tard.
// --- Onglet "Progression" : Jauge d'expérience et récompenses
function OngletProgression({ distanceTotale }) {
  const NIVEAUX = [
    { id: 'C1', distance: 1000, recompense: 'Récompense 1' },
    { id: 'C2', distance: 5000, recompense: 'Récompense 2' },
    { id: 'C3', distance: 10000, recompense: 'Récompense 3' },
    { id: 'C4', distance: 20000, recompense: 'Récompense 4' },
    { id: 'C5', distance: 45000, recompense: 'Récompense 5' },
  ];

  let pourcentage = 0;
  let prochainNiveau = null;
  let distanceRestanteInfo = '';

  if (distanceTotale < NIVEAUX[0].distance) {
    pourcentage = (distanceTotale / NIVEAUX[0].distance) * 20;
    prochainNiveau = NIVEAUX[0];
    distanceRestanteInfo = `${Math.floor(distanceTotale)} m / ${NIVEAUX[0].distance} m pour atteindre ${NIVEAUX[0].id}`;
  } else if (distanceTotale >= NIVEAUX[4].distance) {
    pourcentage = 100;
    distanceRestanteInfo = 'Niveau maximum atteint !';
  } else {
    for (let i = 0; i < NIVEAUX.length - 1; i++) {
      if (distanceTotale >= NIVEAUX[i].distance && distanceTotale < NIVEAUX[i + 1].distance) {
        const base = (i + 1) * 20;
        const progressionDansSegment = (distanceTotale - NIVEAUX[i].distance) / (NIVEAUX[i + 1].distance - NIVEAUX[i].distance);
        pourcentage = base + (progressionDansSegment * 20);
        prochainNiveau = NIVEAUX[i + 1];
        distanceRestanteInfo = `${Math.floor(distanceTotale)} m / ${NIVEAUX[i + 1].distance} m pour atteindre ${NIVEAUX[i + 1].id}`;
        break;
      }
    }
  }

  return (
    <div className="profil_onglet_panneau">
      <h3 className="progression_titre">Votre Progression</h3>
      <p className="progression_sous_titre">{distanceRestanteInfo}</p>

      <div className="progression_container">
        <div className="progression_barre_fond">
          <div
            className="progression_barre_remplissage"
            style={{ width: `${pourcentage}%` }}
          ></div>
        </div>

        <div className="progression_etapes">
          {NIVEAUX.map((niveau, index) => {
            const estAtteint = distanceTotale >= niveau.distance;
            const positionFixe = (index + 1) * 20;

            return (
              <div
                key={niveau.id}
                className={`progression_etape ${estAtteint ? 'progression_etape--atteint' : ''}`}
                style={{ left: `${positionFixe}%` }}
              >
                <div className="progression_etape_haut">
                  <span className="progression_etape_id">{niveau.id}</span>
                  <span className="progression_etape_distance">{niveau.distance.toLocaleString()} m</span>
                </div>
                <div className="progression_point">
                  {estAtteint && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="progression_icone_valide">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="progression_etape_bas">
                  <span className="progression_etape_recompense">{niveau.recompense}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Onglet "Boutique" : Achats avec les Coins
function OngletBoutique({ coins }) {
  return (
    <div className="profil_onglet_panneau boutique_panneau">
      <div className="boutique_entete">
        <h3 className="boutique_titre">Boutique</h3>
        <div className="boutique_solde">
          <span>Solde :</span>
          <div className="joueur_coins">
            <svg className="icone_coin" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" fill="#fbbf24" />
              <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="12" fontWeight="bold" fill="#b45309">C</text>
            </svg>
            <span>{coins}</span>
          </div>
        </div>
      </div>

      <div className="boutique_contenu_vide">
        <div className="boutique_placeholder_icone">🛒</div>
        <p className="boutique_placeholder_texte">
          La boutique sera bientôt disponible.<br />
          Continuez vos sessions pour gagner des Coins !
        </p>
      </div>
    </div>
  );
}

function OngletParametres({ pseudo, photoProfil, onEnregistrerPhotoProfil, enregistrementPhotoEnCours, erreurPhotoProfil, bio, setBio }) {
  const { deconnexion, connecte } = useAuth();

  const [photoDataUrl, setPhotoDataUrl] = useState(photoProfil?.dataUrl ?? null);
  const [positionPhoto, setPositionPhoto] = useState(photoProfil?.position ?? { x: 50, y: 50 });

  useEffect(() => {
    setPhotoDataUrl(photoProfil?.dataUrl ?? null);
    setPositionPhoto(photoProfil?.position ?? { x: 50, y: 50 });
  }, [photoProfil]);

  const [email, setEmail] = useState('');
  const [motDePasseActuel, setMotDePasseActuel] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');

  const [dateNaissance, setDateNaissance] = useState('');
  const [sexe, setSexe] = useState('');

  const [suppressionCompteOuverte, setSuppressionCompteOuverte] = useState(false);

  // --- Bio local state ---
  const [bioTemp, setBioTemp] = useState(bio || '');
  const [bioErreur, setBioErreur] = useState('');

  useEffect(() => {
    setBioTemp(bio || '');
  }, [bio]);

  const zonePhotoRef = useRef(null);
  const glissementRef = useRef(null);

  const gererChoixPhoto = (evenement) => {
    const fichier = evenement.target.files?.[0];
    if (!fichier) return;

    if (fichier.size > 5 * 1024 * 1024) {
      alert("L'image est trop volumineuse (max 5 Mo).");
      return;
    }

    const lecteur = new FileReader();
    lecteur.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_TAILLE = 400;
        let largeur = img.width;
        let hauteur = img.height;

        if (largeur > hauteur && largeur > MAX_TAILLE) {
          hauteur *= MAX_TAILLE / largeur;
          largeur = MAX_TAILLE;
        } else if (hauteur > MAX_TAILLE) {
          largeur *= MAX_TAILLE / hauteur;
          hauteur = MAX_TAILLE;
        }

        const canvas = document.createElement('canvas');
        canvas.width = largeur;
        canvas.height = hauteur;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, largeur, hauteur);

        const dataUrlCompresser = canvas.toDataURL('image/jpeg', 0.8);

        setPhotoDataUrl(dataUrlCompresser);
        setPositionPhoto({ x: 50, y: 50 });
      };
      img.src = e.target.result;
    };
    lecteur.readAsDataURL(fichier);
  };

  const gererGlissement = (evenement) => {
    if (!glissementRef.current || !zonePhotoRef.current) return;
    const rect = zonePhotoRef.current.getBoundingClientRect();

    const deltaXPourcent = ((evenement.clientX - glissementRef.current.startX) / rect.width) * 100;
    const deltaYPourcent = ((evenement.clientY - glissementRef.current.startY) / rect.height) * 100;

    setPositionPhoto({
      x: Math.min(100, Math.max(0, glissementRef.current.startPosX - deltaXPourcent)),
      y: Math.min(100, Math.max(0, glissementRef.current.startPosY - deltaYPourcent)),
    });
  };

  const arreterGlissement = () => {
    glissementRef.current = null;
    window.removeEventListener('mousemove', gererGlissement);
    window.removeEventListener('mouseup', arreterGlissement);
  };

  const demarrerGlissement = (evenement) => {
    if (!photoDataUrl) return;
    glissementRef.current = {
      startX: evenement.clientX,
      startY: evenement.clientY,
      startPosX: positionPhoto.x,
      startPosY: positionPhoto.y,
    };
    window.addEventListener('mousemove', gererGlissement);
    window.addEventListener('mouseup', arreterGlissement);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', gererGlissement);
      window.removeEventListener('mouseup', arreterGlissement);
    };
  }, []);

  const enregistrerModifications = async () => {
    if (bioTemp.length > 350) {
      setBioErreur('Votre bio ne peut pas dépasser 350 caractères.');
      return;
    }
    setBioErreur('');

    if (connecte) {
      await onEnregistrerPhotoProfil({ dataUrl: photoDataUrl, position: positionPhoto });
      if (typeof setBio === 'function') {
        setBio(bioTemp);
      }
    }
    console.log('Modifications des paramètres (placeholder) :', {
      email,
      dateNaissance,
      sexe,
    });
  };

  return (
    <div className="profil_onglet_panneau profil_onglet_panneau--parametres">

      <div className="parametres_section">
        <div className="parametres_section_entete">
          <h4 className="profil_section_titre">Profil Public</h4>
          <button
            type="button"
            className="btn_primaire parametres_btn_enregistrer"
            onClick={enregistrerModifications}
            disabled={enregistrementPhotoEnCours}
          >
            {enregistrementPhotoEnCours ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginTop: '16px' }}>
          {/* Section Photo */}
          <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <h5 style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', alignSelf: 'flex-start' }}>Photo de profil</h5>
            {connecte ? (
              <>
                <div
                  className="parametres_photo_zone"
                  ref={zonePhotoRef}
                  onMouseDown={demarrerGlissement}
                >
                  {photoDataUrl ? (
                    <img
                      src={photoDataUrl}
                      alt={`Photo de profil de ${pseudo}`}
                      className="parametres_photo_apercu"
                      style={{ objectPosition: `${positionPhoto.x}% ${positionPhoto.y}%` }}
                      draggable={false}
                    />
                  ) : (
                    <span className="parametres_photo_icone_defaut">👤</span>
                  )}
                </div>

                {photoDataUrl && (
                  <p className="parametres_photo_aide" style={{ margin: 0, fontSize: '0.8rem' }}>Glissez pour recentrer</p>
                )}

                <label className="btn_secondaire parametres_photo_btn_choisir" style={{ margin: 0 }}>
                  Choisir une photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={gererChoixPhoto}
                    className="parametres_photo_input_fichier"
                  />
                </label>

                {erreurPhotoProfil && (
                  <p className="parametres_photo_erreur" style={{ margin: 0 }}>{erreurPhotoProfil}</p>
                )}
              </>
            ) : (
              <p className="parametres_photo_aide" style={{ maxWidth: '200px', textAlign: 'center' }}>
                Connecte-toi avec un compte pour choisir une photo.
              </p>
            )}
          </div>

          {/* Section Bio */}
          <div style={{ flex: '0 1 70%', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
            <h5 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#1f2430', fontWeight: '600' }}>Bio</h5>
            <textarea
              className="param_input"
              rows={5}
              style={{
                resize: 'vertical',
                background: '#ffffff',
                border: bioTemp.length > 350 ? '1px solid #ef4444' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                color: '#1f2430',
                width: '100%',
                flex: 1,
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
              }}
              placeholder="Présentez-vous..."
              value={bioTemp}
              onChange={(e) => {
                setBioTemp(e.target.value);
                setBioErreur('');
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginTop: '8px'
            }}>
              <span style={{
                fontSize: '0.8rem',
                color: bioTemp.length > 350 ? '#ef4444' : '#64748b',
                fontWeight: '500'
              }}>
                {bioTemp.length} / 350
              </span>
            </div>
            {bioErreur && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                {bioErreur}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Compte : e-mail et mot de passe --- */}
      <div className="parametres_section">
        <h4 className="profil_section_titre">Compte</h4>

        <label className="parametres_champ_label">
          Adresse e-mail associée
          <input
            type="email"
            className="parametres_champ_input"
            placeholder="votre@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="parametres_champ_label">
          Mot de passe actuel
          <input
            type="password"
            className="parametres_champ_input"
            value={motDePasseActuel}
            onChange={(e) => setMotDePasseActuel(e.target.value)}
          />
        </label>

        <label className="parametres_champ_label">
          Nouveau mot de passe
          <input
            type="password"
            className="parametres_champ_input"
            value={nouveauMotDePasse}
            onChange={(e) => setNouveauMotDePasse(e.target.value)}
          />
        </label>

        <label className="parametres_champ_label">
          Confirmer le nouveau mot de passe
          <input
            type="password"
            className="parametres_champ_input"
            value={confirmationMotDePasse}
            onChange={(e) => setConfirmationMotDePasse(e.target.value)}
          />
        </label>
      </div>

      {/* --- Informations personnelles --- */}
      <div className="parametres_section">
        <h4 className="profil_section_titre">Informations personnelles</h4>

        <label className="parametres_champ_label">
          Date de naissance
          <input
            type="date"
            className="parametres_champ_input"
            value={dateNaissance}
            onChange={(e) => setDateNaissance(e.target.value)}
          />
        </label>

        <label className="parametres_champ_label">
          Sexe
          <select
            className="parametres_champ_input"
            value={sexe}
            onChange={(e) => setSexe(e.target.value)}
          >
            <option value="">Non précisé</option>
            <option value="femme">Femme</option>
            <option value="homme">Homme</option>
            <option value="autre">Autre</option>
          </select>
        </label>
      </div>

      {/* --- Comptes liés --- */}
      <div className="parametres_section">
        <h4 className="profil_section_titre">Comptes liés</h4>
        <button type="button" className="btn_secondaire parametres_btn_lier_google">
          Lier avec Google
        </button>
      </div>

      {/* --- Zone de danger : suppression du compte --- */}
      <div className="parametres_section parametres_section_danger">
        <h4 className="profil_section_titre">Zone de danger</h4>

        {!suppressionCompteOuverte ? (
          <button
            type="button"
            className="btn_danger parametres_btn_supprimer_compte"
            onClick={() => setSuppressionCompteOuverte(true)}
          >
            Supprimer le compte
          </button>
        ) : (
          <div className="parametres_confirmation_suppression">
            <p className="parametres_confirmation_suppression_texte">
              Êtes-vous sûr de vouloir supprimer définitivement votre compte ?
            </p>
            <div className="parametres_confirmation_suppression_actions">
              <button
                type="button"
                className="btn_secondaire"
                onClick={() => setSuppressionCompteOuverte(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn_danger"
                onClick={() => {
                  // Emplacement réservé : aucune suppression réelle pour l'instant
                  setSuppressionCompteOuverte(false);
                }}
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- Déconnexion --- */}
      <div className="parametres_section">
        <button
          type="button"
          className="btn_secondaire parametres_btn_deconnexion"
          onClick={deconnexion}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}


// --- Chrono : gère le cycle "travail" / "pause" dont les durées sont
// pilotées par les réglages (props dureeTravailMinutes / dureePauseMinutes).
// Les couleurs (chrono, boutons) sont appliquées globalement via des
// variables CSS (voir App > useEffect couleurs), pas via des props ici.
function Chrono({ enMarche, setEnMarche, onSessionTerminee, dureeTravailMinutes, dureePauseMinutes, modeLecture, onPhaseChange }) {
  // 'travail' = session Pomodoro classique, 'pause' = pause qui suit
  const [phase, setPhase] = useState('travail');

  const dureeTravail = dureeTravailMinutes * 60;
  const dureePause = dureePauseMinutes * 60;
  const dureeActuelle = phase === 'travail' ? dureeTravail : dureePause;

  const [secondesRestantes, setSecondesRestantes] = useState(dureeActuelle);
  const intervalRef = useRef(null);

  // Avertissement affiché quand on manipule le chrono pendant qu'on
  // consulte une ancienne session (onglet Notes en lecture seule) :
  // le temps de travail ne sera pas comptabilisé dans cette session-là.
  const [avertissementLectureSeule, setAvertissementLectureSeule] = useState(false);
  const timeoutAvertissementRef = useRef(null);

  const signalerLectureSeule = () => {
    if (!modeLecture) return;
    setAvertissementLectureSeule(true);
    clearTimeout(timeoutAvertissementRef.current);
    timeoutAvertissementRef.current = setTimeout(() => {
      setAvertissementLectureSeule(false);
    }, 3000);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutAvertissementRef.current);
  }, []);

  // Application "temps réel" des réglages de durée :
  // si le chrono est à l'arrêt, toute modification de durée dans les
  // Réglages met immédiatement à jour l'affichage. Si le chrono tourne,
  // la nouvelle durée sera prise en compte à la prochaine phase.
  useEffect(() => {
    if (!enMarche) {
      setSecondesRestantes(phase === 'travail' ? dureeTravail : dureePause);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dureeTravailMinutes, dureePauseMinutes, phase]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  useEffect(() => {
    if (enMarche) {
      intervalRef.current = setInterval(() => {
        setSecondesRestantes((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setEnMarche(false);

            if (phase === 'travail') {
              // Fin d'une session de travail : on comptabilise la distance
              // puis on bascule automatiquement sur la pause
              onSessionTerminee?.(Math.floor(dureeTravail / 5));
              setPhase('pause');
              return dureePause;
            } else {
              // Fin de la pause : retour à une nouvelle session de travail
              setPhase('travail');
              return dureeTravail;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [enMarche, phase, dureeTravail, dureePause]);

  const formaterTemps = (s) => {
    const minutes = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  };

  const start = () => {
    if (secondesRestantes > 0) setEnMarche(true);
  };

  const pause = () => {
    setEnMarche(false);
  };

  const reset = () => {
    setEnMarche(false);
    setSecondesRestantes(dureeActuelle);
  };

  const basculer = () => {
    signalerLectureSeule();
    if (enMarche) pause();
    else start();
  };

  // Passe directement de la pause à une nouvelle session de travail,
  // sans attendre la fin du décompte. N'a de sens qu'en phase "pause".
  const sauterPause = () => {
    if (phase !== 'pause') return;
    clearInterval(intervalRef.current);
    setEnMarche(false);
    setPhase('travail');
    setSecondesRestantes(dureeTravail);
  };

  const libelleBouton = enMarche
    ? <Pause size={20} />
    : secondesRestantes === dureeActuelle
      ? <Play size={20} />
      : secondesRestantes === 0
        ? 'Terminé'
        : 'Reprendre';

  // Distance simulée de la session en cours : 5 secondes écoulées = 1 mètre
  const secondesEcoulees = dureeActuelle - secondesRestantes;
  const distanceSession = Math.floor(secondesEcoulees / 5);

  return (
    <div className='chrono'>
      {/* Badge indiquant la phase actuelle (utile car le cycle travail/pause est automatique) */}
      <span className={`chrono_phase chrono_phase--${phase}`}>
        {phase === 'travail' ? '🎯 Session de travail' : '☕ Pause'}
      </span>

      <div className="chrono_affichage">{formaterTemps(secondesRestantes)}</div>
      <div className="chrono_controles">
        <button className="btn_primaire" onClick={basculer} disabled={secondesRestantes === 0}>
          {libelleBouton}
        </button>
        <button
          className="btn_secondaire"
          onClick={() => { signalerLectureSeule(); reset(); }}
        >
          Recommencer
        </button>
        {phase === 'pause' && (
          <button className="btn_secondaire" onClick={sauterPause}>
            Sauter la pause
          </button>
        )}
      </div>

      {avertissementLectureSeule && (
        <p className="chrono_avertissement_lecture" role="status">
          Le temps de travail ne sera pas ajouté à la session, vous êtes en lecture seule.
        </p>
      )}

      <div className="chrono_distance">
        <span className="chrono_distance_valeur">{distanceSession} m</span>
        <span className="chrono_distance_label">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
            <path d="M152,88a32,32,0,1,0-32-32A32,32,0,0,0,152,88Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,152,40Zm67.31,100.68c-.61.28-7.49,3.28-19.67,3.28-13.85,0-34.55-3.88-60.69-20a169.31,169.31,0,0,1-15.41,32.34,104.29,104.29,0,0,1,31.31,15.81C173.92,186.65,184,207.35,184,232a8,8,0,0,1-16,0c0-41.7-34.69-56.71-54.14-61.85-.55.7-1.12,1.41-1.69,2.1-19.64,23.8-44.25,36.18-71.63,36.18A92.29,92.29,0,0,1,31.2,208,8,8,0,0,1,32.8,192c25.92,2.58,48.47-7.49,67-30,12.49-15.14,21-33.61,25.25-47C86.13,92.35,61.27,111.63,61,111.84A8,8,0,1,1,51,99.36c1.5-1.2,37.22-29,89.51,6.57,45.47,30.91,71.93,20.31,72.18,20.19a8,8,0,1,1,6.63,14.56Z"></path>
          </svg>
        </span>
      </div>
    </div>
  );
}


// --- To-Do List (section "Notes") -------------------------------------
// Chaque tâche : { id, contenu, tags: string[], dateEcheance, terminee }

function genererIdTache() {
  return `tache_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

// Petit chip visuel représentant un tag, avec bouton de suppression
function TacheTag({ texte, onSupprimer }) {
  return (
    <span className="todo_tag">
      {texte}
      <button
        type="button"
        className="todo_tag_suppr"
        onClick={onSupprimer}
        aria-label={`Supprimer le tag ${texte}`}
      >
        ×
      </button>
    </span>
  );
}

// Barre supérieure commune à la carte et à la modale : tags + date d'échéance
function TacheBarre({ tags, onAjouterTag, onSupprimerTag, dateEcheance, onModifierDate }) {
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [valeurTag, setValeurTag] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (ajoutOuvert) inputRef.current?.focus();
  }, [ajoutOuvert]);

  const validerTag = () => {
    const texte = valeurTag.trim();
    if (texte) onAjouterTag(texte);
    setValeurTag('');
    setAjoutOuvert(false);
  };

  return (
    <div className="todo_carte_barre" onClick={(e) => e.stopPropagation()}>
      <div className="todo_tags">
        {tags.map((tag, i) => (
          <TacheTag key={`${tag}-${i}`} texte={tag} onSupprimer={() => onSupprimerTag(i)} />
        ))}

        {ajoutOuvert ? (
          <input
            ref={inputRef}
            type="text"
            className="todo_tag_input"
            value={valeurTag}
            maxLength={20}
            placeholder="Nouveau tag"
            onChange={(e) => setValeurTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') validerTag();
              if (e.key === 'Escape') { setValeurTag(''); setAjoutOuvert(false); }
            }}
            onBlur={validerTag}
          />
        ) : (
          <button
            type="button"
            className="todo_tag_ajouter"
            onClick={() => setAjoutOuvert(true)}
            aria-label="Ajouter un tag"
          >
            + tag
          </button>
        )}
      </div>

      <input
        type="date"
        className="todo_date"
        value={dateEcheance || ''}
        onChange={(e) => onModifierDate(e.target.value)}
        aria-label="Date d'échéance"
      />
    </div>
  );
}

// Zone de texte qui s'agrandit automatiquement selon son contenu
function TacheZoneTexte({ className, valeur, onChange, placeholder, autoFocus }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [valeur]);

  return (
    <textarea
      ref={ref}
      className={className}
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

// Une carte = une tâche, éditable directement dans la liste
function TacheCarte({ tache, actions, onAgrandir, lectureSeule }) {
  const zoneTexteRef = useRef(null);

  // Clique n'importe où dans la carte (hors boutons/inputs déjà gérés) -> focus l'édition
  const focaliserEdition = () => {
    zoneTexteRef.current?.focus();
  };

  return (
    <div
      className={`todo_carte ${tache.terminee ? 'todo_carte--terminee' : ''}${lectureSeule && !tache.terminee ? ' todo_carte--non-terminee-lecture' : ''}`}
      onClick={focaliserEdition}
    >
      <div className="todo_carte_actions_haut">
        <button
          type="button"
          className="todo_carte_suppr"
          onClick={(e) => { e.stopPropagation(); actions.supprimer(); }}
          aria-label="Supprimer la tâche"
          disabled={lectureSeule}
        >

        </button>
      </div>

      <textarea
        ref={zoneTexteRef}
        className="todo_contenu"
        value={tache.contenu}
        onChange={(e) => actions.modifierContenu(e.target.value)}
        placeholder="Écris ta tâche..."
        onClick={(e) => e.stopPropagation()}
        readOnly={lectureSeule}
      />

      <div className="todo_carte_actions">
        <button
          type="button"
          className="todo_btn_epingler"
          onClick={(e) => { e.stopPropagation(); actions.epingler(); }}
          title="Épingler sur le fond de la page"
          disabled={lectureSeule}
        >
          📌 Épingler
        </button>
        <button
          type="button"
          className={`todo_btn_terminer ${tache.terminee ? 'actif' : ''}`}
          onClick={(e) => { e.stopPropagation(); actions.toggleTerminee(); }}
          disabled={lectureSeule}
        >
          {tache.terminee ? '✓ Terminé' : 'Terminé'}
        </button>
        <button
          type="button"
          className="todo_btn_agrandir"
          onClick={(e) => { e.stopPropagation(); onAgrandir(); }}
          aria-label="Agrandir la tâche"
          title="Agrandir"
        >
          ⤢
        </button>
      </div>
    </div>
  );
}

// Modale d'édition "confortable" pour une tâche
function ModalTache({ tache, actions, fermer }) {
  if (!tache) return null;

  return (
    <div className="modal_fond todo_modal_fond" onClick={fermer}>
      <div
        className={`modal_fenetre todo_modal_fenetre ${tache.terminee ? 'todo_carte--terminee' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>

        <div className="todo_modal_contenu">
          <TacheZoneTexte
            className="todo_contenu todo_contenu--modal"
            valeur={tache.contenu}
            onChange={actions.modifierContenu}
            placeholder="Écris ta tâche..."
            autoFocus
          />

          <div className="todo_carte_actions">
            <button
              type="button"
              className="todo_btn_epingler"
              onClick={actions.epingler}
              title="Épingler sur le fond de la page"
            >
              📌 Épingler
            </button>
            <button
              type="button"
              className={`todo_btn_terminer ${tache.terminee ? 'actif' : ''}`}
              onClick={actions.toggleTerminee}
            >
              {tache.terminee ? '✓ Terminé' : 'Marquer comme terminé'}
            </button>
            <button
              type="button"
              className="todo_btn_supprimer_modal"
              onClick={() => { actions.supprimer(); fermer(); }}
            >
              Supprimer la tâche
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Petite modale de confirmation générique (utilisée pour le désépinglage)
function ModalConfirmation({ ouvert, message, onConfirmer, onAnnuler }) {
  if (!ouvert) return null;

  return (
    <div className="modal_fond todo_modal_fond" onClick={onAnnuler}>
      <div className="modal_fenetre todo_confirm_fenetre" onClick={(e) => e.stopPropagation()}>
        <p className="todo_confirm_message">{message}</p>
        <div className="todo_confirm_actions">
          <button type="button" className="btn_secondaire" onClick={onAnnuler}>
            Annuler
          </button>
          <button type="button" className="todo_btn_confirmer" onClick={onConfirmer}>
            Désépingler
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Modale de confirmation pour la sortie du mode concentration.
// Contrairement à ModalConfirmation, elle exige que l'utilisateur active un
// interrupteur avant de pouvoir valider (le bouton "Confirmer" reste désactivé
// tant que l'interrupteur n'est pas activé).
function ModalConfirmationSortie({ ouvert, toggleActif, onToggle, onConfirmer, onAnnuler }) {
  if (!ouvert) return null;

  return (
    <div className="modal_fond todo_modal_fond" onClick={onAnnuler}>
      <div className="modal_fenetre todo_confirm_fenetre" onClick={(e) => e.stopPropagation()}>
        <p className="todo_confirm_message">
          Êtes-vous sûr de vouloir quitter le mode concentration ?
        </p>

        <div className="switch_ligne" onClick={onToggle} role="switch" aria-checked={toggleActif}>
          <span className="switch_label">Je confirme vouloir quitter</span>
          <span className={`switch ${toggleActif ? 'switch--actif' : ''}`}>
            <span className="switch_bouton"></span>
          </span>
        </div>

        <div className="todo_confirm_actions">
          <button type="button" className="btn_secondaire" onClick={onAnnuler}>
            Annuler
          </button>
          <button
            type="button"
            className="todo_btn_confirmer"
            onClick={onConfirmer}
            disabled={!toggleActif}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Note épinglée : widget flottant en LECTURE SEULE, semi-transparent et
// déplaçable librement par glisser-déposer, affiché sur le fond principal
// de la page. Seules deux interactions restent possibles une fois épinglée :
// déplacer la note (poignée ⠿⠿) et la désépingler (bouton ✕, avec confirmation).
// Le contenu, les tags et l'échéance sont affichés à plat, non modifiables.
function NoteEpinglee({ tache, actions }) {
  const [position, setPosition] = useState(tache.position || { x: 60, y: 130 });
  const positionRef = useRef(position);
  const conteneurRef = useRef(null);
  const decalageRef = useRef({ x: 0, y: 0 });
  const enTrainDeGlisser = useRef(false);
  const actionsRef = useRef(actions);

  // Garde toujours une référence à jour des actions, sans re-déclencher l'effet de drag
  useEffect(() => {
    actionsRef.current = actions;
  });

  // Si la position stockée change depuis l'extérieur (ex: ré-épinglage), on se resynchronise
  useEffect(() => {
    if (tache.position) {
      setPosition(tache.position);
      positionRef.current = tache.position;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tache.position]);

  // Écouteurs globaux du glisser-déposer, attachés une seule fois
  useEffect(() => {
    const gererDeplacement = (e) => {
      if (!enTrainDeGlisser.current) return;
      const marge = 8;
      const largeurNote = conteneurRef.current?.offsetWidth || 260;
      const hauteurNote = conteneurRef.current?.offsetHeight || 160;

      let x = e.clientX - decalageRef.current.x;
      let y = e.clientY - decalageRef.current.y;

      x = Math.min(Math.max(x, marge), window.innerWidth - largeurNote - marge);
      y = Math.min(Math.max(y, marge), window.innerHeight - hauteurNote - marge);

      positionRef.current = { x, y };
      setPosition({ x, y });
    };

    const terminerDrag = () => {
      if (!enTrainDeGlisser.current) return;
      enTrainDeGlisser.current = false;
      actionsRef.current.deplacer(positionRef.current);
    };

    document.addEventListener('pointermove', gererDeplacement);
    document.addEventListener('pointerup', terminerDrag);
    return () => {
      document.removeEventListener('pointermove', gererDeplacement);
      document.removeEventListener('pointerup', terminerDrag);
    };
  }, []);

  const demarrerDrag = (e) => {
    e.preventDefault();
    enTrainDeGlisser.current = true;
    decalageRef.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y,
    };
  };

  return (
    <div
      ref={conteneurRef}
      className={`note_epinglee ${tache.terminee ? 'note_epinglee--terminee' : ''}`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className="note_epinglee_entete">
        <span
          className="note_epinglee_poignee"
          onPointerDown={demarrerDrag}
          title="Déplacer la note"
          aria-hidden="true"
        >
          ⠿⠿
        </span>

        <div className="note_epinglee_actions_droite">
          <button
            type="button"
            className="note_epinglee_valider"
            onClick={actions.toggleTerminee}
            aria-label={tache.terminee ? "Marquer comme non terminée" : "Marquer comme terminée"}
            title={tache.terminee ? "Marquer comme non terminée" : "Marquer comme terminée"}
          >
            ✓
          </button>
          <button
            type="button"
            className="note_epinglee_fermer"
            onClick={actions.demanderDesepingler}
            aria-label="Désépingler la note"
            title="Désépingler"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="note_epinglee_contenu_lecture">
        {tache.contenu
          ? tache.contenu
          : <span className="note_epinglee_contenu_vide">(Note vide)</span>}
      </div>
    </div>
  );
}

// Composant de la section "Notes" : affiche la liste des tâches non épinglées
// et la modale d'agrandissement. L'état des tâches (et leur persistance) est
// géré par le composant App, afin que les notes épinglées puissent rester
// affichées sur le fond principal même quand cet onglet n'est pas actif.
// ==========================================================================
// Fonctions utilitaires liées aux sessions
// (à sortir dans un fichier séparé, ex: sessions.js, si le projet grossit)
// ==========================================================================

/**
 * Génère un numéro de session unique (format "0001", "0002", ...)
 * en se basant sur le plus grand numéro déjà utilisé dans les sessions sauvegardées.
 */
function genererNumeroSession(sessionsExistantes) {
  const numeros = sessionsExistantes
    .map((s) => parseInt(s.numero, 10))
    .filter((n) => !Number.isNaN(n));

  const suivant = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
  return String(suivant).padStart(4, '0');
}

// --- Sessions archivées : persistées dans Supabase (table « sessions_notes »).
// Un compte connecté ne voit jamais les sessions archivées d'un autre compte.
// Le mode invité n'a aucune persistance : ses sessions vivent en mémoire.

// ==========================================================================
// Composant principal
// ==========================================================================

// --- Pomodoro Tracker : barre de points représentant les séances de
// travail terminées (10 emplacements max). Survol d'un point rempli =
// tooltip affichant la durée de la séance correspondante.
function PomodoroTracker({ points }) {
  return (
    <span className="pomodoro_tours_compteur">
      Tours : {points.length}
    </span>
  );
}

function Note({ taches, ajouterTache, actionsPour, viderTaches, definirOrdreTache, reinitialiserOrdre, pointsPomodoro, modeLecture, setModeLecture, sessionConsultee, setSessionConsultee, sessionsSauvegardees, setSessionsSauvegardees, sessionsChargeesPourRef, remplacerTachesActives, titreSession, setTitreSession, numeroSession }) {
  const { connecte, utilisateur } = useAuth();

  const [idAgrandie, setIdAgrandie] = useState(null);

  // Date de création de la session en cours, utilisée pour le compteur de
  // progression et affichée à côté du score (voir session_progression_ligne)
  const [dateCreationSession, setDateCreationSession] = useState(() => new Date().toISOString());

  // Boîte de dialogue "que faire de la session en cours ?"
  const [confirmationOuverte, setConfirmationOuverte] = useState(false);

  // Fenêtre "consulter les anciennes notes"
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [recherche, setRecherche] = useState('');

  // mode_lecture : reçu depuis App (props) afin d'être partagé avec le Chrono
  // sessionConsultee : reçue depuis App (props) pour permettre la consultation
  // depuis l'onglet Historique de la modale de profil.

  // --- Thème de session : menu déroulant remplaçant l'ancien affichage
  // « Session : #XXXX ». Permet de catégoriser la session en cours. ---
  const THEMES_SESSION = ['Lecture', 'Devoir', 'Dessin'];
  const [themeSession, setThemeSession] = useState('');
  const [themeDropdownOuvert, setThemeDropdownOuvert] = useState(false);


  // --- Mode "organiser" : numérotation manuelle de l'ordre des notes ---
  const [modeOrganisationActif, setModeOrganisationActif] = useState(false);
  // Id de la première note sélectionnée lors d'une interversion (2e clic = échange)
  const [notePremiereSelection, setNotePremiereSelection] = useState(null);

  // Garde en mémoire les id déjà connus pour détecter l'arrivée d'une note
  // réellement nouvelle (et non simplement une note existante sans ordre).
  const idsConnusRef = useRef(new Set(taches.map((t) => t.id)));

  // Une note épinglée quitte la liste : elle est déjà visible sur le fond principal
  const sourceTaches = modeLecture
    ? (sessionConsultee?.notes || [])
    : taches;

  const tachesListe = sourceTaches
    .filter((t) => !t.epinglee)
    .slice()
    .sort((a, b) => (a.ordre ?? Infinity) - (b.ordre ?? Infinity));



  const tacheAgrandie = taches.find((t) => t.id === idAgrandie) || null;


  // Score de progression de la session en cours : toutes les notes comptent
  // (épinglées ou non), une tâche "terminée" compte comme accomplie
  const tachesTotal = taches.length;
  const tachesTerminees = taches.filter((t) => t.terminee).length;

  // Plus grand numéro d'ordre déjà attribué (0 si aucune note n'en a un)
  const calculerProchainNumero = () => {
    const numeros = taches
      .map((t) => (typeof t.ordre === 'number' ? t.ordre : 0));
    return numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
  };

  // Attribue automatiquement le numéro suivant à toute note réellement
  // nouvelle (ajoutée depuis le dernier rendu) qui n'a pas encore d'ordre.
  useEffect(() => {
    if (typeof definirOrdreTache !== 'function') return;

    const idsActuels = new Set(taches.map((t) => t.id));
    const nouvellesTaches = taches.filter(
      (t) => !idsConnusRef.current.has(t.id) && t.ordre == null
    );

    if (nouvellesTaches.length > 0) {
      let prochain = calculerProchainNumero();
      nouvellesTaches.forEach((t) => {
        definirOrdreTache(t.id, prochain);
        prochain += 1;
      });
    }

    idsConnusRef.current = idsActuels;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taches]);

  // Quitte le mode organisation (clic droit ou touche Échap)
  const quitterModeOrganisation = () => {
    setModeOrganisationActif(false);
    setNotePremiereSelection(null);
  };

  // Bascule l'état actif/inactif du bouton "Organiser"
  const basculerModeOrganisation = () => {
    setModeOrganisationActif((actif) => !actif);
    setNotePremiereSelection(null);
  };

  // Retire les pastilles de toutes les notes (remise à zéro de l'ordre manuel).
  // Les notes redeviennent numérotables une à une, comme au tout premier usage.
  const reinitialiserPastilles = () => {
    if (typeof reinitialiserOrdre !== 'function') return;
    reinitialiserOrdre();
    setNotePremiereSelection(null);
  };

  // Touche Échap : quitte le mode organisation si actif
  useEffect(() => {
    if (!modeOrganisationActif) return undefined;

    const gererTouche = (e) => {
      if (e.key === 'Escape') {
        quitterModeOrganisation();
      }
    };

    window.addEventListener('keydown', gererTouche);
    return () => window.removeEventListener('keydown', gererTouche);
  }, [modeOrganisationActif]);

  // Clic sur une note pendant le mode organisation :
  // - si elle n'a pas encore de numéro, elle reçoit le prochain numéro libre
  // - sinon, elle entre dans une sélection à deux clics qui intervertit les numéros
  const gererClicNoteEnModeOrganisation = (tache) => {
    if (typeof definirOrdreTache !== 'function') return;

    if (tache.ordre == null) {
      definirOrdreTache(tache.id, calculerProchainNumero());
      return;
    }

    if (notePremiereSelection == null) {
      setNotePremiereSelection(tache.id);
      return;
    }

    if (notePremiereSelection === tache.id) {
      // Reclique sur la même note : annule la sélection en cours
      setNotePremiereSelection(null);
      return;
    }

    const autreTache = taches.find((t) => t.id === notePremiereSelection);
    if (autreTache && autreTache.ordre != null) {
      definirOrdreTache(tache.id, autreTache.ordre);
      definirOrdreTache(autreTache.id, tache.ordre);
    }
    setNotePremiereSelection(null);
  };

  // Clique sur "+nouvelle session" : on n'écrase rien tout de suite,
  // on demande d'abord ce qu'il faut faire de la session en cours.
  const demarrerNouvelleSession = () => {
    setConfirmationOuverte(true);
  };

  // Enregistre la session actuelle (titre, numéro, date, heure, notes),
  // puis repart sur une session vierge.
  const enregistrerSessionEtRepartir = () => {
    const maintenant = new Date();

    const sessionArchivee = {
      id: `session_${Date.now()}`,
      titre: titreSession.trim() || `Session ${numeroSession}`,
      numero: numeroSession,
      date: maintenant.toLocaleDateString(),
      heure: maintenant.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateCreation: dateCreationSession,
      notes: taches,
    };



    const sessionsMisesAJour = [...sessionsSauvegardees, sessionArchivee];
    setSessionsSauvegardees(sessionsMisesAJour);

    // Mode invité, ou changement de compte encore en cours de chargement :
    // rien à enregistrer dans Supabase (pas de compte cible fiable).
    if (connecte && utilisateur?.id && sessionsChargeesPourRef.current === utilisateur.id) {
      sauvegarderSessionArchivee(utilisateur.id, sessionArchivee);
    }

    repartirSurNouvelleSession(sessionsMisesAJour);
  };

  // Supprime la session actuelle sans l'enregistrer, puis repart sur une session vierge.
  const supprimerSessionEtRepartir = () => {
    repartirSurNouvelleSession(sessionsSauvegardees);
  };

  // Vide l'éditeur, réinitialise le titre et génère un nouveau numéro unique.
  const repartirSurNouvelleSession = (sessionsActuelles) => {
    if (typeof viderTaches === 'function') {
      viderTaches();
    } else if (typeof ajouterTache === 'function') {
      // Solution de repli si "viderTaches" n'a pas encore été branché côté parent :
      // au minimum on ouvre une nouvelle tâche, mais l'idéal est d'implémenter
      // "viderTaches" pour vraiment vider la liste précédente.
      ajouterTache();
    }
    setTitreSession('');
    setDateCreationSession(new Date().toISOString());
    setConfirmationOuverte(false);

    // On quitte le mode lecture seule : sans ça, la session vierge reste
    // masquée derrière les notes (en lecture seule) de l'ancienne session
    // qu'on était en train de consulter.
    setModeLecture(false);
    setSessionConsultee(null);
  };


  //consulter les sessions
  const consulterSession = (session) => {
    setSessionConsultee(session);
    setModeLecture(true);
    setRechercheOuverte(false);
  };

  // Enregistre la session actuelle sans créer une nouvelle session
  const enregistrerSession = () => {
    const maintenant = new Date();

    const sessionArchivee = {
      id: `session_${Date.now()}`,
      titre: titreSession.trim() || `Session ${numeroSession}`,
      numero: numeroSession,
      date: maintenant.toLocaleDateString(),
      heure: maintenant.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateCreation: dateCreationSession,
      notes: taches,
    };

    const sessionsMisesAJour = [...sessionsSauvegardees, sessionArchivee];

    setSessionsSauvegardees(sessionsMisesAJour);

    if (connecte && utilisateur?.id && sessionsChargeesPourRef.current === utilisateur.id) {
      sauvegarderSessionArchivee(utilisateur.id, sessionArchivee);
    }
  };

  // Filtre les sessions sauvegardées selon la barre de recherche (titre ou numéro)
  const sessionsFiltrees = sessionsSauvegardees.filter((s) => {
    const cible = recherche.trim().toLowerCase();
    if (!cible) return true;
    return (
      s.titre.toLowerCase().includes(cible) ||
      s.numero.toLowerCase().includes(cible)
    );
  });

  // --- Mode lecture : nombre de tâches non terminées dans la session consultée
  const tachesNonTerminees = modeLecture && sessionConsultee
    ? (sessionConsultee.notes || []).filter((n) => !n.terminee).length
    : 0;

  // Quitte le mode lecture pour revenir à la session en cours
  const continuerSession = () => {
    setModeLecture(false);
    setSessionConsultee(null);
  };

  // Déplace les tâches non terminées de la session consultée vers une nouvelle session active
  const deplacerTachesNonTerminees = () => {
    if (!sessionConsultee) return;
    const nonTerminees = (sessionConsultee.notes || []).filter((n) => !n.terminee);
    const terminees = (sessionConsultee.notes || []).filter((n) => n.terminee);

    if (nonTerminees.length === 0) return;

    // 1. Sauvegarder la session de travail actuelle (en arrière-plan) pour ne rien perdre
    if (taches.length > 0) {
      enregistrerSession();
    }

    // 2. Mettre à jour l'ancienne session en retirant les non terminées
    const ancienneSessionMiseAJour = {
      ...sessionConsultee,
      notes: terminees
    };

    const sessionsMisesAJour = sessionsSauvegardees.map((s) =>
      s.id === ancienneSessionMiseAJour.id ? ancienneSessionMiseAJour : s
    );
    setSessionsSauvegardees(sessionsMisesAJour);

    if (connecte && utilisateur?.id && sessionsChargeesPourRef.current === utilisateur.id) {
      sauvegarderSessionArchivee(utilisateur.id, ancienneSessionMiseAJour);
    }

    // 3. Remplacer l'espace de travail actif par les tâches non terminées
    const nouvellesTaches = nonTerminees.map((n) => ({ ...n, id: genererIdTache() }));
    if (typeof remplacerTachesActives === 'function') {
      remplacerTachesActives(nouvellesTaches);
    }

    setTitreSession(`Suite de ${sessionConsultee.titre || 'Session'}`);
    setDateCreationSession(new Date().toISOString());

    // 4. Quitter le mode lecture pour afficher la nouvelle session en cours
    setModeLecture(false);
    setSessionConsultee(null);
  };

  return (
    <div
      className={`todo_zone${modeLecture ? ' todo_zone--lecture' : ''}`}
      onContextMenu={(e) => {
        if (modeOrganisationActif) {
          e.preventDefault();
          quitterModeOrganisation();
        }
      }}
    >
      <div className="todo_entete">


        {/* ===========================
      Barre de session
  ============================ */}

        <div className="session_section">

          {/* Barre supérieure */}
          <div className="todo_actions_top">

            {!modeLecture && (
              <button
                type="button"
                className="todo_btn_ajouter"
                onClick={demarrerNouvelleSession}
              >
                +nouvelle session
              </button>
            )}

            {modeLecture ? (
              <div className="session_lecture_zone">
                <span className="session_lecture_texte">Mode lecture</span>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {tachesNonTerminees > 0 && (
                    <button
                      type="button"
                      className="session_btn_ajouter_rouge"
                      onClick={deplacerTachesNonTerminees}
                    >
                      Ajouter les {tachesNonTerminees}
                    </button>
                  )}

                  <button
                    type="button"
                    className="session_btn_continuer"
                    onClick={continuerSession}
                  >
                    Continuer la session
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="session_action_btn"
                onClick={enregistrerSession}
              >
                Enregistrer la session
              </button>
            )}

          </div>

          {/* Barre de session */}
          <div className="todo_actions">

            <div className="session_infos">

              <div className="session_titre_ligne">
                <div className="theme_dropdown_wrapper">
                  <button
                    type="button"
                    className="theme_dropdown_btn"
                    onClick={() => setThemeDropdownOuvert(!themeDropdownOuvert)}
                  >
                    <span className="theme_dropdown_label">{themeSession || 'Thème'}</span>
                    <span className="theme_dropdown_chevron">{themeDropdownOuvert ? '▲' : '▼'}</span>
                  </button>
                  {themeDropdownOuvert && (
                    <ul className="theme_dropdown_liste">
                      {THEMES_SESSION.map((t) => (
                        <li key={t}>
                          <button
                            type="button"
                            className={`theme_dropdown_option${themeSession === t ? ' theme_dropdown_option--actif' : ''}`}
                            onClick={() => {
                              setThemeSession(t);
                              setThemeDropdownOuvert(false);
                            }}
                          >
                            {t}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <input
                  type="text"
                  className="session_titre_input"
                  placeholder="Titre de la session"
                  value={titreSession}
                  onChange={(e) => setTitreSession(e.target.value)}
                />
              </div>

              <span className="session_progression_score">
                <strong>{tachesTerminees}</strong> / {tachesTotal} tâches accomplies
              </span>

            </div>

          </div>
          <div className="session_liste_actions">
            <button
              type="button"
              className="note_btn_ajouter"
              onClick={ajouterTache}
              disabled={modeLecture}
            >
              <span>+Ajouter une note</span>
            </button>

            <button
              type="button"
              className={`session_action_btn${modeOrganisationActif ? ' session_action_btn--actif' : ''}`}
              onClick={basculerModeOrganisation}
            >
              Organiser
            </button>

            <PomodoroTracker points={pointsPomodoro || []} />

            {modeOrganisationActif && (
              <>
                <span className="session_organiser_message">
                  Pour quitter ce mode, faites un clic droit ou appuyez sur Échap.
                </span>
                <button
                  type="button"
                  className="session_action_btn session_action_btn--reinit"
                  onClick={reinitialiserPastilles}
                  title="Retirer les numéros de toutes les notes"
                >
                  ↺ Réinitialiser les pastilles
                </button>
              </>
            )}

          </div>
        </div>



      </div>

      {tachesListe.length === 0 ? (
        <p className="todo_vide">
          {taches.length === 0
            ? "Aucune tâche pour l'instant. Clique sur « + Nouvelle tâche » pour commencer."
            : 'Toutes tes tâches sont épinglées sur le fond de la page.'}
        </p>
      ) : (
        <div className="todo_liste">
          {tachesListe.map((tache) => (
            <div
              key={tache.id}
              className={`session_organiser_case${modeOrganisationActif ? ' session_organiser_case--actif' : ''}${tache.id === notePremiereSelection ? ' session_organiser_case--selection' : ''}`}
              onClickCapture={(e) => {
                if (modeOrganisationActif) {
                  e.preventDefault();
                  e.stopPropagation();
                  gererClicNoteEnModeOrganisation(tache);
                }
              }}
            >
              {tache.ordre != null && (
                <span className="session_ordre_badge">{tache.ordre}</span>
              )}
              <TacheCarte
                tache={tache}
                actions={actionsPour(tache.id)}
                onAgrandir={() => setIdAgrandie(tache.id)}
                lectureSeule={modeLecture}
              />
            </div>
          ))}
        </div>
      )}

      {tacheAgrandie && (
        <ModalTache
          tache={tacheAgrandie}
          actions={actionsPour(tacheAgrandie.id)}
          fermer={() => setIdAgrandie(null)}
          lectureSeule={modeLecture}
        />
      )}

      {confirmationOuverte && (
        <DialogueNouvelleSession
          onEnregistrer={enregistrerSessionEtRepartir}
          onSupprimer={supprimerSessionEtRepartir}
          onAnnuler={() => setConfirmationOuverte(false)}
        />
      )}

      {rechercheOuverte && (
        <FenetreAnciennesSessions
          sessions={sessionsFiltrees}
          recherche={recherche}
          onChangerRecherche={setRecherche}
          fermer={() => setRechercheOuverte(false)}
          onConsulter={consulterSession}
        />
      )}
    </div>
  );
}

// ==========================================================================
// Boîte de dialogue : que faire de la session en cours ?
// ==========================================================================

function DialogueNouvelleSession({ onEnregistrer, onSupprimer, onAnnuler }) {
  return (
    <div className="session_confirm_fond" onClick={onAnnuler}>
      <div className="session_confirm_fenetre" onClick={(e) => e.stopPropagation()}>
        <h3 className="session_confirm_titre">Nouvelle session</h3>
        <p className="session_confirm_texte">
          Que faire de la session en cours avant de commencer une nouvelle session ?
        </p>
        <div className="session_confirm_actions">
          <button
            type="button"
            className="session_confirm_btn session_confirm_btn--enregistrer"
            onClick={onEnregistrer}
          >
            Enregistrer la session actuelle
          </button>
          <button
            type="button"
            className="session_confirm_btn session_confirm_btn--supprimer"
            onClick={onSupprimer}
          >
            Supprimer sans enregistrer
          </button>
          <button
            type="button"
            className="session_confirm_btn session_confirm_btn--annuler"
            onClick={onAnnuler}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// Fenêtre : consulter les anciennes sessions
// ==========================================================================

function FenetreAnciennesSessions({ sessions, recherche, onChangerRecherche, fermer, onConsulter }) {
  return (
    <div className="session_historique_fond" onClick={fermer}>
      <div className="session_historique_fenetre" onClick={(e) => e.stopPropagation()}>
        <div className="session_historique_entete">
          <h3 className="session_historique_titre">Anciennes sessions</h3>
          <button type="button" className="session_historique_fermer" onClick={fermer}>
            ✕
          </button>
        </div>

        <input
          type="text"
          placeholder="Rechercher par titre ou numéro..."
          value={recherche}
          onChange={(e) => onChangerRecherche(e.target.value)}
          className="session_recherche_input"
        />

        <div className="session_historique_liste">
          {sessions.length === 0 ? (
            <p className="session_ligne_vide">Aucune session trouvée.</p>
          ) : (
            <table className="sessions_tableau">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Numéro</th>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Progression</th>
                  <th>Nombre de notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="session_titre_cellule">{s.titre}</td>
                    <td>
                      <span className="session_numero_badge">#{s.numero}</span>
                    </td>
                    <td>{s.date}</td>
                    <td>{s.heure}</td>
                    <td>
                      <span className="session_progression_badge">
                        {s.notes.filter((n) => n.terminee).length} / {s.notes.length}
                      </span>
                    </td>
                    <td>
                      <span className="session_notes_badge">{s.notes.length}</span>
                    </td>
                    <td>
                      <button type="button" className="session_action_btn" onClick={() => onConsulter(s)} >Consulter </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}


// ======================================================================
// --- Musique d'ambiance -------------------------------------------------
// ======================================================================

// Extrait l'identifiant de vidéo d'un lien YouTube (formats standards,
// courts youtu.be, ou embed) afin de pouvoir instancier le lecteur IFrame
function extraireIdYoutube(lien) {
  try {
    const url = new URL(lien.trim());
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1) || null;
    if (url.searchParams.get('v')) return url.searchParams.get('v');
    const correspondance = url.pathname.match(/\/embed\/([^/?]+)/);
    if (correspondance) return correspondance[1];
    return null;
  } catch {
    return null;
  }
}

// Petite miniature carrée réutilisée à la fois dans la modale de choix de
// musique (aperçu) et sur la carte du lecteur flottant : miniature YouTube
// ou pochette Spotify, avec un repli en dégradé + icône si aucune image
// n'est disponible (cas de la simulation Spotify, faute d'API réelle).
function MiniatureMusique({ className, iconeClassName, type, thumbnail }) {
  return (
    <div className={className}>
      {thumbnail ? (
        <img src={thumbnail} alt="" />
      ) : (
        <span className={iconeClassName}>{type === 'spotify' ? '🎧' : '🎵'}</span>
      )}
    </div>
  );
}

// Modale de sélection de la musique d'ambiance : lien YouTube, ou recherche
// via un compte Spotify connecté (simulation de connexion, comme pour les salons)
function ModalChoisirMusique({ ouvert, fermer, onValider }) {
  const [typeMusique, setTypeMusique] = useState('youtube');
  const [lienYoutube, setLienYoutube] = useState('');
  const [spotifyConnecte, setSpotifyConnecte] = useState(false);
  const [rechercheSpotify, setRechercheSpotify] = useState('');
  const [artisteSpotify, setArtisteSpotify] = useState('');

  if (!ouvert) return null;

  // Aperçu en direct de la miniature qui sera utilisée sur la carte du
  // lecteur, affiché au fur et à mesure de la saisie (lien YouTube valide,
  // ou recherche Spotify renseignée)
  const idYoutubeApercu = typeMusique === 'youtube' && lienYoutube.trim()
    ? extraireIdYoutube(lienYoutube)
    : null;
  const afficherApercuSpotify = typeMusique === 'spotify' && spotifyConnecte && rechercheSpotify.trim();

  const connecterSpotify = () => setSpotifyConnecte(true);

  const validerYoutube = () => {
    const id = extraireIdYoutube(lienYoutube);
    if (!id) {
      alert('Lien YouTube invalide. Utilisez un lien du type https://www.youtube.com/watch?v=...');
      return;
    }
    // Le titre/artiste réels seront récupérés automatiquement une fois la
    // vidéo chargée (voir LecteurVinyle > getVideoData). La miniature, elle,
    // est disponible immédiatement via le CDN public de YouTube.
    onValider({
      type: 'youtube',
      videoId: id,
      titre: 'Musique YouTube',
      artiste: '',
      duree: 0,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    });
    setLienYoutube('');
    fermer();
  };

  const validerSpotify = () => {
    const titre = rechercheSpotify.trim();
    if (!titre) return;
    // Pas d'API de lecture Spotify disponible ici : la piste, sa durée et
    // sa pochette sont simulées (aucune vraie recherche n'est effectuée)
    onValider({
      type: 'spotify',
      titre,
      artiste: artisteSpotify.trim(),
      duree: 200 + Math.floor(Math.random() * 100),
      thumbnail: null,
    });
    setRechercheSpotify('');
    setArtisteSpotify('');
    fermer();
  };

  return (
    <div className="modal_fond salon_modal_fond" onClick={fermer}>
      <div className="modal_fenetre salon_modal_fenetre" onClick={(e) => e.stopPropagation()}>
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>

        <div className="salon_modal_contenu">
          <h3 className="salon_modal_titre">Choisir une musique d'ambiance</h3>

          <div className="salon_champ">
            <label className="salon_label">Source de la musique</label>
            <div className="salon_musique_choix">
              <button
                type="button"
                className={`salon_musique_onglet ${typeMusique === 'youtube' ? 'actif' : ''}`}
                onClick={() => setTypeMusique('youtube')}
              >
                Lien YouTube
              </button>
              <button
                type="button"
                className={`salon_musique_onglet ${typeMusique === 'spotify' ? 'actif' : ''}`}
                onClick={() => setTypeMusique('spotify')}
              >
                Spotify
              </button>
            </div>

            {typeMusique === 'youtube' ? (
              <>
                <input
                  type="text"
                  className="param_input"
                  placeholder="https://youtube.com/..."
                  value={lienYoutube}
                  onChange={(e) => setLienYoutube(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') validerYoutube(); }}
                />

                {idYoutubeApercu && (
                  <div className="choix_musique_apercu_ligne">
                    <MiniatureMusique
                      className="choix_musique_apercu_vignette"
                      iconeClassName="choix_musique_apercu_icone"
                      type="youtube"
                      thumbnail={`https://img.youtube.com/vi/${idYoutubeApercu}/hqdefault.jpg`}
                    />
                    <div className="choix_musique_apercu_details">
                      <span className="choix_musique_apercu_titre">Musique YouTube</span>
                      <span className="choix_musique_apercu_artiste">Aperçu de la miniature</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="salon_btn_valider_creation"
                  onClick={validerYoutube}
                >
                  Utiliser cette musique
                </button>
              </>
            ) : (
              <div className="salon_spotify_zone salon_spotify_zone--colonne">
                {!spotifyConnecte ? (
                  <button type="button" className="salon_btn_spotify" onClick={connecterSpotify}>
                    🎧 Connecter mon compte Spotify
                  </button>
                ) : (
                  <>
                    <input
                      type="text"
                      className="param_input"
                      placeholder="Rechercher un son sur Spotify..."
                      value={rechercheSpotify}
                      onChange={(e) => setRechercheSpotify(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') validerSpotify(); }}
                    />
                    <input
                      type="text"
                      className="param_input"
                      placeholder="Artiste (optionnel)"
                      value={artisteSpotify}
                      onChange={(e) => setArtisteSpotify(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') validerSpotify(); }}
                    />

                    {afficherApercuSpotify && (
                      <div className="choix_musique_apercu_ligne">
                        <MiniatureMusique
                          className="choix_musique_apercu_vignette"
                          iconeClassName="choix_musique_apercu_icone"
                          type="spotify"
                          thumbnail={null}
                        />
                        <div className="choix_musique_apercu_details">
                          <span className="choix_musique_apercu_titre">{rechercheSpotify}</span>
                          <span className="choix_musique_apercu_artiste">
                            {artisteSpotify.trim() || 'Artiste inconnu'}
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="salon_btn_valider_creation"
                      onClick={validerSpotify}
                    >
                      Utiliser cette musique
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Formate un nombre de secondes en "m:ss" pour l'affichage du lecteur
function formaterTempsPiste(s) {
  if (!isFinite(s) || s < 0) s = 0;
  const minutes = Math.floor(s / 60);
  const secondes = Math.floor(s % 60).toString().padStart(2, '0');
  return `${minutes}:${secondes}`;
}

// --- Lecteur "vinyle" : widget flottant, DÉPLAÇABLE LIBREMENT par glisser-
// déposer (comme une note épinglée), affichant la miniature (YouTube) ou la
// pochette (Spotify) de la piste en cours, en carré aux coins arrondis.
// Deux modes de lecture :
// - YouTube : lecture audio réelle via l'API IFrame YouTube (vidéo cachée)
// - Spotify : la connexion est simulée (comme dans les salons), donc la
//   progression de la piste est elle aussi simulée par un minuteur
//
// L'état de lecture (enLecture / boucle / durée / titre / artiste / position)
// vit dans le composant App (dans l'objet `musique`) afin que le panneau
// Réglages puisse afficher les informations détaillées de la piste en cours.
// Seule la progression courante (tempsActuel) reste locale, car elle change
// trop souvent pour être remontée à chaque tick sans impacter les perfs.
//
// Astuce : ce composant est monté avec une `key` unique par piste (voir App),
// ce qui garantit une réinitialisation propre de son état local à chaque
// changement de musique, sans avoir à gérer manuellement la resynchronisation.
function LecteurVinyle({ musique, fermer, onMettreAJour, modeTiroir }) {
  const [tempsActuel, setTempsActuel] = useState(0);
  const [duree, setDuree] = useState(musique.duree || 0);
  const [position, setPosition] = useState(musique.position || positionParDefautLecteur());
  const [glisseActif, setGlisseActif] = useState(false);

  const positionRef = useRef(position);
  const conteneurRef = useRef(null);
  const decalageRef = useRef({ x: 0, y: 0 });
  const enTrainDeGlisser = useRef(false);

  const lecteurYoutubeRef = useRef(null);
  const conteneurYoutubeRef = useRef(null);
  const intervalProgressionRef = useRef(null);
  const intervalSimulationRef = useRef(null);
  const boucleRef = useRef(Boolean(musique.boucle));
  const onMettreAJourRef = useRef(onMettreAJour);

  const enLecture = Boolean(musique.enLecture);
  const boucle = Boolean(musique.boucle);

  useEffect(() => { onMettreAJourRef.current = onMettreAJour; });
  useEffect(() => { boucleRef.current = boucle; }, [boucle]);

  // --- Glisser-déposer : mêmes principes que NoteEpinglee. La position n'est
  // remontée au composant App (pour persistance) qu'une fois le glissement
  // terminé, afin de garder l'animation fluide pendant le déplacement.
  useEffect(() => {
    const gererDeplacement = (e) => {
      if (!enTrainDeGlisser.current) return;
      const marge = 8;
      const largeur = conteneurRef.current?.offsetWidth || 168;
      const hauteur = conteneurRef.current?.offsetHeight || 220;

      let x = e.clientX - decalageRef.current.x;
      let y = e.clientY - decalageRef.current.y;

      x = Math.min(Math.max(x, marge), window.innerWidth - largeur - marge);
      y = Math.min(Math.max(y, marge), window.innerHeight - hauteur - marge);

      positionRef.current = { x, y };
      setPosition({ x, y });
    };

    const terminerDrag = () => {
      if (!enTrainDeGlisser.current) return;
      enTrainDeGlisser.current = false;
      setGlisseActif(false);
      onMettreAJourRef.current?.({ position: positionRef.current });
    };

    document.addEventListener('pointermove', gererDeplacement);
    document.addEventListener('pointerup', terminerDrag);
    return () => {
      document.removeEventListener('pointermove', gererDeplacement);
      document.removeEventListener('pointerup', terminerDrag);
    };
  }, []);

  const demarrerDrag = (e) => {
    e.preventDefault();
    enTrainDeGlisser.current = true;
    setGlisseActif(true);
    decalageRef.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y,
    };
  };

  // Mise en place du lecteur YouTube caché (audio réel). Grâce à la `key`
  // posée sur ce composant dans App, un changement de piste remonte un tout
  // nouveau LecteurVinyle : cet effet ne s'exécute donc qu'une seule fois
  // par piste, il n'a pas besoin de dépendre de `musique`.
  useEffect(() => {
    if (musique.type !== 'youtube') return undefined;
    let annule = false;

    const creerLecteur = () => {
      if (annule || !conteneurYoutubeRef.current) return;
      lecteurYoutubeRef.current = new window.YT.Player(conteneurYoutubeRef.current, {
        videoId: musique.videoId,
        playerVars: { controls: 0, disablekb: 1 },
        events: {
          onReady: (e) => {
            const d = e.target.getDuration();
            setDuree(d);
            onMettreAJourRef.current?.({ duree: d });

            // Récupère le vrai titre / artiste (nom de la chaîne) de la vidéo
            try {
              const infos = e.target.getVideoData?.();
              if (infos?.title) {
                onMettreAJourRef.current?.({
                  titre: infos.title,
                  artiste: infos.author || '',
                });
              }
            } catch {
              // Méthode interne indisponible : on conserve le titre par défaut
            }
          },
          onStateChange: (e) => {
            const enCours = e.data === window.YT.PlayerState.PLAYING;
            onMettreAJourRef.current?.({ enLecture: enCours });

            if (e.data === window.YT.PlayerState.ENDED) {
              if (boucleRef.current) {
                lecteurYoutubeRef.current?.seekTo?.(0, true);
                lecteurYoutubeRef.current?.playVideo?.();
              } else {
                onMettreAJourRef.current?.({ enLecture: false });
              }
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      creerLecteur();
    } else {
      if (!document.getElementById('youtube-iframe-api')) {
        const script = document.createElement('script');
        script.id = 'youtube-iframe-api';
        script.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(script);
      }
      const precedent = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        precedent?.();
        creerLecteur();
      };
    }

    return () => {
      annule = true;
      lecteurYoutubeRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suivi de la progression pendant la lecture YouTube (l'API ne notifie pas le temps courant en continu)
  useEffect(() => {
    if (musique.type !== 'youtube') return undefined;
    if (enLecture) {
      intervalProgressionRef.current = setInterval(() => {
        const t = lecteurYoutubeRef.current?.getCurrentTime?.();
        if (typeof t === 'number') setTempsActuel(t);
      }, 500);
    }
    return () => clearInterval(intervalProgressionRef.current);
  }, [enLecture, musique.type]);

  // Simulation de lecture pour Spotify : aucune API de lecture réelle n'est disponible ici
  useEffect(() => {
    if (musique.type !== 'spotify') return undefined;
    if (enLecture) {
      intervalSimulationRef.current = setInterval(() => {
        setTempsActuel((prev) => {
          if (prev + 1 >= duree) {
            if (boucleRef.current) {
              return 0;
            }
            clearInterval(intervalSimulationRef.current);
            onMettreAJourRef.current?.({ enLecture: false });
            return duree;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalSimulationRef.current);
  }, [enLecture, musique.type, duree]);

  const basculerLecture = () => {
    if (musique.type === 'youtube') {
      if (enLecture) lecteurYoutubeRef.current?.pauseVideo?.();
      else lecteurYoutubeRef.current?.playVideo?.();
    } else {
      onMettreAJour?.({ enLecture: !enLecture });
    }
  };

  // Bouton "Retour au début" : remet la piste à 0:00 sans changer l'état de lecture
  const retourDebut = () => {
    setTempsActuel(0);
    if (musique.type === 'youtube') {
      lecteurYoutubeRef.current?.seekTo?.(0, true);
    }
  };

  // Bouton "Lecture en boucle" : active/désactive la répétition automatique
  const toggleBoucle = () => {
    onMettreAJour?.({ boucle: !boucle });
  };

  // Permet de cliquer n'importe où sur la barre de progression pour s'y déplacer
  const gererClicProgression = (e) => {
    if (duree <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const nouveauTemps = ratio * duree;
    setTempsActuel(nouveauTemps);
    if (musique.type === 'youtube') lecteurYoutubeRef.current?.seekTo?.(nouveauTemps, true);
  };

  const progression = duree > 0 ? Math.min((tempsActuel / duree) * 100, 100) : 0;

  return (
    <div
      ref={conteneurRef}
      className={`lecteur_vinyle ${glisseActif ? 'lecteur_vinyle--glisse' : ''} ${modeTiroir ? 'lecteur_vinyle--tiroir' : ''}`}
      style={modeTiroir ? {} : { left: `${position.x}px`, top: `${position.y}px` }}
    >
      {!modeTiroir && (
        <div className="lecteur_vinyle_entete">
          <span
            className="lecteur_vinyle_poignee"
            onPointerDown={demarrerDrag}
            title="Déplacer le lecteur"
            aria-hidden="true"
          >
            ⠿⠿
          </span>

          <button
            type="button"
            className="lecteur_vinyle_fermer"
            onClick={fermer}
            aria-label="Fermer le lecteur de musique"
            title="Fermer le lecteur"
          >
            ×
          </button>
        </div>
      )}

      <MiniatureMusique
        className={`vinyle_miniature ${enLecture ? 'vinyle_miniature--lecture' : ''}`}
        iconeClassName="vinyle_miniature_icone"
        type={musique.type}
        thumbnail={musique.thumbnail}
      />

      <span className="lecteur_vinyle_titre" title={musique.titre}>{musique.titre}</span>

      <div className="lecteur_vinyle_controles">
        <button
          type="button"
          className="lecteur_vinyle_bouton_secondaire"
          onClick={retourDebut}
          aria-label="Retour au début"
          title="Retour au début"
        >
          ⏮
        </button>

        <button
          type="button"
          className="lecteur_vinyle_bouton"
          onClick={basculerLecture}
          aria-label={enLecture ? 'Mettre la musique en pause' : 'Lire la musique'}
        >
          {enLecture ? '⏸' : '▶'}
        </button>

        <button
          type="button"
          className={`lecteur_vinyle_bouton_secondaire ${boucle ? 'actif' : ''}`}
          onClick={toggleBoucle}
          aria-label={boucle ? 'Désactiver la lecture en boucle' : 'Activer la lecture en boucle'}
          title="Lecture en boucle"
        >
          🔁
        </button>
      </div>

      <div
        className="lecteur_vinyle_progression"
        onClick={gererClicProgression}
        role="slider"
        aria-label="Progression de la piste"
        aria-valuemin={0}
        aria-valuemax={duree}
        aria-valuenow={tempsActuel}
      >
        <div className="lecteur_vinyle_progression_remplie" style={{ width: `${progression}%` }}></div>
      </div>

      <div className="lecteur_vinyle_temps">
        <span>{formaterTempsPiste(tempsActuel)}</span>
        <span>{formaterTempsPiste(duree)}</span>
      </div>

      {/* Conteneur invisible utilisé uniquement par l'API YouTube pour la lecture audio */}
      {musique.type === 'youtube' && (
        <div ref={conteneurYoutubeRef} className="lecteur_vinyle_youtube_cache"></div>
      )}
    </div>
  );
}


// ======================================================================
// --- Préréglages ---------------------------------------------------------
// ======================================================================
// Un préréglage capture l'intégralité de la configuration visuelle et
// sonore de l'application (fond, couleurs/durées du minuteur, musique
// d'ambiance) afin de pouvoir la restaurer en un clic.

function genererIdPrereglage() {
  return `prereglage_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

// Carte défilable représentant un préréglage : aperçu du fond en image
// principale, bande basse avec le nom, et petites actions (mettre à jour,
// renommer, supprimer) révélées au survol.
function PrereglageCarte({ prereglage, onAppliquer, onRenommer, onSupprimer, onRemplacer }) {
  const styleApercu = prereglage.imageFond
    ? { backgroundImage: `url(${prereglage.imageFond})` }
    : { backgroundColor: prereglage.couleurFondAppliquee || '#1f2430' };

  return (
    <div className="prereglage_carte" onClick={onAppliquer}>
      <div className="prereglage_carte_apercu" style={styleApercu}>
        <div className="prereglage_carte_actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="prereglage_action_btn"
            onClick={onRemplacer}
            aria-label="Mettre à jour avec les réglages actuels"
            title="Mettre à jour avec les réglages actuels"
          >
            ⟳
          </button>
          <button
            type="button"
            className="prereglage_action_btn"
            onClick={onRenommer}
            aria-label="Renommer le préréglage"
            title="Renommer"
          >
            ✎
          </button>
          <button
            type="button"
            className="prereglage_action_btn"
            onClick={onSupprimer}
            aria-label="Supprimer le préréglage"
            title="Supprimer"
          >
            ×
          </button>
        </div>
      </div>
      <div className="prereglage_carte_bande">
        <span className="prereglage_carte_nom" title={prereglage.nom}>{prereglage.nom}</span>
      </div>
    </div>
  );
}

// Modale utilisée à la fois pour créer un nouveau préréglage (saisie du nom)
// et pour renommer un préréglage existant (champ pré-rempli)
function ModalPrereglage({ ouvert, modeRenommage, nomInitial, fermer, onValider }) {
  const [nom, setNom] = useState(nomInitial || '');

  useEffect(() => {
    setNom(nomInitial || '');
  }, [nomInitial, ouvert]);

  if (!ouvert) return null;

  const valider = () => {
    const nomFinal = nom.trim();
    if (!nomFinal) return;
    onValider(nomFinal);
  };

  return (
    <div className="modal_fond salon_modal_fond" onClick={fermer}>
      <div className="modal_fenetre salon_modal_fenetre" onClick={(e) => e.stopPropagation()}>
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>

        <div className="salon_modal_contenu">
          <h3 className="salon_modal_titre">
            {modeRenommage ? 'Renommer le préréglage' : 'Créer un préréglage'}
          </h3>

          <div className="salon_champ">
            <label className="salon_label" htmlFor="prereglage-nom">Nom du préréglage</label>
            <input
              id="prereglage-nom"
              type="text"
              className="param_input"
              placeholder="Ex : Soirée détente"
              value={nom}
              autoFocus
              onChange={(e) => setNom(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') valider(); }}
            />
          </div>

          <button type="button" className="salon_btn_valider_creation" onClick={valider}>
            {modeRenommage ? 'Renommer' : 'Créer le préréglage'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Section "Préréglages" affichée en haut du panneau Réglages : carrousel
// horizontal de cartes + bouton de création en bas de la page du panneau
function SectionPrereglages({
  prereglages,
  onAppliquer,
  onOuvrirRenommage,
  onDemanderSuppression,
  onRemplacer
}) {
  return (
    <div className="param_section prereglages_section">
      <h3 className="param_section_titre">Préréglages</h3>

      {prereglages.length === 0 ? (
        <p className="prereglages_vide">
          Aucun préréglage pour l'instant. Configure l'application ci-dessous, puis clique sur
          « Créer un préréglage » en bas de la page.
        </p>
      ) : (
        <div className="prereglages_scroll">
          {prereglages.map((prereglage) => (
            <PrereglageCarte
              key={prereglage.id}
              prereglage={prereglage}
              onAppliquer={() => onAppliquer(prereglage)}
              onRenommer={() => onOuvrirRenommage(prereglage.id)}
              onSupprimer={() => onDemanderSuppression(prereglage.id)}
              onRemplacer={() => onRemplacer(prereglage.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}


// --- Param : quatre sections ---
// 0. Préréglages (configurations complètes sauvegardées)
// 1. Arrière-plan du site (couleur RGB + image/GIF)
// 2. Musique d'ambiance (choix + aperçu + informations détaillées) — juste après le fond
// 3. Minuteur Pomodoro (durées + couleurs)
function Param({
  couleurFondInput,
  setCouleurFondInput,
  onAppliquerCouleur,
  onChangerImage,
  imageFondActuelle,
  reglages,
  onChangerDuree,
  onChangerCouleur,
  onReinitialiserReglages,
  musiqueActuelle,
  onOuvrirChoixMusique,
  onSupprimerMusique,
  prereglages,
  onAppliquerPrereglage,
  onOuvrirRenommagePrereglage,
  onDemanderSuppressionPrereglage,
  onRemplacerPrereglage,
  onOuvrirCreationPrereglage
}) {

  return (
    <div className='param'>
      <h2>Paramètre 2</h2>

      {/* --- Section : préréglages, toujours affichée en premier --- */}
      <SectionPrereglages
        prereglages={prereglages}
        onAppliquer={onAppliquerPrereglage}
        onOuvrirRenommage={onOuvrirRenommagePrereglage}
        onDemanderSuppression={onDemanderSuppressionPrereglage}
        onRemplacer={onRemplacerPrereglage}
      />

      {/* --- Section : personnalisation de l'arrière-plan --- */}
      <div className="param_section">
        <h3 className="param_section_titre">Arrière-plan du site</h3>

        {/* Option 1 : couleur de fond personnalisée au format RGB */}
        <div className="param_champ">
          <label className="param_label" htmlFor="couleur-fond">
            Couleur de fond (format RGB)
          </label>
          <div className="param_champ_ligne">
            <input
              id="couleur-fond"
              type="text"
              className="param_input"
              value={couleurFondInput}
              onChange={(e) => setCouleurFondInput(e.target.value)}
              placeholder="ex: 25, 25, 25"
            />
            <button className="param_btn_valider" onClick={onAppliquerCouleur}>
              Appliquer
            </button>
          </div>
        </div>

        {/* Option 2 : image ou GIF de fond depuis les fichiers de l'ordinateur */}
        <div className="param_champ">
          <label className="param_label" htmlFor="image-fond">
            Image / GIF de fond
          </label>

          <label htmlFor="image-fond" className="param_file_label">
            📁 Parcourir...
          </label>
          <input
            id="image-fond"
            type="file"
            accept="image/*,.gif"
            className="param_file_input"
            onChange={(e) => onChangerImage(e.target.files?.[0])}
          />

          {imageFondActuelle && (
            <span className="param_file_nom">Image de fond appliquée ✓</span>
          )}
        </div>
      </div>

      {/* --- Section : musique d'ambiance, juste après le fond --- */}
      <div className="param_section">
        <h3 className="param_section_titre">Musique d'ambiance</h3>
        <p className="param_musique_texte">
          Choisis la musique diffusée pendant que tu utilises l'application.
        </p>

        <div className="param_musique_bloc">
          <div className="param_musique_ligne">
            <button type="button" className="param_btn_valider" onClick={onOuvrirChoixMusique}>
              🎵 Choisir une musique
            </button>

            {musiqueActuelle && (
              <button type="button" className="param_btn_reinit" onClick={onSupprimerMusique}>
                Retirer la musique
              </button>
            )}
          </div>

          {musiqueActuelle && (
            <>
              {/* Carte d'aperçu compacte : miniature YouTube ou pochette (placeholder) Spotify */}
              <div className="param_musique_carte">
                <MiniatureMusique
                  className="param_musique_vignette"
                  iconeClassName="param_musique_vignette_icone"
                  type={musiqueActuelle.type}
                  thumbnail={musiqueActuelle.thumbnail}
                />
                <div className="param_musique_carte_details">
                  <span className="param_musique_carte_titre" title={musiqueActuelle.titre}>
                    {musiqueActuelle.titre}
                  </span>
                  <span className="param_musique_carte_artiste">
                    {musiqueActuelle.artiste || 'Artiste inconnu'}
                  </span>
                </div>
              </div>

              {/* Informations détaillées de la piste sélectionnée */}
              <div className="param_musique_infos">
                <div className="param_musique_info_ligne">
                  <span className="param_musique_info_label">Source</span>
                  <span
                    className={`param_musique_badge_source param_musique_badge_source--${musiqueActuelle.type}`}
                  >
                    {musiqueActuelle.type === 'youtube' ? 'YouTube' : 'Spotify'}
                  </span>
                </div>

                <div className="param_musique_info_ligne">
                  <span className="param_musique_info_label">Durée totale</span>
                  <span className="param_musique_info_valeur">
                    {musiqueActuelle.duree > 0 ? formaterTempsPiste(musiqueActuelle.duree) : 'Détection...'}
                  </span>
                </div>

                <div className="param_musique_info_ligne">
                  <span className="param_musique_info_label">Lecture</span>
                  <span
                    className={`param_musique_badge_etat param_musique_badge_etat--${musiqueActuelle.enLecture ? 'lecture' : 'pause'}`}
                  >
                    {musiqueActuelle.enLecture ? '▶ En lecture' : '⏸ En pause'}
                  </span>
                </div>

                <div className="param_musique_info_ligne">
                  <span className="param_musique_info_label">Répétition</span>
                  <span className="param_musique_badge_boucle">
                    {musiqueActuelle.boucle ? '🔁 Activée' : 'Désactivée'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- Section : personnalisation du minuteur Pomodoro --- */}
      <div className="param_section">
        <h3 className="param_section_titre">Minuteur Pomodoro</h3>

        {/* Durée de la session de travail, en minutes */}
        <div className="param_champ">
          <label className="param_label" htmlFor="duree-travail">
            Durée de la session (minutes)
          </label>
          <input
            id="duree-travail"
            type="number"
            min="1"
            max="180"
            className="param_input"
            value={reglages.dureeTravail}
            onChange={(e) => onChangerDuree('dureeTravail', e.target.value)}
          />
        </div>

        {/* Durée de la pause, en minutes */}
        <div className="param_champ">
          <label className="param_label" htmlFor="duree-pause">
            Durée de la pause (minutes)
          </label>
          <input
            id="duree-pause"
            type="number"
            min="1"
            max="180"
            className="param_input"
            value={reglages.dureePause}
            onChange={(e) => onChangerDuree('dureePause', e.target.value)}
          />
        </div>

        {/* Couleur du chronomètre (texte du minuteur) */}
        <div className="param_couleur_ligne">
          <label className="param_label" htmlFor="couleur-chrono">
            Couleur du chronomètre
          </label>
          <input
            id="couleur-chrono"
            type="color"
            className="param_couleur_input"
            value={reglages.couleurChrono}
            onChange={(e) => onChangerCouleur('couleurChrono', e.target.value)}
          />
        </div>

        {/* Couleur de la poignée du panneau latéral */}
        <div className="param_couleur_ligne">
          <label className="param_label" htmlFor="couleur-poignee">
            Couleur de la poignée du panneau
          </label>
          <input
            id="couleur-poignee"
            type="color"
            className="param_couleur_input"
            value={reglages.couleurPoignee}
            onChange={(e) => onChangerCouleur('couleurPoignee', e.target.value)}
          />
        </div>

        {/* Couleur des boutons du chronomètre */}
        <div className="param_couleur_ligne">
          <label className="param_label" htmlFor="couleur-boutons">
            Couleur des boutons du chronomètre
          </label>
          <input
            id="couleur-boutons"
            type="color"
            className="param_couleur_input"
            value={reglages.couleurBoutons}
            onChange={(e) => onChangerCouleur('couleurBoutons', e.target.value)}
          />
        </div>

        <button className="param_btn_reinit" onClick={onReinitialiserReglages}>
          Réinitialiser les réglages
        </button>
      </div>

      {/* --- Section : création d'un préréglage à partir des réglages actuels,
          toujours en bas de la page du panneau --- */}
      <div className="param_section prereglages_creation_section">
        <button
          type="button"
          className="param_btn_valider prereglage_btn_creer"
          onClick={onOuvrirCreationPrereglage}
        >
          + Créer un préréglage
        </button>
      </div>
    </div>
  );
}


// ======================================================================
// --- Section "Salons de course" ---------------------------------------
// ======================================================================

// Jeu de données statique temporaire, en attendant une vraie source (API/back)
const SALONS_DEMO = [
  { id: 's1', nom: 'Foulées du Matin', theme: 'Endurance', duree: '30 min' },
  { id: 's2', nom: 'Sprint Éclair', theme: 'Vitesse', duree: '15 min' },
  { id: 's3', nom: 'Trail Zen', theme: 'Trail', duree: '45 min' },
  { id: 's4', nom: 'Cardio Boost', theme: 'Cardio', duree: '20 min' },
  { id: 's5', nom: 'Marathon Découverte', theme: 'Endurance', duree: '60 min' },
  { id: 's6', nom: 'Côte Infernale', theme: 'Trail', duree: '40 min' },
];

// Carte représentant un salon rejoignable : image (placeholder), nom,
// thème et nombre de participants (valeur statique temporaire "4/5")
function CarteSalon({ salon, onRejoindre }) {
  return (
    <div className="salon_carte">
      <div className="salon_carte_image" aria-hidden="true">
        <span className="salon_carte_image_icone">🏞️</span>
      </div>
      <div className="salon_carte_info">
        <span className="salon_carte_nom">{salon.nom}</span>
        <div className="salon_carte_meta">
          <span className="salon_carte_theme">{salon.theme}</span>
          <span className="salon_carte_participants">4/5</span>
        </div>
        <button
          type="button"
          className="salon_carte_btn_rejoindre"
          onClick={() => onRejoindre(salon)}
        >
          Rejoindre
        </button>
      </div>
    </div>
  );
}
// Modale de création d'un salon : image de fond, musique de fond
// (lien YouTube ou recherche via un compte Spotify connecté),
// nombre de participants et thème du salon.
function ModalCreerSalon({ ouvert, fermer }) {
  const [imageFond, setImageFond] = useState(null);
  const [typeMusique, setTypeMusique] = useState('youtube');
  const [lienYoutube, setLienYoutube] = useState('');
  const [spotifyConnecte, setSpotifyConnecte] = useState(false);
  const [rechercheSpotify, setRechercheSpotify] = useState('');
  const [nbParticipants, setNbParticipants] = useState(5);
  const [themeSalon, setThemeSalon] = useState('');

  if (!ouvert) return null;

  const gererImage = (fichier) => {
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionnement à 1920px maximum (Full HD) pour éviter
        // les payloads trop lourds vers Supabase
        const MAX_TAILLE = 1920;
        let largeur = img.width;
        let hauteur = img.height;

        if (largeur > hauteur && largeur > MAX_TAILLE) {
          hauteur *= MAX_TAILLE / largeur;
          largeur = MAX_TAILLE;
        } else if (hauteur > MAX_TAILLE) {
          largeur *= MAX_TAILLE / hauteur;
          hauteur = MAX_TAILLE;
        }

        const canvas = document.createElement('canvas');
        canvas.width = largeur;
        canvas.height = hauteur;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, largeur, hauteur);

        // Compression en JPEG qualité 0.8
        const dataUrlCompresser = canvas.toDataURL('image/jpeg', 0.8);
        setImageFond(dataUrlCompresser);
      };
      img.src = e.target.result;
    };
    lecteur.readAsDataURL(fichier);
  };

  // Simulation de connexion à un compte Spotify (pas d'appel réel à l'API ici)
  const connecterSpotify = () => {
    setSpotifyConnecte(true);
  };

  const validerCreation = () => {
    alert('Salon créé (simulation) !');
    fermer();
  };

  return (
    <div className="modal_fond salon_modal_fond" onClick={fermer}>
      <div className="modal_fenetre salon_modal_fenetre" onClick={(e) => e.stopPropagation()}>
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>

        <div className="salon_modal_contenu">
          <h3 className="salon_modal_titre">Créer un salon</h3>

          {/* Image de fond du salon */}
          <div className="salon_champ">
            <label className="salon_label" htmlFor="salon-image-fond">Image de fond</label>
            <label htmlFor="salon-image-fond" className="param_file_label">
              📁 Parcourir...
            </label>
            <input
              id="salon-image-fond"
              type="file"
              accept="image/*,.gif"
              className="param_file_input"
              onChange={(e) => gererImage(e.target.files?.[0])}
            />
            {imageFond && <span className="param_file_nom">Image sélectionnée ✓</span>}
          </div>

          {/* Musique de fond : lien YouTube ou recherche Spotify */}
          <div className="salon_champ">
            <label className="salon_label">Musique de fond</label>
            <div className="salon_musique_choix">
              <button
                type="button"
                className={`salon_musique_onglet ${typeMusique === 'youtube' ? 'actif' : ''}`}
                onClick={() => setTypeMusique('youtube')}
              >
                Lien YouTube
              </button>
              <button
                type="button"
                className={`salon_musique_onglet ${typeMusique === 'spotify' ? 'actif' : ''}`}
                onClick={() => setTypeMusique('spotify')}
              >
                Spotify
              </button>
            </div>

            {typeMusique === 'youtube' ? (
              <input
                type="text"
                className="param_input"
                placeholder="https://youtube.com/..."
                value={lienYoutube}
                onChange={(e) => setLienYoutube(e.target.value)}
              />
            ) : (
              <div className="salon_spotify_zone">
                {!spotifyConnecte ? (
                  <button type="button" className="salon_btn_spotify" onClick={connecterSpotify}>
                    🎧 Connecter mon compte Spotify
                  </button>
                ) : (
                  <input
                    type="text"
                    className="param_input"
                    placeholder="Rechercher un son sur Spotify..."
                    value={rechercheSpotify}
                    onChange={(e) => setRechercheSpotify(e.target.value)}
                  />
                )}
              </div>
            )}
          </div>

          {/* Nombre de participants */}
          <div className="salon_champ">
            <label className="salon_label" htmlFor="salon-participants">
              Nombre de participants
            </label>
            <input
              id="salon-participants"
              type="number"
              min="2"
              max="20"
              className="param_input"
              value={nbParticipants}
              onChange={(e) => setNbParticipants(e.target.value)}
            />
          </div>

          {/* Thème du salon */}
          <div className="salon_champ">
            <label className="salon_label" htmlFor="salon-theme">Thème du salon</label>
            <input
              id="salon-theme"
              type="text"
              className="param_input"
              placeholder="Ex : Endurance, Trail, Sprint..."
              value={themeSalon}
              onChange={(e) => setThemeSalon(e.target.value)}
            />
          </div>

          <button type="button" className="salon_btn_valider_creation" onClick={validerCreation}>
            Créer le salon
          </button>
        </div>
      </div>
    </div>
  );
}

function Salon_course() {
  const [recherche, setRecherche] = useState('');
  const [filtreTheme, setFiltreTheme] = useState('tous');
  const [filtreDuree, setFiltreDuree] = useState('toutes');
  const [rejoindreOuvert, setRejoindreOuvert] = useState(false);
  const [codeSalon, setCodeSalon] = useState('');
  const [creerOuvert, setCreerOuvert] = useState(false);
  const rejoindreSalonDirect = (salon) => {
    alert(`Vous avez rejoint le salon « ${salon.nom} » (simulation) !`);
  };

  const themesDisponibles = ['tous', ...new Set(SALONS_DEMO.map((s) => s.theme))];
  const dureesDisponibles = ['toutes', ...new Set(SALONS_DEMO.map((s) => s.duree))];

  const salonsFiltres = SALONS_DEMO.filter((s) => {
    const correspondNom = s.nom.toLowerCase().includes(recherche.trim().toLowerCase());
    const correspondTheme = filtreTheme === 'tous' || s.theme === filtreTheme;
    const correspondDuree = filtreDuree === 'toutes' || s.duree === filtreDuree;
    return correspondNom && correspondTheme && correspondDuree;
  });

  const validerCodeSalon = () => {
    if (!codeSalon.trim()) return;
    alert(`Tentative de connexion au salon avec le code : ${codeSalon.trim()}`);
    setCodeSalon('');
    setRejoindreOuvert(false);
  };

  return (
    <div className="salon_course">
      <div className="salon_entete">
        <h2>Salons de course</h2>
        <div className="salon_actions_principales">
          <button
            type="button"
            className="salon_btn_rejoindre"
            onClick={() => setRejoindreOuvert((v) => !v)}
          >
            Rejoindre
          </button>
          <button type="button" className="salon_btn_creer" onClick={() => setCreerOuvert(true)}>
            + Créer
          </button>
        </div>
      </div>

      {/* Encart de saisie du code de salon, affiché au clic sur "Rejoindre" */}
      {rejoindreOuvert && (
        <div className="salon_rejoindre_encart">
          <input
            type="text"
            className="salon_rejoindre_input"
            placeholder="Code du salon"
            value={codeSalon}
            onChange={(e) => setCodeSalon(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') validerCodeSalon(); }}
            autoFocus
          />
          <button type="button" className="salon_rejoindre_valider" onClick={validerCodeSalon}>
            Valider
          </button>
        </div>
      )}

      {/* Barre de recherche + filtres (thème, durée) */}
      <div className="salon_recherche_zone">
        <input
          type="text"
          className="salon_recherche_input"
          placeholder="Rechercher un salon..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <div className="salon_filtres">
          <select
            className="salon_filtre_select"
            value={filtreTheme}
            onChange={(e) => setFiltreTheme(e.target.value)}
            aria-label="Filtrer par thème"
          >
            {themesDisponibles.map((t) => (
              <option key={t} value={t}>{t === 'tous' ? 'Tous les thèmes' : t}</option>
            ))}
          </select>
          <select
            className="salon_filtre_select"
            value={filtreDuree}
            onChange={(e) => setFiltreDuree(e.target.value)}
            aria-label="Filtrer par durée"
          >
            {dureesDisponibles.map((d) => (
              <option key={d} value={d}>{d === 'toutes' ? 'Toutes durées' : d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des salons rejoignables, filtrée */}
      {salonsFiltres.length === 0 ? (
        <p className="salon_vide">Aucun salon ne correspond à votre recherche.</p>
      ) : (
        <div className="salon_liste">
          {salonsFiltres.map((salon) => (
            <CarteSalon key={salon.id} salon={salon} onRejoindre={rejoindreSalonDirect} />
          ))}
        </div>
      )}

      <ModalCreerSalon ouvert={creerOuvert} fermer={() => setCreerOuvert(false)} />
    </div>
  );
}


// --- Onglet "Récompenses" (dans BlocDeux) ---
function OngletRecompenses({ recompenses, onOuvrirRecompense }) {
  return (
    <div className="recompense_liste_conteneur">
      <h3 className="recompense_liste_titre">Mes Récompenses</h3>
      <div className="recompense_liste">
        {recompenses.length === 0 ? (
          <p className="recompense_liste_vide">Aucune récompense pour le moment.</p>
        ) : (
          recompenses.map(r => (
            <div key={r.id} className={`recompense_item ${r.etat === 'ouverte' ? 'recompense_item_ouverte' : 'recompense_item_fermee'}`}>
              {r.etat === 'non_ouverte' ? (
                <>
                  <div className="recompense_item_visuel_ferme">?</div>
                  <div className="recompense_item_infos">
                    <span className="recompense_item_statut">Non ouverte</span>
                    <span className="recompense_item_date">{new Date(r.dateCreation).toLocaleDateString()}</span>
                  </div>
                  <button className="btn_primaire recompense_item_btn_ouvrir" onClick={() => onOuvrirRecompense(r.id)}>
                    Ouvrir
                  </button>
                </>
              ) : (
                <>
                  <div className="recompense_item_visuel_ouvert">
                    {r.type === 'coins' ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '32px', height: '32px', color: '#fbbf24' }}>
                        <circle cx="12" cy="12" r="10" fill="#fbbf24" />
                        <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="12" fontWeight="bold" fill="#b45309">C</text>
                      </svg>
                    ) : (
                      <span className="recompense_item_badge">🏆</span>
                    )}
                  </div>
                  <div className="recompense_item_infos">
                    <span className="recompense_item_nom">{r.type === 'coins' ? `+${r.valeur} Coins` : r.valeur}</span>
                    <span className="recompense_item_statut">Ouverte le {new Date(r.dateCreation).toLocaleDateString()}</span>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const ONGLETS_POIGNEE = [
  { id: 1, icone: <SquarePen size={18} />, label: 'Notes', notif: true },
  { id: 4, icone: <Gift size={18} />, label: 'Récompenses', notif: true },
  { id: 2, icone: '⚙️', label: 'Réglages', notif: true },
  { id: 3, icone: '🏁', label: 'Salon de course', notif: true },
];

// BlocDeux relaie les props "fond" et "réglages Pomodoro" vers Param,
// et les props des tâches/notes vers Note
function BlocDeux({
  ouvert,
  setOuvert,
  couleurFondInput,
  setCouleurFondInput,
  onAppliquerCouleur,
  onChangerImage,
  imageFondActuelle,
  reglages,
  onChangerDuree,
  onChangerCouleur,
  onReinitialiserReglages,
  taches,
  ajouterTache,
  actionsPourTache,
  definirOrdreTache,
  reinitialiserOrdreTaches,
  viderTaches,
  pointsPomodoro,
  modeLectureSession,
  setModeLectureSession,
  musiqueActuelle,
  onOuvrirChoixMusique,
  onSupprimerMusique,
  prereglages,
  onAppliquerPrereglage,
  onOuvrirRenommagePrereglage,
  onDemanderSuppressionPrereglage,
  onRemplacerPrereglage,
  onOuvrirCreationPrereglage,
  recompenses,
  onOuvrirRecompense,
  vueActive,
  setVueActive,
  sessionConsulteeApp,
  setSessionConsulteeApp,
  sessionsSauvegardees,
  setSessionsSauvegardees,
  sessionsChargeesPourRef,
  remplacerTachesActives,
  titreSession,
  setTitreSession,
  numeroSession
}) {

  const choisirOnglet = (id) => {
    setVueActive(id);
    if (!ouvert) setOuvert(true);
  };

  return (
    <div className={`panel ${ouvert ? '' : 'panel--collapsed'}`}>
      <div className="panel_poignee">
        <button
          className="poignee_toggle"
          onClick={() => setOuvert(!ouvert)}
          aria-label={ouvert ? 'Réduire le panneau' : 'Ouvrir le panneau'}
        >
          {ouvert ? '›' : '‹'}
        </button>

        <div className="poignee_carres">
          {ONGLETS_POIGNEE.map((onglet) => (
            <button
              key={onglet.id}
              className={`poignee_carre ${vueActive === onglet.id ? 'actif' : ''}`}
              onClick={() => choisirOnglet(onglet.id)}
              aria-label={onglet.label}
              title={onglet.label}
            >
              <span className="poignee_carre_icone">{onglet.icone}</span>
              {onglet.notif && <span className="poignee_notif" aria-hidden="true"></span>}
            </button>
          ))}
        </div>
      </div>

      <div className="panel_corps">
        <div className="panel_controles">
          <button className={vueActive === 1 ? 'actif' : ''} onClick={() => setVueActive(1)}>Notes</button>
          <button className={vueActive === 2 ? 'actif' : ''} onClick={() => setVueActive(2)}>Mon Pomodoro</button>
          <button className={vueActive === 3 ? 'actif' : ''} onClick={() => setVueActive(3)}>Salon de course</button>
        </div>

        <div className="panel_contenu">
          {vueActive === 1 && (
            <Note
              taches={taches}
              ajouterTache={ajouterTache}
              actionsPour={actionsPourTache}
              definirOrdreTache={definirOrdreTache}
              reinitialiserOrdre={reinitialiserOrdreTaches}
              viderTaches={viderTaches}
              pointsPomodoro={pointsPomodoro}
              modeLecture={modeLectureSession}
              setModeLecture={setModeLectureSession}
              sessionConsultee={sessionConsulteeApp}
              setSessionConsultee={setSessionConsulteeApp}
              sessionsSauvegardees={sessionsSauvegardees}
              setSessionsSauvegardees={setSessionsSauvegardees}
              sessionsChargeesPourRef={sessionsChargeesPourRef}
              remplacerTachesActives={remplacerTachesActives}
              titreSession={titreSession}
              setTitreSession={setTitreSession}
              numeroSession={numeroSession}
            />
          )}
          {vueActive === 2 && (
            <Param
              couleurFondInput={couleurFondInput}
              setCouleurFondInput={setCouleurFondInput}
              onAppliquerCouleur={onAppliquerCouleur}
              onChangerImage={onChangerImage}
              imageFondActuelle={imageFondActuelle}
              reglages={reglages}
              onChangerDuree={onChangerDuree}
              onChangerCouleur={onChangerCouleur}
              onReinitialiserReglages={onReinitialiserReglages}
              musiqueActuelle={musiqueActuelle}
              onOuvrirChoixMusique={onOuvrirChoixMusique}
              onSupprimerMusique={onSupprimerMusique}
              prereglages={prereglages}
              onAppliquerPrereglage={onAppliquerPrereglage}
              onOuvrirRenommagePrereglage={onOuvrirRenommagePrereglage}
              onDemanderSuppressionPrereglage={onDemanderSuppressionPrereglage}
              onRemplacerPrereglage={onRemplacerPrereglage}
              onOuvrirCreationPrereglage={onOuvrirCreationPrereglage}
            />
          )}
          {vueActive === 3 && <Salon_course />}
          {vueActive === 4 && (
            <OngletRecompenses
              recompenses={recompenses}
              onOuvrirRecompense={onOuvrirRecompense}
            />
          )}
        </div>
      </div>
    </div>
  );
}


// --- BarreDefilante : le coureur HTML animé est placé AU-DESSUS de la bande
// de flèches défilantes, via des iframes pointant vers runner.html et runner_repos.html.
// Ils doivent être placés dans /public.
function BarreDefilante({ actif, phase }) {
  const fleches = Array.from({ length: 16 }, (_, i) => i);
  const isRunning = actif && phase === 'travail';

  return (
    <div className="bas_page">
      <div className="coureurs_container">
        {/* Coureur animé (En mouvement) */}
        <iframe
          src="/runner.html"
          title="Coureur animé"
          className={`coureur_defilant coureur_course ${isRunning ? 'visible' : 'hidden'}`}
          frameBorder="0"
          scrolling="no"
          allowTransparency="true"
        />

        {/* Coureur au repos (En pause) */}
        <iframe
          src="/runner_pose.html"
          title="Coureur au repos"
          className={`coureur_defilant coureur_pose ${!isRunning ? 'visible' : 'hidden'}`}
          frameBorder="0"
          scrolling="no"
          allowTransparency="true"
        />
      </div>

      <div className="fleches_bande">
        <div className={`fleches_piste ${actif ? '' : 'arret'}`}>
          {fleches.map((i) => <span key={`a-${i}`}>→</span>)}
          {fleches.map((i) => <span key={`b-${i}`}>→</span>)}
        </div>
      </div>
    </div>
  );
}


function App() {
  const [panelOuvert, setPanelOuvert] = useState(true);
  const [enMarche, setEnMarche] = useState(false);
  const [chronoPhase, setChronoPhase] = useState('travail');
  // Navigation ultra simple entre la vitrine d'accueil et l'appli Pomodoro,
  // sans routeur : on affiche l'un ou l'autre selon cet état.
  const [pageActuelle, setPageActuelle] = useState('accueil');
  // Fenêtre "Se connecter" / "S'inscrire" ouverte depuis la navbar ou la
  // fenêtre de choix d'accès. `vueConnexionInitiale` détermine si elle
  // s'ouvre directement sur le formulaire de connexion ou de création.
  const [connexionOuverte, setConnexionOuverte] = useState(false);
  const [vueConnexionInitiale, setVueConnexionInitiale] = useState('connexion');
  // Fenêtre de choix d'accès (S'inscrire / Continuer en invité / Se connecter),
  // affichée dès qu'un utilisateur non connecté tente d'accéder à une page.
  const [choixAccesOuvert, setChoixAccesOuvert] = useState(false);
  // Vrai après avoir choisi "Continuer en tant qu'invité" ; réinitialisé
  // dès qu'un vrai compte se connecte ou se déconnecte.
  const [modeInvite, setModeInvite] = useState(false);

  const [coins, setCoins] = useState(0);
  const [recompenses, setRecompenses] = useState([]);
  const [tempsTotalPomodoro, setTempsTotalPomodoro] = useState(0);
  const [carteRecompenseOuverte, setCarteRecompenseOuverte] = useState(false);
  const [recompenseCourante, setRecompenseCourante] = useState(null);

  const { connecte, utilisateur } = useAuth();

  // Sessions archivées chargées au niveau App pour les rendre disponibles
  // à la fois dans le composant Note et dans l'onglet Historique du profil.
  const sessionsChargeesPourRef = useRef(null);
  const [sessionsProfilArchivees, setSessionsProfilArchivees] = useState([]);
  useEffect(() => {
    if (!connecte || !utilisateur?.id) {
      setSessionsProfilArchivees([]);
      sessionsChargeesPourRef.current = 'invite';
      return;
    }
    let annule = false;
    (async () => {
      const data = await chargerSessionsArchivees(utilisateur.id);
      if (!annule) {
        setSessionsProfilArchivees(data);
        sessionsChargeesPourRef.current = utilisateur.id;
      }
    })();
    return () => { annule = true; };
  }, [connecte, utilisateur?.id]);

  // Pseudo affiché à la fois dans le panneau joueur et la modale de profil :
  // priorité au pseudo choisi par l'utilisateur à la création de son compte
  // (stocké dans user_metadata), repli sur l'email si aucun pseudo n'a été
  // renseigné, et repli final sur "Invité" en mode invité / non connecté.
  const pseudoJoueur = connecte
    ? (utilisateur?.displayName || utilisateur?.email || 'Pseudo')
    : 'Invité';

  // Dès qu'un utilisateur se connecte réellement (email/mdp, création de
  // compte ou Google), on quitte le mode invité et on l'emmène sur Pomodoro.
  // À l'inverse, une vraie déconnexion (transition connecté -> déconnecté)
  // ramène automatiquement sur l'accueil.
  const etaitConnecteRef = useRef(connecte);
  useEffect(() => {
    const etaitConnecte = etaitConnecteRef.current;
    etaitConnecteRef.current = connecte;

    if (connecte) {
      setModeInvite(false);
      setChoixAccesOuvert(false);
      setPageActuelle('pomodoro');
    } else if (etaitConnecte) {
      setModeInvite(false);
      setPageActuelle('accueil');
    }
  }, [connecte]);

  // Ouvre la fenêtre de choix d'accès à la place d'une navigation directe
  // tant que l'utilisateur n'est pas réellement connecté (le mode invité
  // ne suffit pas : on redemande à chaque clic sur Home ou Pomodoro).
  const demanderAcces = () => setChoixAccesOuvert(true);

  const [confirmationAccueilOuverte, setConfirmationAccueilOuverte] = useState(false);

  const allerAccueil = () => {
    if (connecte) {
      setPageActuelle('accueil');
    } else if (modeInvite) {
      setConfirmationAccueilOuverte(true);
    } else {
      demanderAcces();
    }
  };

  const gererCommencer = () => {
    if (connecte) {
      setPageActuelle('pomodoro');
    } else {
      demanderAcces();
    }
  };

  const allerPomodoro = () => {
    if (connecte) setPageActuelle('pomodoro');
    else demanderAcces();
  };

  const choisirInscription = () => {
    setChoixAccesOuvert(false);
    setVueConnexionInitiale('creation');
    setConnexionOuverte(true);
  };

  const choisirConnexion = () => {
    setChoixAccesOuvert(false);
    setVueConnexionInitiale('connexion');
    setConnexionOuverte(true);
  };

  const choisirInvite = () => {
    setChoixAccesOuvert(false);
    setModeInvite(true);
    setPageActuelle('pomodoro');
  };

  const quitterModeInvite = () => {
    // Nettoyage des données temporaires de l'invité
    setTaches([]);
    setPointsPomodoro([]);
    setHistoriqueJoursPomodoro([]);
    setReglages(REGLAGES_PAR_DEFAUT);
    setMusiqueAmbiance(null);
    setLecteurMusiqueVisible(false);
    setCouleurFondAppliquee(null);
    setImageFond(null);
    setModeInvite(false);

    // Fermeture de la modale et redirection
    setConfirmationAccueilOuverte(false);
    setPageActuelle('accueil');
  };
  // Vrai quand l'onglet Notes consulte une ancienne session (lecture seule) :
  // partagé avec le Chrono pour l'avertir que le temps de travail ne sera
  // pas comptabilisé dans cette session.
  const [modeLectureSession, setModeLectureSession] = useState(false);
  const [sessionConsulteeApp, setSessionConsulteeApp] = useState(null);
  const [profilOuvert, setProfilOuvert] = useState(false);
  const [vueActive, setVueActive] = useState(1);
  const [distanceTotale, setDistanceTotale] = useState(0);

  // --- Photo de profil : partagée entre le panneau joueur, la modale de
  // profil et l'onglet Paramètres. { dataUrl, position: { x, y } }.
  // Source de vérité = Supabase (table « preferences_utilisateur »), donc :
  //  - un utilisateur en mode invité (non connecté) n'a jamais de photo :
  //    on affiche systématiquement la valeur vide.
  //  - un utilisateur connecté voit la photo enregistrée dans son profil.
  const [photoProfil, setPhotoProfil] = useState(PHOTO_PROFIL_VIDE);

  useEffect(() => {
    if (!connecte || !utilisateur?.id) {
      setPhotoProfil(PHOTO_PROFIL_VIDE);
      return;
    }
    let annule = false;
    (async () => {
      const profil = await chargerProfil(utilisateur.id);
      if (!annule) setPhotoProfil(profil?.photo_profil ?? PHOTO_PROFIL_VIDE);
    })();
    return () => { annule = true; };
  }, [connecte, utilisateur?.id]);

  const [enregistrementPhotoEnCours, setEnregistrementPhotoEnCours] = useState(false);
  const [erreurPhotoProfil, setErreurPhotoProfil] = useState(null);

  // Enregistre la nouvelle photo de profil (dataUrl + recadrage) dans
  // Supabase. Appelée uniquement pour un utilisateur réellement connecté :
  // un invité n'a pas de compte où la persister (voir OngletParametres,
  // qui masque d'ailleurs entièrement ces contrôles pour les invités).
  const enregistrerPhotoProfil = async (nouvellePhotoProfil) => {
    if (!connecte || !utilisateur?.id) return;
    setEnregistrementPhotoEnCours(true);
    setErreurPhotoProfil(null);
    try {
      await sauvegarderPhotoProfil(utilisateur.id, nouvellePhotoProfil);
      setPhotoProfil(nouvellePhotoProfil);
    } catch (err) {
      setErreurPhotoProfil(`Impossible d'enregistrer la photo : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setEnregistrementPhotoEnCours(false);
    }
  };
  // Repère l'horodatage du dernier ajout de session comptabilisé, afin
  // d'ignorer un éventuel second déclenchement rapproché du même événement
  // de fin de session (voir ajouterDistanceSession ci-dessous).
  const dernierAjoutSessionRef = useRef(0);

  // --- Pomodoro Tracker : simple compteur éphémère de la session en cours
  // (jusqu'à 10 points, remis à zéro à chaque nouvelle session de notes ou
  // changement de compte). N'est PAS une donnée persistante : il n'a donc
  // pas besoin d'être synchronisé vers Supabase, mais DOIT être réinitialisé
  // au changement d'utilisateur pour ne jamais laisser le tracker d'un
  // compte visible chez un autre (isolation stricte, cf. historiqueJoursPomodoro
  // ci-dessous pour l'historique réellement persistant).
  const [pointsPomodoro, setPointsPomodoro] = useState([]);
  useEffect(() => {
    setPointsPomodoro([]);
  }, [connecte, utilisateur?.id]);

  // --- Historique complet des séances Pomodoro terminées, utilisé par la
  // heatmap de l'onglet "Profil". Chargé depuis / synchronisé vers Supabase
  // (table « seances_pomodoro ») pour un compte connecté : chaque séance
  // terminée y est ajoutée (voir ajouterDistanceSession ci-dessous). Mode
  // invité : en mémoire uniquement.
  const [historiqueJoursPomodoro, setHistoriqueJoursPomodoro] = useState([]);
  const seancesChargeesPourRef = useRef(null);

  useEffect(() => {
    if (!connecte || !utilisateur?.id) {
      setHistoriqueJoursPomodoro([]);
      seancesChargeesPourRef.current = 'invite';
      return;
    }
    let annule = false;
    (async () => {
      const historique = await chargerHistorique(utilisateur.id);
      if (!annule) {
        setHistoriqueJoursPomodoro(historique);
        seancesChargeesPourRef.current = utilisateur.id;
      }
    })();
    return () => { annule = true; };
  }, [connecte, utilisateur?.id]);

  // --- États : personnalisation de l'arrière-plan ---
  const [couleurFondInput, setCouleurFondInput] = useState('');
  const [couleurFondAppliquee, setCouleurFondAppliquee] = useState(null);
  const [imageFond, setImageFond] = useState(null);
  const [bio, setBio] = useState('');

  // --- Réglages Pomodoro (durées + couleurs) ---
  // Restaurés depuis Supabase pour un compte connecté (voir plus bas, table
  // "preferences_utilisateur"). Valeur par défaut le temps du chargement,
  // ou pour un invité (aucune persistance en mode invité).
  const [reglages, setReglages] = useState(REGLAGES_PAR_DEFAUT);

  const ajouterDistanceSession = (metres) => {
    const maintenant = Date.now();



    // Protection contre un double déclenchement rapproché de la même fin de
    // session (ex : re-render en cascade juste après la fin du chrono), qui
    // ajouterait deux fois la distance / un point en trop dans le tracker
    // pour une seule et même séance réellement terminée.
    if (maintenant - dernierAjoutSessionRef.current < 1000) return;
    dernierAjoutSessionRef.current = maintenant;

    setDistanceTotale((prev) => prev + metres);

    // Génération aléatoire de Coins en fonction du temps travaillé
    const minutesTravaillees = reglages.dureeTravail;
    const gainAleatoire = minutesTravaillees * (Math.floor(Math.random() * 5) + 1); // 1 à 5 coins par minute
    setCoins(prev => prev + gainAleatoire);

    // Suivi du temps total et déclenchement de la carte récompense
    setTempsTotalPomodoro(prev => {
      const nouveauTotal = prev + minutesTravaillees;
      if (Math.floor(nouveauTotal / 60) > Math.floor(prev / 60)) {
        // Ajouter une nouvelle carte récompense
        if (connecte && utilisateur?.id) {
          const gainAleatoireType = Math.random() > 0.5 ? 'coins' : 'badge';
          const nouvelleValeur = gainAleatoireType === 'coins' ? (Math.floor(Math.random() * 100) + 50) : 'Pomodoro Expert';
          const gain = {
            type: gainAleatoireType,
            valeur: nouvelleValeur,
            etat: 'non_ouverte',
            afficheeSurTableau: true,
            position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 200 }
          };
          ajouterRecompense(utilisateur.id, gain).then(rep => {
            setRecompenses(current => [...current, rep]);
          });
        }
      }
      return nouveauTotal;
    });

    // Chaque séance de travail terminée ajoute un point au Pomodoro Tracker
    // (durée de la séance = réglage courant en minutes), limité à 10 points
    setPointsPomodoro((prev) => {
      const nouveauPoint = {
        id: `point_${maintenant}_${Math.floor(Math.random() * 100000)}`,
        duree: reglages.dureeTravail,
      };
      return [...prev, nouveauPoint].slice(-10);
    });

    // Alimente aussi l'historique (non plafonné) utilisé par la heatmap
    // de l'onglet "Profil" : un jour est actif dès qu'au moins une séance
    // de travail y a été terminée.
    setHistoriqueJoursPomodoro((prev) => {
      const jourAujourdhui = formaterJourIso(new Date(maintenant));
      const misAJour = [...prev, jourAujourdhui];

      // Persiste le jour dans Supabase pour un compte connecté (dont le
      // chargement initial est bien terminé). En mode invité, ou pendant la
      // fenêtre de changement de compte, la séance ne vit qu'en mémoire.
      if (connecte && utilisateur?.id && seancesChargeesPourRef.current === utilisateur.id) {
        ajouterJourHistorique(utilisateur.id, jourAujourdhui);
      }

      return misAJour;
    });
  };

  // --- Tâches / Notes (liste + notes épinglées sur le fond principal) ---
  // L'état vit ici (et non dans le composant Note) afin que les notes
  // épinglées restent visibles même quand l'onglet "Notes" n'est pas actif.
  // Pour un compte connecté, les notes sont chargées depuis / synchronisées
  // vers Supabase (table « taches »), voir les deux effets juste après ce
  // state. Le mode invité n'a AUCUNE persistance : ses notes vivent
  // uniquement en mémoire et disparaissent à la déconnexion, au retour au
  // mode invité, ou à la fermeture de l'onglet.
  const [taches, setTaches] = useState([]);
  // Repère l'utilisateur pour lequel le chargement local des notes est
  // terminé ('invite' en mode invité). Tant que cette valeur ne correspond
  // pas à l'utilisateur courant, l'effet de synchronisation ci-dessous ne
  // doit RIEN écrire : sans cette garde, les notes encore en mémoire de
  // l'utilisateur précédent pourraient être enregistrées sous l'id du
  // nouvel utilisateur pendant la fenêtre de temps entre connexion/déconnexion
  // et la fin du chargement de ses propres notes.
  const tachesChargeesPourRef = useRef(null);
  // Id de la note pour laquelle une confirmation de désépinglage est demandée
  const [idADesepingler, setIdADesepingler] = useState(null);

  const [numeroSession, setNumeroSession] = useState('0001');
  const [titreSession, setTitreSession] = useState('');
  useEffect(() => {
    setNumeroSession(genererNumeroSession(sessionsProfilArchivees));
  }, [sessionsProfilArchivees]);

  // --- Musique d'ambiance : piste choisie (persistée) + visibilité du lecteur ---
  // L'objet musiqueAmbiance regroupe toute l'information sur la piste en
  // cours : type/source, titre, artiste, durée, miniature/pochette, position
  // du widget flottant, et état de lecture (enLecture / boucle). Centraliser
  // cet état dans App permet au panneau Réglages d'afficher les informations
  // détaillées de la piste, en plus du lecteur flottant lui-même.
  // Restaurée depuis Supabase pour un compte connecté (voir plus bas). Reste
  // à `null` en mode invité : aucune persistance pour un invité.
  const [musiqueAmbiance, setMusiqueAmbiance] = useState(null);
  const [choixMusiqueOuvert, setChoixMusiqueOuvert] = useState(false);
  const [lecteurMusiqueVisible, setLecteurMusiqueVisible] = useState(false);

  // --- Préférences utilisateur (réglages courants, musique d'ambiance,
  // couleur/image de fond) : chargées depuis / synchronisées vers Supabase
  // (table « preferences_utilisateur »). Isolation stricte entre comptes,
  // comme pour les notes, préréglages et historique des séances.
  const preferencesChargeesPourRef = useRef(null);

  useEffect(() => {
    if (!connecte || !utilisateur?.id) {
      // Mode invité : repli sur les valeurs par défaut, aucune persistance.
      setReglages(REGLAGES_PAR_DEFAUT);
      setMusiqueAmbiance(null);
      setLecteurMusiqueVisible(false);
      setCouleurFondAppliquee(null);
      setImageFond(null);
      preferencesChargeesPourRef.current = 'invite';
      return;
    }
    let annule = false;
    (async () => {
      const profil = await chargerProfil(utilisateur.id);
      const recompensesData = await chargerRecompenses(utilisateur.id);
      if (annule) return;
      setRecompenses(recompensesData);
      const config = profil?.preferences || {};
      setReglages({ ...REGLAGES_PAR_DEFAUT, ...(config.reglages || {}) });
      setCouleurFondAppliquee(config.couleurFondAppliquee ?? null);
      setImageFond(config.imageFond ?? null);

      // Restauration Coins et temps total
      setCoins(profil?.coins ?? 0);
      setTempsTotalPomodoro(profil?.temps_total_pomodoro ?? 0);

      if (config.musiqueAmbiance) {
        setMusiqueAmbiance({ boucle: false, position: null, ...config.musiqueAmbiance, enLecture: false });
        setLecteurMusiqueVisible(true);
      } else {
        setMusiqueAmbiance(null);
        setLecteurMusiqueVisible(false);
      }
      setBio(config.bio ?? '');
      preferencesChargeesPourRef.current = utilisateur.id;
    })();
    return () => { annule = true; };
  }, [connecte, utilisateur?.id]);

  // Génération d'une carte test à chaque connexion
  useEffect(() => {
    if (connecte && utilisateur?.id) {
      const ajouterCarteTest = async () => {
        const gain = {
          type: 'badge',
          valeur: 'Badge Novice',
          etat: 'non_ouverte',
          afficheeSurTableau: true,
          position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 200 }
        };
        const nouvelleRecompense = await ajouterRecompense(utilisateur.id, gain);
        setRecompenses(prev => [...prev, nouvelleRecompense]);
      };
      ajouterCarteTest();
    }
  }, [connecte, utilisateur?.id]);

  useEffect(() => {
    if (!connecte || !utilisateur?.id) return;
    if (preferencesChargeesPourRef.current !== utilisateur.id) return;

    const idUtilisateur = utilisateur.id;
    // Léger débounce pour éviter une écriture Firestore à chaque frappe /
    // déplacement de curseur (ex : réglage des couleurs).
    const minuteur = setTimeout(() => {
      // Sauvegarde des préférences
      sauvegarderPreferences(idUtilisateur, {
        reglages,
        musiqueAmbiance: musiqueAmbiance ? { ...musiqueAmbiance, enLecture: false } : null,
        couleurFondAppliquee,
        imageFond,
        bio,
      });
      // Sauvegarde des coins et temps (via sauvegarderProfil)
      // On en profite pour synchroniser le pseudo et l'email pour la recherche sociale !
      sauvegarderProfil(idUtilisateur, {
        coins: coins,
        temps_total_pomodoro: tempsTotalPomodoro,
        pseudo: utilisateur?.displayName || utilisateur?.email?.split('@')[0] || 'Utilisateur',
        email: utilisateur?.email
      });
    }, 300);

    return () => clearTimeout(minuteur);
  }, [reglages, musiqueAmbiance, couleurFondAppliquee, imageFond, bio, coins, tempsTotalPomodoro, connecte, utilisateur?.id]);

  const validerMusiqueAmbiance = (musique) => {
    setMusiqueAmbiance({
      enLecture: false,
      boucle: false,
      position: positionParDefautLecteur(),
      ...musique,
    });
    setLecteurMusiqueVisible(true);
  };

  const supprimerMusiqueAmbiance = () => {
    setMusiqueAmbiance(null);
    setLecteurMusiqueVisible(false);
  };

  // Fusionne des champs partiels dans l'objet musiqueAmbiance (utilisé par
  // le lecteur pour remonter position, état de lecture, boucle, métadonnées
  // réelles récupérées depuis l'API YouTube, etc.)
  const mettreAJourMusique = (champs) => {
    setMusiqueAmbiance((prev) => (prev ? { ...prev, ...champs } : prev));
  };

  // --- Préréglages : configurations complètes sauvegardées (fond, couleurs,
  // durées du minuteur, musique d'ambiance) ---
  // Chargés depuis / synchronisés vers Supabase (table « prereglages »)
  // pour un compte connecté. Mode invité : en mémoire uniquement.
  const [prereglages, setPrereglages] = useState([]);
  const prereglagesChargesPourRef = useRef(null);

  useEffect(() => {
    if (!connecte || !utilisateur?.id) {
      setPrereglages([]);
      prereglagesChargesPourRef.current = 'invite';
      return;
    }
    let annule = false;
    (async () => {
      const data = await chargerPrereglages(utilisateur.id);
      if (!annule) {
        setPrereglages(data);
        prereglagesChargesPourRef.current = utilisateur.id;
      }
    })();
    return () => { annule = true; };
  }, [connecte, utilisateur?.id]);

  useEffect(() => {
    if (!connecte || !utilisateur?.id) return;
    if (prereglagesChargesPourRef.current !== utilisateur.id) return;

    sauvegarderPrereglages(utilisateur.id, prereglages);
  }, [prereglages, connecte, utilisateur?.id]);

  // Modale de création / renommage : idPrereglageEnEdition à null = mode
  // création, sinon on édite le nom du préréglage correspondant
  const [modalPrereglageOuvert, setModalPrereglageOuvert] = useState(false);
  const [idPrereglageEnEdition, setIdPrereglageEnEdition] = useState(null);
  const [nomPrereglageInitial, setNomPrereglageInitial] = useState('');
  // Id du préréglage pour lequel une confirmation de suppression est demandée
  const [idPrereglageASupprimer, setIdPrereglageASupprimer] = useState(null);

  // Capture un instantané de la configuration actuelle (fond, réglages,
  // musique), utilisé aussi bien à la création qu'à la mise à jour d'un préréglage
  const capturerConfigurationActuelle = () => ({
    couleurFondAppliquee,
    imageFond,
    reglages,
    musiqueAmbiance: musiqueAmbiance ? { ...musiqueAmbiance, enLecture: false } : null,
  });

  const ouvrirCreationPrereglage = () => {
    setIdPrereglageEnEdition(null);
    setNomPrereglageInitial('');
    setModalPrereglageOuvert(true);
  };

  const ouvrirRenommagePrereglage = (id) => {
    const prereglage = prereglages.find((p) => p.id === id);
    if (!prereglage) return;
    setIdPrereglageEnEdition(id);
    setNomPrereglageInitial(prereglage.nom);
    setModalPrereglageOuvert(true);
  };

  const fermerModalPrereglage = () => setModalPrereglageOuvert(false);

  // Valide la modale : crée un nouveau préréglage, ou renomme celui en édition
  const validerModalPrereglage = (nom) => {
    if (idPrereglageEnEdition) {
      setPrereglages((prev) => prev.map((p) => (
        p.id === idPrereglageEnEdition ? { ...p, nom } : p
      )));
    } else {
      const nouveauPrereglage = {
        id: genererIdPrereglage(),
        nom,
        ...capturerConfigurationActuelle(),
      };
      setPrereglages((prev) => [...prev, nouveauPrereglage]);
    }
    setModalPrereglageOuvert(false);
  };

  // Applique instantanément l'ensemble des réglages d'un préréglage
  const appliquerPrereglage = (prereglage) => {
    setCouleurFondAppliquee(prereglage.couleurFondAppliquee || null);
    setImageFond(prereglage.imageFond || null);
    setReglages({ ...REGLAGES_PAR_DEFAUT, ...prereglage.reglages });

    if (prereglage.musiqueAmbiance) {
      setMusiqueAmbiance({ ...prereglage.musiqueAmbiance, enLecture: false });
      setLecteurMusiqueVisible(true);
    } else {
      setMusiqueAmbiance(null);
      setLecteurMusiqueVisible(false);
    }
  };

  const demanderSuppressionPrereglage = (id) => setIdPrereglageASupprimer(id);

  const confirmerSuppressionPrereglage = () => {
    setPrereglages((prev) => prev.filter((p) => p.id !== idPrereglageASupprimer));
    setIdPrereglageASupprimer(null);
  };

  const annulerSuppressionPrereglage = () => setIdPrereglageASupprimer(null);

  // Remplace un préréglage existant par la configuration actuelle de l'application,
  // sans changer son nom
  const remplacerPrereglage = (id) => {
    setPrereglages((prev) => prev.map((p) => (
      p.id === id ? { ...p, ...capturerConfigurationActuelle() } : p
    )));
  };

  // --- Mode concentration (plein écran + interface épurée) ---
  const [modeConcentration, setModeConcentration] = useState(false);
  const [confirmationSortieOuverte, setConfirmationSortieOuverte] = useState(false);
  const [toggleSortieActif, setToggleSortieActif] = useState(false);
  // Permet de distinguer, dans l'écouteur fullscreenchange, une sortie déjà
  // validée par la modale (on finalise simplement) d'une sortie provoquée par
  // autre chose (ex : touche F11 ou Echap), qui doit déclencher la même
  // confirmation avant d'être effective.
  const sortieConfirmeeRef = useRef(false);

  // Charge les notes du compte connecté depuis Supabase. En mode invité ou
  // après une déconnexion, la liste est immédiatement vidée : aucune note
  // de compte ne doit fuiter vers l'invité, ni inversement.
  useEffect(() => {
    if (!connecte || !utilisateur?.id) {
      setTaches([]);
      tachesChargeesPourRef.current = 'invite';
      return;
    }
    let annule = false;
    (async () => {
      const data = await chargerNotes(utilisateur.id);
      if (!annule) {
        setTaches(data);
        tachesChargeesPourRef.current = utilisateur.id;
      }
    })();
    return () => { annule = true; };
  }, [connecte, utilisateur?.id]);

  // Synchronise les notes vers Supabase pour un compte connecté (avec un
  // court débounce pour éviter une écriture à chaque frappe).
  useEffect(() => {
    if (!connecte || !utilisateur?.id) return; // mode invité : rien à synchroniser
    // Chargement initial pas encore terminé pour CET utilisateur (ex : juste
    // après une connexion) : on ne synchronise rien pour éviter d'écraser les
    // notes du compte avec un état encore issu du compte précédent.
    if (tachesChargeesPourRef.current !== utilisateur.id) return;

    const idUtilisateur = utilisateur.id;
    const minuteur = setTimeout(() => {
      sauvegarderNotes(idUtilisateur, taches);
    }, 300);

    return () => clearTimeout(minuteur);
  }, [taches, connecte, utilisateur?.id]);

  const ajouterTache = () => {
    const maintenant = new Date().toISOString();
    const nouvelle = {
      id: genererIdTache(),
      contenu: '',
      tags: [],
      dateEcheance: '',
      terminee: false,
      epinglee: false,
      position: null,
      dateCreation: maintenant,
      dateModification: maintenant,
    };
    setTaches((prev) => [nouvelle, ...prev]);
  };

  // Vide entièrement la liste des tâches/notes (utilisé au démarrage d'une
  // nouvelle session, qu'elle soit enregistrée ou supprimée au préalable).
  const viderTaches = () => {
    setTaches([]);
    setPointsPomodoro([]);
  };

  const remplacerTachesActives = (nouvellesTaches) => {
    setTaches(nouvellesTaches);
    setPointsPomodoro([]);
  };

  // Définit (ou remplace) le numéro d'ordre d'une tâche, utilisé par le
  // mode "organiser" pour numéroter et intervertir les notes.
  const definirOrdreTache = (id, ordre) => {
    setTaches((prev) => prev.map((t) => (t.id === id ? { ...t, ordre } : t)));
  };

  // Réinitialise le numéro d'ordre de toutes les tâches (retire les pastilles) :
  // utilisé par le bouton "Réinitialiser" du mode organiser.
  const reinitialiserOrdreTaches = () => {
    setTaches((prev) => prev.map((t) => {
      const { ordre, ...reste } = t;
      return reste;
    }));
  };

  const modifierTache = (id, champs) => {
    setTaches((prev) => prev.map((t) => (t.id === id ? { ...t, ...champs } : t)));
  };

  const supprimerTache = (id) => {
    setTaches((prev) => prev.filter((t) => t.id !== id));
    setIdADesepingler((actuel) => (actuel === id ? null : actuel));
  };

  const ajouterTagTache = (id, tag) => {
    setTaches((prev) => prev.map((t) => (
      t.id === id
        ? { ...t, tags: [...t.tags, tag], dateModification: new Date().toISOString() }
        : t
    )));
  };

  const supprimerTagTache = (id, index) => {
    setTaches((prev) => prev.map((t) => (
      t.id === id
        ? { ...t, tags: t.tags.filter((_, i) => i !== index), dateModification: new Date().toISOString() }
        : t
    )));
  };

  const actionsPourRecompense = (recompenseId) => ({
    onFermer: (id) => {
      setRecompenses(prev => prev.map(r => r.id === id ? { ...r, afficheeSurTableau: false } : r));
      if (connecte && utilisateur?.id) mettreAJourRecompense(utilisateur.id, id, { afficheeSurTableau: false });
    },
    onOuvrir: (id) => {
      const recompense = recompenses.find(r => r.id === id);
      if (recompense && recompense.etat === 'non_ouverte') {
        setRecompenses(prev => prev.map(r => r.id === id ? { ...r, etat: 'ouverte' } : r));
        if (recompense.type === 'coins') {
          setCoins(prev => prev + recompense.valeur);
        }
        if (connecte && utilisateur?.id) mettreAJourRecompense(utilisateur.id, id, { etat: 'ouverte' });
      }
    },
    onMettreAJourPosition: (pos) => {
      setRecompenses(prev => prev.map(r => r.id === recompenseId ? { ...r, position: pos } : r));
      if (connecte && utilisateur?.id) mettreAJourRecompense(utilisateur.id, recompenseId, { position: pos });
    }
  });

  // Épingle une tâche sur le fond principal, en cascade pour éviter
  // que toutes les notes n'apparaissent superposées au même endroit
  const epinglerTache = (id) => {
    setTaches((prev) => {
      const dejaEpinglees = prev.filter((t) => t.epinglee).length;
      return prev.map((t) => (
        t.id === id
          ? {
            ...t,
            epinglee: true,
            position: t.position || {
              x: 60 + (dejaEpinglees % 6) * 34,
              y: 130 + (dejaEpinglees % 6) * 34,
            },
          }
          : t
      ));
    });
  };

  // Mémorise la position d'une note épinglée après un glisser-déposer
  const deplacerTache = (id, position) => {
    setTaches((prev) => prev.map((t) => (t.id === id ? { ...t, position } : t)));
  };

  // Ouvre la confirmation de désépinglage plutôt que de désépingler directement
  const demanderDesepinglerTache = (id) => setIdADesepingler(id);

  const confirmerDesepingler = () => {
    modifierTache(idADesepingler, { epinglee: false });
    setIdADesepingler(null);
  };

  const annulerDesepingler = () => setIdADesepingler(null);

  // Fabrique le jeu d'actions (pré-liées à l'id) consommé par une carte,
  // la modale d'agrandissement, ou une note épinglée
  const actionsPourTache = (id) => ({
    modifierContenu: (contenu) => modifierTache(id, { contenu, dateModification: new Date().toISOString() }),
    modifierDate: (dateEcheance) => modifierTache(id, { dateEcheance, dateModification: new Date().toISOString() }),
    ajouterTag: (tag) => ajouterTagTache(id, tag),
    supprimerTag: (index) => supprimerTagTache(id, index),
    toggleTerminee: () => {
      setTaches((prev) => prev.map((t) => (t.id === id ? { ...t, terminee: !t.terminee } : t)));
    },
    supprimer: () => supprimerTache(id),
    epingler: () => epinglerTache(id),
    deplacer: (position) => deplacerTache(id, position),
    demanderDesepingler: () => demanderDesepinglerTache(id),
  });

  const notesEpinglees = taches.filter((t) => t.epinglee);

  // --- Ranger / Déployer les notes épinglées ---
  // Stocke les dernières positions connues des notes épinglées pour pouvoir
  // les redéployer au même endroit après un rangement.
  const dernieresPositionsRef = useRef({});

  const rangerNotes = () => {
    // Sauvegarder les positions actuelles avant de désépingler
    const positions = {};
    taches.forEach((t) => {
      if (t.epinglee && t.position) {
        positions[t.id] = { ...t.position };
      }
    });
    dernieresPositionsRef.current = { ...dernieresPositionsRef.current, ...positions };
    // Désépingler toutes les notes en un clic
    setTaches((prev) => prev.map((t) => t.epinglee ? { ...t, epinglee: false } : t));
  };

  const deployerNotes = () => {
    // Ré-épingler toutes les notes à leur dernière position connue
    setTaches((prev) => {
      let compteur = 0;
      return prev.map((t) => {
        const pos = dernieresPositionsRef.current[t.id];
        if (pos) {
          return { ...t, epinglee: true, position: pos };
        }
        return t;
      });
    });
  };

  const aDesNotesARanger = notesEpinglees.length > 0;
  const aDesNotesADeployer = !aDesNotesARanger && Object.keys(dernieresPositionsRef.current).length > 0;

  // --- Carte musique gauche ---
  const [carteMusiqueOuverte, setCarteMusiqueOuverte] = useState(false);

  // Rangement automatique des notes quand le menu latéral droit s'ouvre
  const panelOuvertPrecRef = useRef(panelOuvert);
  useEffect(() => {
    if (panelOuvert && !panelOuvertPrecRef.current && notesEpinglees.length > 0) {
      rangerNotes();
    }
    panelOuvertPrecRef.current = panelOuvert;
  }, [panelOuvert]);

  // Vérifie le format "rgb(r, g, b)" avec composantes entre 0 et 255, puis applique
  const appliquerCouleurFond = (valeur) => {
    const regexRgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;
    const correspondance = valeur.trim().match(regexRgb);

    if (!correspondance) {
      alert('Format invalide. Utilisez le format : rgb(255, 0, 0)');
      return;
    }

    const composantesValides = correspondance.slice(1, 4).every(
      (n) => Number(n) >= 0 && Number(n) <= 255
    );

    if (!composantesValides) {
      alert('Chaque composante RGB doit être comprise entre 0 et 255.');
      return;
    }

    setImageFond(null);
    setCouleurFondAppliquee(valeur.trim());
  };

  // Lit le fichier choisi (image ou GIF), le compresse pour éviter les erreurs réseau
  // dues à une payload trop lourde, et le convertit en data URL utilisable en CSS
  const appliquerImageFond = (fichier) => {
    if (!fichier) return;

    const lecteur = new FileReader();
    lecteur.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionnement à 1920px maximum
        const MAX_TAILLE = 1920;
        let largeur = img.width;
        let hauteur = img.height;

        if (largeur > hauteur && largeur > MAX_TAILLE) {
          hauteur *= MAX_TAILLE / largeur;
          largeur = MAX_TAILLE;
        } else if (hauteur > MAX_TAILLE) {
          largeur *= MAX_TAILLE / hauteur;
          hauteur = MAX_TAILLE;
        }

        const canvas = document.createElement('canvas');
        canvas.width = largeur;
        canvas.height = hauteur;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, largeur, hauteur);

        // Compression en JPEG qualité 0.8
        const dataUrlCompresser = canvas.toDataURL('image/jpeg', 0.8);
        setCouleurFondAppliquee(null);
        setImageFond(dataUrlCompresser);
      };
      img.src = e.target.result;
    };
    lecteur.readAsDataURL(fichier);
  };

  // Applique dynamiquement le fond choisi (couleur ou image) sur le <body>.
  // En l'absence de tout réglage personnalisé (aucune couleur ni image
  // choisie par l'utilisateur), le fond par défaut de l'application
  // (/basicbg.jpg, à placer dans /public) est utilisé.
  useEffect(() => {
    if (imageFond) {
      document.body.style.backgroundImage = `url(${imageFond})`;
      document.body.style.backgroundColor = '';
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
    } else if (couleurFondAppliquee) {
      document.body.style.backgroundImage = 'none';
      document.body.style.backgroundColor = couleurFondAppliquee;
    } else {
      // Aucun réglage personnalisé : on retombe sur le fond par défaut
      document.body.style.backgroundImage = 'url(/basicbg.jpg)';
      document.body.style.backgroundColor = '';
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
    }
  }, [couleurFondAppliquee, imageFond]);

  // (Les réglages Pomodoro sont synchronisés vers Supabase par l'effet de
  // préférences ci-dessus.)

  // Application en temps réel des couleurs choisies via des variables CSS globales.
  // Le fichier App.css les consomme via var(--couleur-chrono), var(--couleur-poignee),
  // var(--couleur-boutons), évitant tout prop-drilling jusqu'à Chrono / BlocDeux.
  useEffect(() => {
    const racine = document.documentElement;
    racine.style.setProperty('--couleur-chrono', reglages.couleurChrono);
    racine.style.setProperty('--couleur-poignee', reglages.couleurPoignee);
    racine.style.setProperty('--couleur-boutons', reglages.couleurBoutons);
  }, [reglages.couleurChrono, reglages.couleurPoignee, reglages.couleurBoutons]);

  // Met à jour une durée (dureeTravail ou dureePause) après validation basique
  const gererChangementDuree = (cle, valeur) => {
    const nombre = parseInt(valeur, 10);
    if (isNaN(nombre) || nombre < 1) return; // valeur invalide : on ignore le changement
    const nombreBorne = Math.min(nombre, 180); // plafonné à 180 minutes
    setReglages((prev) => ({ ...prev, [cle]: nombreBorne }));
  };

  // Met à jour une couleur (couleurChrono, couleurPoignee ou couleurBoutons)
  const gererChangementCouleur = (cle, valeur) => {
    setReglages((prev) => ({ ...prev, [cle]: valeur }));
  };

  // Réinitialise tous les réglages Pomodoro aux valeurs par défaut
  const reinitialiserReglages = () => {
    setReglages(REGLAGES_PAR_DEFAUT);
  };

  // --- Mode concentration --------------------------------------------
  // On s'appuie sur l'API Fullscreen native et sur l'évènement
  // "fullscreenchange" pour garder le bouton et l'état réel du plein écran
  // toujours synchronisés, que le déclencheur soit notre bouton ou la
  // touche F11 du navigateur.
  useEffect(() => {
    const gererChangementPleinEcran = () => {
      const enPleinEcran = !!document.fullscreenElement;

      if (enPleinEcran) {
        setModeConcentration(true);
        return;
      }

      if (sortieConfirmeeRef.current) {
        // Sortie déjà validée via la fenêtre de confirmation : on finalise proprement
        sortieConfirmeeRef.current = false;
        setModeConcentration(false);
        setConfirmationSortieOuverte(false);
        setToggleSortieActif(false);
      } else {
        // Sortie déclenchée autrement que par notre bouton (ex : touche F11) :
        // on applique la même logique de confirmation. On retente de rebasculer
        // en plein écran le temps que l'utilisateur confirme ; certains
        // navigateurs peuvent refuser cette nouvelle requête, auquel cas on
        // quitte simplement le mode concentration.
        setConfirmationSortieOuverte(true);
        document.documentElement.requestFullscreen?.().catch(() => {
          setModeConcentration(false);
          setConfirmationSortieOuverte(false);
          setToggleSortieActif(false);
        });
      }
    };

    document.addEventListener('fullscreenchange', gererChangementPleinEcran);
    return () => document.removeEventListener('fullscreenchange', gererChangementPleinEcran);
  }, []);

  const activerModeConcentration = () => {
    document.documentElement.requestFullscreen?.().catch(() => {
      // Le navigateur a refusé le passage en plein écran (ex: geste utilisateur
      // manquant) : on ignore silencieusement, le bouton reste inchangé.
    });
  };

  // Clic sur "Quitter le mode concentration" : on ouvre la confirmation
  // SANS sortir du plein écran immédiatement.
  const demanderQuitterModeConcentration = () => {
    setConfirmationSortieOuverte(true);
  };

  const basculerToggleSortie = () => {
    setToggleSortieActif((prev) => !prev);
  };

  const confirmerSortieModeConcentration = () => {
    if (!toggleSortieActif) return;
    sortieConfirmeeRef.current = true;
    document.exitFullscreen?.().catch(() => {
      sortieConfirmeeRef.current = false;
      setModeConcentration(false);
      setConfirmationSortieOuverte(false);
      setToggleSortieActif(false);
    });
  };

  const annulerSortieModeConcentration = () => {
    setConfirmationSortieOuverte(false);
    setToggleSortieActif(false);
  };

  // Clé stable identifiant la piste en cours, utilisée pour forcer un
  // remontage propre du LecteurVinyle à chaque changement de musique
  // (réinitialise proprement son état local : progression, glisser-déposer...)
  const cleLecteurMusique = musiqueAmbiance
    ? `${musiqueAmbiance.type}-${musiqueAmbiance.videoId || musiqueAmbiance.titre}`
    : null;

  return (
    <>
      {!modeConcentration && (
        <Navbar
          onAccueil={allerAccueil}
          onCourse={allerPomodoro}
          onConnexion={choisirConnexion}
          modeInvite={modeInvite && !connecte}
        />
      )}

      {pageActuelle === 'accueil' ? (
        <Accueil onCommencer={gererCommencer} />
      ) : (
        <>
          {!modeConcentration && (
            <PanneauJoueur
              pseudo={pseudoJoueur}
              niveau={1}
              distance={distanceTotale}
              position={0}
              ouvrirProfil={() => setProfilOuvert(true)}
              photoProfil={photoProfil}
              coins={coins}
            />
          )}

          <main className={`stage ${panelOuvert && !modeConcentration ? 'stage--panel-ouvert' : ''}`}>
            <Chrono
              enMarche={enMarche}
              setEnMarche={setEnMarche}
              onSessionTerminee={ajouterDistanceSession}
              dureeTravailMinutes={reglages.dureeTravail}
              dureePauseMinutes={reglages.dureePause}
              modeLecture={modeLectureSession}
              onPhaseChange={setChronoPhase}
            />
          </main>

          {!modeConcentration && (
            <BlocDeux
              ouvert={panelOuvert}
              setOuvert={setPanelOuvert}
              couleurFondInput={couleurFondInput}
              setCouleurFondInput={setCouleurFondInput}
              onAppliquerCouleur={appliquerCouleurFond}
              onChangerImage={appliquerImageFond}
              imageFondActuelle={imageFond}
              reglages={reglages}
              onChangerDuree={gererChangementDuree}
              onChangerCouleur={gererChangementCouleur}
              onReinitialiserReglages={reinitialiserReglages}
              taches={taches}
              ajouterTache={ajouterTache}
              actionsPourTache={actionsPourTache}
              definirOrdreTache={definirOrdreTache}
              reinitialiserOrdreTaches={reinitialiserOrdreTaches}
              viderTaches={viderTaches}
              remplacerTachesActives={remplacerTachesActives}
              pointsPomodoro={pointsPomodoro}
              modeLectureSession={modeLectureSession}
              setModeLectureSession={setModeLectureSession}
              musiqueActuelle={musiqueAmbiance}
              onOuvrirChoixMusique={() => setChoixMusiqueOuvert(true)}
              onSupprimerMusique={supprimerMusiqueAmbiance}
              prereglages={prereglages}
              onAppliquerPrereglage={appliquerPrereglage}
              onOuvrirRenommagePrereglage={ouvrirRenommagePrereglage}
              onDemanderSuppressionPrereglage={demanderSuppressionPrereglage}
              onRemplacerPrereglage={remplacerPrereglage}
              onOuvrirCreationPrereglage={ouvrirCreationPrereglage}
              recompenses={recompenses}
              onOuvrirRecompense={(id) => actionsPourRecompense(id).onOuvrir(id)}
              vueActive={vueActive}
              setVueActive={setVueActive}
              sessionConsulteeApp={sessionConsulteeApp}
              setSessionConsulteeApp={setSessionConsulteeApp}
              sessionsSauvegardees={sessionsProfilArchivees}
              setSessionsSauvegardees={setSessionsProfilArchivees}
              sessionsChargeesPourRef={sessionsChargeesPourRef}
              remplacerTachesActives={remplacerTachesActives}
              titreSession={titreSession}
              setTitreSession={setTitreSession}
              numeroSession={numeroSession}
            />
          )}

          <BarreDefilante actif={enMarche} phase={chronoPhase} />

          {/* Poignée musique gauche */}
          <div className={`poignee_musique${carteMusiqueOuverte ? ' poignee_musique--ouverte' : ''}`}>
            {musiqueAmbiance ? (
              <div style={{ position: 'relative' }}>
                <LecteurVinyle
                  key={cleLecteurMusique}
                  musique={musiqueAmbiance}
                  fermer={() => setCarteMusiqueOuverte(false)}
                  onMettreAJour={mettreAJourMusique}
                  modeTiroir={true}
                />
              </div>
            ) : null}

            <button
              type="button"
              className="poignee_musique_btn"
              onClick={() => setCarteMusiqueOuverte(!carteMusiqueOuverte)}
              aria-label={carteMusiqueOuverte ? 'Fermer le lecteur musique' : 'Ouvrir le lecteur musique'}
            >
              <Headphones size={20} />
            </button>
          </div>

          {/* Boutons d'action en bas : Ranger/Déployer + Mode concentration */}
          <div className="actions_bas_page">
            {aDesNotesARanger && (
              <button
                type="button"
                className="btn_ranger_notes"
                onClick={rangerNotes}
              >
                Ranger
              </button>
            )}
            {aDesNotesADeployer && (
              <button
                type="button"
                className="btn_deployer_notes"
                onClick={deployerNotes}
              >
                Déployer les notes
              </button>
            )}

            <button
              type="button"
              className="btn_mode_concentration"
              onClick={modeConcentration ? demanderQuitterModeConcentration : activerModeConcentration}
            >
              {modeConcentration ? 'Quitter le mode concentration' : 'Mode concentration'}
            </button>
          </div>

          <ModalProfil
            ouvert={profilOuvert}
            fermer={() => setProfilOuvert(false)}
            pseudo={pseudoJoueur}
            distanceTotale={distanceTotale}
            historiqueJoursPomodoro={historiqueJoursPomodoro}
            photoProfil={photoProfil}
            onEnregistrerPhotoProfil={enregistrerPhotoProfil}
            enregistrementPhotoEnCours={enregistrementPhotoEnCours}
            erreurPhotoProfil={erreurPhotoProfil}
            coins={coins}
            musiqueAmbiance={musiqueAmbiance}
            bio={bio}
            setBio={setBio}
            titreSession={titreSession}
            numeroSession={numeroSession}
            taches={taches}
            sessionsSauvegardees={sessionsProfilArchivees}
            onConsulterSession={(session) => {
              setSessionConsulteeApp(session);
              setModeLectureSession(true);
              setVueActive(1);
              setProfilOuvert(false);
              setPanelOuvert(true);
            }}
          />


          {/* Notes épinglées : widgets flottants affichés sur le fond principal */}
          {notesEpinglees.map((tache) => (
            <NoteEpinglee key={tache.id} tache={tache} actions={actionsPourTache(tache.id)} />
          ))}

          <ModalChoisirMusique
            ouvert={choixMusiqueOuvert}
            fermer={() => setChoixMusiqueOuvert(false)}
            onValider={validerMusiqueAmbiance}
          />

          <ModalConfirmation
            ouvert={idADesepingler !== null}
            message="Êtes-vous sûr de vouloir désépingler cette note ?"
            onConfirmer={confirmerDesepingler}
            onAnnuler={annulerDesepingler}
          />

          <ModalConfirmationSortie
            ouvert={confirmationSortieOuverte}
            toggleActif={toggleSortieActif}
            onToggle={basculerToggleSortie}
            onConfirmer={confirmerSortieModeConcentration}
            onAnnuler={annulerSortieModeConcentration}
          />

          {/* --- Préréglages : modale de création/renommage + confirmation de suppression --- */}
          <ModalPrereglage
            ouvert={modalPrereglageOuvert}
            modeRenommage={idPrereglageEnEdition !== null}
            nomInitial={nomPrereglageInitial}
            fermer={fermerModalPrereglage}
            onValider={validerModalPrereglage}
          />

          <ModalConfirmation
            ouvert={idPrereglageASupprimer !== null}
            message="Êtes-vous sûr de vouloir supprimer ce préréglage ?"
            onConfirmer={confirmerSuppressionPrereglage}
            onAnnuler={annulerSuppressionPrereglage}
          />
        </>
      )}

      <ModalChoixAcces
        ouvert={choixAccesOuvert}
        fermer={() => setChoixAccesOuvert(false)}
        onInscription={choisirInscription}
        onInvite={choisirInvite}
        onConnexion={choisirConnexion}
      />

      <ModalConfirmationAccueil
        ouvert={confirmationAccueilOuverte}
        fermer={() => setConfirmationAccueilOuverte(false)}
        onConfirmer={quitterModeInvite}
      />

      <ModalConnexion
        ouvert={connexionOuverte}
        fermer={() => setConnexionOuverte(false)}
        vueInitiale={vueConnexionInitiale}
      />
    </>
  )
}

export default App