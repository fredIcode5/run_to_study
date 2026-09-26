import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Play, Pause, SquarePen, Gift, Headphones, Pin, Clock9, Eye, Timer, Users } from 'lucide-react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import frLocale from '@fullcalendar/core/locales/fr'
import './App.css'
import InfiniteLoopAnimation from './infinitloop'
import Navbar from './components/layout/Navbar';
import BlocDeux from './components/layout/BlocDeux';
import ModalConfirmation from './components/ui/ModalConfirmation';
import ModalConfirmationSortie from './components/ui/ModalConfirmationSortie';
import ModalChoisirMusique from './components/ui/ModalChoisirMusique';
import LecteurProfilMusique from './components/ui/LecteurProfilMusique';
import ModalConnexion from './components/auth/ModalConnexion';
import ModalConfirmationAccueil from './components/auth/ModalConfirmationAccueil';
import ModalChoixAcces from './components/auth/ModalChoixAcces';
import Chrono from './components/timer/Chrono';
import Note from './components/tasks/Note';
import NoteEpinglee from './components/tasks/NoteEpinglee';
import Carnet from './components/tasks/Carnet';
import ModalProfil from './components/profile/ModalProfil';
import OngletParametres from './components/profile/OngletParametres';
import PanneauJoueur from './components/social/PanneauJoueur';
import Param from './components/settings/Param';
import ModalPrereglage from './components/settings/ModalPrereglage';
import Accueil from './components/pages/Accueil';
import EcranChargement from './components/ui/EcranChargement';
import { useAuth } from './context/AuthContext.jsx';
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
  chargerActivitesPomodoro,
  enregistrerActivitePomodoro,
  chargerLeaderboardGlobal,
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
  creerSession,
  rejoindreSession,
  quitterSession,
  ecouterSessions
} from './lib/firebaseDataService';
import {
  PHOTO_PROFIL_VIDE,
  positionParDefautLecteur,
  formaterJourIso,
  formaterDateNote,
  genererIdTache,
  genererNumeroSession,
  extraireIdYoutube,
  formaterTempsPiste,
  genererIdPrereglage
} from './utils/helpers';

// --- Réglages Pomodoro par défaut, utilisés au premier lancement
// et comme valeurs de repli en cas de données invalides ---
const REGLAGES_PAR_DEFAUT = {
  dureeTravail: 25,        // minutes
  dureePause: 5,           // minutes
  couleurChrono: '#F2F3F5',
  couleurPoignee: '#5865F2',
  couleurBoutons: '#5865F2',
};



















// --- To-Do List (section "Notes") -------------------------------------
// Chaque tâche : { id, contenu, tags: string[], dateEcheance, terminee }




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




// ======================================================================
// --- Musique d'ambiance -------------------------------------------------
// ======================================================================

// Extrait l'identifiant de vidéo d'un lien YouTube (formats standards,
// courts youtu.be, ou embed) afin de pouvoir instancier le lecteur IFrame



// Formate un nombre de secondes en "m:ss" pour l'affichage du lecteur




// ======================================================================
// --- Préréglages ---------------------------------------------------------
// ======================================================================
// Un préréglage capture l'intégralité de la configuration visuelle et
// sonore de l'application (fond, couleurs/durées du minuteur, musique
// d'ambiance) afin de pouvoir la restaurer en un clic.










const ONGLETS_POIGNEE = [
  { id: 1, icone: <SquarePen size={18} />, label: 'Notes', notif: true },
  { id: 4, icone: <Gift size={18} />, label: 'Récompenses', notif: true },
  { id: 2, icone: <Timer size={18} />, label: 'Mon Pomodoro', notif: true },
  { id: 3, icone: <Users size={18} />, label: 'Salon de course', notif: true },
];



const PREREGLAGES_PAR_DEFAUT = [
  {
    id: 'defaut_focus',
    nom: 'Focus 25/5',
    couleurFondAppliquee: '#313338',
    reglages: {
      dureeTravail: 25,
      dureePause: 5,
      couleurChrono: '#F2F3F5',
      couleurPoignee: '#5865F2',
      couleurBoutons: '#5865F2',
    },
  },
  {
    id: 'defaut_intense',
    nom: 'Session 50/10',
    couleurFondAppliquee: '#2B2D31',
    reglages: {
      dureeTravail: 50,
      dureePause: 10,
      couleurChrono: '#F2F3F5',
      couleurPoignee: '#23A559',
      couleurBoutons: '#23A559',
    },
  },
  {
    id: 'defaut_sprint',
    nom: 'Sprint 15/3',
    couleurFondAppliquee: '#1E1F22',
    reglages: {
      dureeTravail: 15,
      dureePause: 3,
      couleurChrono: '#F2F3F5',
      couleurPoignee: '#F0B232',
      couleurBoutons: '#F0B232',
    },
  },
];

function App() {
  const [panelOuvert, setPanelOuvert] = useState(true);
  const [enMarche, setEnMarche] = useState(false);
  const [chronoPhase, setChronoPhase] = useState('travail');
  const [chronoResetKey, setChronoResetKey] = useState(0);

  const [styleChrono, setStyleChrono] = useState(() => {
    const saved = localStorage.getItem('styleChrono');
    if (saved && ['classique', 'loop', 'barre'].includes(saved)) return saved;
    return 'loop';
  });

  useEffect(() => {
    const handleVisibilityChange = () => {
      const savedStyle = localStorage.getItem('styleChrono');
      if (savedStyle && ['classique', 'loop', 'barre'].includes(savedStyle)) {
        setStyleChrono(savedStyle);
      }
    };
    window.addEventListener('runnerVisibilityChanged', handleVisibilityChange);
    return () => window.removeEventListener('runnerVisibilityChanged', handleVisibilityChange);
  }, []);

  const getProchainStyleChrono = (styleActuel) => {
    if (styleActuel === 'classique') return 'loop';
    if (styleActuel === 'loop') return 'barre';
    return 'classique';
  };

  const basculerStyleChrono = (nouveauStyle) => {
    const style = nouveauStyle || getProchainStyleChrono(styleChrono);
    setStyleChrono(style);
    localStorage.setItem('styleChrono', style);
    localStorage.setItem('hideRunner', style === 'loop' ? 'true' : 'false');
    window.dispatchEvent(new Event('runnerVisibilityChanged'));
  };
  
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
  const [ecranChargementActif, setEcranChargementActif] = useState(false);
  const [modeCarnet, setModeCarnet] = useState(false);

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

  // Activités et logs de concentration Pomodoro (synchronisés Firestore + localStorage)
  const [activitesPomodoro, setActivitesPomodoro] = useState(() => {
    try {
      const sauves = localStorage.getItem('activites_pomodoro');
      return sauves ? JSON.parse(sauves) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!connecte || !utilisateur?.id) return;
    let annule = false;
    (async () => {
      const data = await chargerActivitesPomodoro(utilisateur.id);
      if (!annule && data && data.length > 0) {
        setActivitesPomodoro(data);
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

    if (connecte && !etaitConnecte) {
      setModeInvite(false);
      setChoixAccesOuvert(false);
      setPageActuelle('pomodoro');
      setEcranChargementActif(true);
    } else if (!connecte && etaitConnecte) {
      setModeInvite(false);
      setPageActuelle('accueil');
      setEcranChargementActif(false);
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
      setEcranChargementActif(true);
      setPageActuelle('pomodoro');
    } else {
      demanderAcces();
    }
  };

  const allerPomodoro = () => {
    if (connecte) {
      if (pageActuelle !== 'pomodoro') {
        setEcranChargementActif(true);
      }
      setPageActuelle('pomodoro');
    } else {
      demanderAcces();
    }
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
  const [ongletProfilActif, setOngletProfilActif] = useState('profil');

  const ouvrirProfilAvecOnglet = (onglet = 'profil') => {
    setOngletProfilActif(onglet);
    setProfilOuvert(true);
  };
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

    // Enregistre l'activité détaillée de cette séance de travail pour les statistiques
    const dateNow = new Date(maintenant);
    const nouvelleActivite = {
      id: `act_${maintenant}_${Math.floor(Math.random() * 1000)}`,
      date: formaterJourIso(dateNow),
      heure: dateNow.getHours(),
      dureeMinutes: minutesTravaillees,
      tours: 1,
      coinsGagnes: gainAleatoire,
      theme: titreSession?.trim() || 'Général',
      musiqueTitre: musiqueAmbiance?.titre || null,
      musiqueArtiste: musiqueAmbiance?.artiste || null,
      imageFondNom: imageFond ? 'Personnalisé' : 'Focus Track',
      timestamp: maintenant
    };

    setActivitesPomodoro((prev) => {
      const misAJour = [nouvelleActivite, ...prev];
      try {
        localStorage.setItem('activites_pomodoro', JSON.stringify(misAJour.slice(0, 500)));
      } catch (e) {
        console.error(e);
      }
      return misAJour;
    });

    if (connecte && utilisateur?.id) {
      enregistrerActivitePomodoro(utilisateur.id, nouvelleActivite);
    }
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
  const [prereglages, setPrereglages] = useState(PREREGLAGES_PAR_DEFAUT);
  const [sessionEnLigne, setSessionEnLigne] = useState(null);
  const prereglagesChargesPourRef = useRef(null);

  const prereglagesAffiches = sessionEnLigne ? [
    {
      id: 'session_en_ligne',
      nom: 'session en ligne',
      imageFond: sessionEnLigne.imageFond || null,
      couleurFondAppliquee: '#10b981',
      reglages: {
        dureeTravail: sessionEnLigne.tempsTravail || 25,
        dureePause: sessionEnLigne.tempsPause || 5,
      },
      isSessionEnLigne: true,
    },
    ...prereglages,
  ] : prereglages;

  useEffect(() => {
    if (!connecte || !utilisateur?.id) {
      setPrereglages(PREREGLAGES_PAR_DEFAUT);
      prereglagesChargesPourRef.current = 'invite';
      return;
    }
    let annule = false;
    (async () => {
      const data = await chargerPrereglages(utilisateur.id);
      if (!annule) {
        setPrereglages(data && data.length > 0 ? data : PREREGLAGES_PAR_DEFAUT);
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
  const [configPrereglageEnCreation, setConfigPrereglageEnCreation] = useState(null);
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

  const ouvrirCreationPrereglage = (configPersonnalisee = null) => {
    setIdPrereglageEnEdition(null);
    setNomPrereglageInitial('');
    setConfigPrereglageEnCreation(configPersonnalisee || null);
    setModalPrereglageOuvert(true);
  };

  const ouvrirRenommagePrereglage = (id) => {
    const prereglage = prereglages.find((p) => p.id === id);
    if (!prereglage) return;
    setIdPrereglageEnEdition(id);
    setNomPrereglageInitial(prereglage.nom);
    setConfigPrereglageEnCreation(null);
    setModalPrereglageOuvert(true);
  };

  const fermerModalPrereglage = () => {
    setConfigPrereglageEnCreation(null);
    setModalPrereglageOuvert(false);
  };

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
        ...(configPrereglageEnCreation || capturerConfigurationActuelle()),
      };
      setPrereglages((prev) => [nouveauPrereglage, ...prev]);
    }
    setConfigPrereglageEnCreation(null);
    setModalPrereglageOuvert(false);
  };

  // Applique instantanément l'ensemble des réglages d'un préréglage
  const appliquerPrereglage = (prereglage) => {
    if (prereglage.isSessionEnLigne) {
      setReglages((prev) => ({
        ...prev,
        dureeTravail: prereglage.reglages.dureeTravail,
        dureePause: prereglage.reglages.dureePause,
      }));
      return;
    }

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

  // Met à jour directement un préréglage avec des données personnalisées
  const mettreAJourPrereglage = (id, nouvellesDonnees) => {
    setPrereglages((prev) => prev.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          ...nouvellesDonnees,
          reglages: {
            ...(p.reglages || {}),
            ...(nouvellesDonnees.reglages || {}),
          },
        };
      }
      return p;
    }));
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
    // Si l'option carnet est active, elle est désactivée si l'utilisateur épingle une note
    setModeCarnet(false);
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
          autoMasquage={pageActuelle !== 'accueil'}
          positionBas={pageActuelle !== 'accueil' && styleChrono === 'barre'}
        />
      )}

      {pageActuelle === 'accueil' ? (
        <Accueil onCommencer={gererCommencer} />
      ) : (
        <>
          {!modeConcentration && (
            <div className="barre_joueur_musique_flottante">
              <PanneauJoueur
                pseudo={pseudoJoueur}
                niveau={1}
                distance={distanceTotale}
                position={0}
                ouvrirProfil={() => ouvrirProfilAvecOnglet('profil')}
                onOuvrirOnglet={ouvrirProfilAvecOnglet}
                photoProfil={photoProfil}
                coins={coins}
              />
              <LecteurProfilMusique
                key={cleLecteurMusique}
                musique={musiqueAmbiance}
                onMettreAJour={mettreAJourMusique}
                onOuvrirChoixMusique={() => setChoixMusiqueOuvert(true)}
              />
            </div>
          )}

          <main className={`stage ${panelOuvert && !modeConcentration ? 'stage--panel-ouvert' : ''}`} style={{ position: 'relative' }}>
            <Chrono
              enMarche={enMarche}
              setEnMarche={setEnMarche}
              onSessionTerminee={ajouterDistanceSession}
              dureeTravailMinutes={reglages.dureeTravail}
              dureePauseMinutes={reglages.dureePause}
              modeLecture={modeLectureSession}
              onPhaseChange={setChronoPhase}
              onReset={() => setChronoResetKey(k => k + 1)}
              styleChrono={styleChrono}
              onToggleStyle={basculerStyleChrono}
              photoProfil={photoProfil}
              renderLoop={(secondesRestantes) => (
                <div style={{ marginTop: '110px', pointerEvents: 'none', display: 'flex', justifyContent: 'center' }}>
                  <InfiniteLoopAnimation 
                    enMarche={enMarche} 
                    photoProfil={photoProfil} 
                    dureeTotale={chronoPhase === 'travail' ? reglages.dureeTravail * 60 : reglages.dureePause * 60}
                    phase={chronoPhase}
                    resetKey={chronoResetKey}
                    secondesRestantes={secondesRestantes}
                  />
                </div>
              )}
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
              onMettreAJourMusique={mettreAJourMusique}
              onChangerMusique={validerMusiqueAmbiance}
              onOuvrirBoutique={() => ouvrirProfilAvecOnglet('boutique')}
              onSessionEnLigneChange={setSessionEnLigne}
              sessionEnLigne={sessionEnLigne}
              prereglages={prereglagesAffiches}
              onAppliquerPrereglage={appliquerPrereglage}
              onOuvrirRenommagePrereglage={ouvrirRenommagePrereglage}
              onDemanderSuppressionPrereglage={demanderSuppressionPrereglage}
              onRemplacerPrereglage={remplacerPrereglage}
              onMettreAJourPrereglage={mettreAJourPrereglage}
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
              titreSession={titreSession}
              setTitreSession={setTitreSession}
              numeroSession={numeroSession}
              modeCarnet={modeCarnet}
              setModeCarnet={setModeCarnet}
            />
          )}



























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
              title={modeConcentration ? 'Quitter le mode concentration' : 'Mode concentration'}
              aria-label={modeConcentration ? 'Quitter le mode concentration' : 'Mode concentration'}
              onClick={modeConcentration ? demanderQuitterModeConcentration : activerModeConcentration}
            >
              <Eye size={20} />
            </button>
          </div>

          <ModalProfil
            ouvert={profilOuvert}
            fermer={() => setProfilOuvert(false)}
            ongletInitial={ongletProfilActif}
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
            pointsPomodoro={pointsPomodoro}
            activitesPomodoro={activitesPomodoro}
            imageFond={imageFond}
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

          {/* Carnet de notes : widget empilé dans l'espace de travail */}
          <Carnet
            ouvert={modeCarnet}
            fermer={() => setModeCarnet(false)}
            taches={taches}
            actionsPourTache={actionsPourTache}
          />

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

      {ecranChargementActif && (
        <EcranChargement
          pseudo={pseudoJoueur}
          onTermine={() => setEcranChargementActif(false)}
        />
      )}
    </>
  )
}

export default App