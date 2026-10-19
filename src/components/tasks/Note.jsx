import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { chargerNotes, sauvegarderSessionArchivee, chargerPlanningJour, sauvegarderPlanningJour } from '../../lib/firebaseDataService';
import { formaterJourIso, genererIdTache } from '../../utils/helpers';
import Chrono from '../timer/Chrono';
import PomodoroTracker from '../timer/PomodoroTracker';
import TacheCarte from './TacheCarte';
import ModalTache from './ModalTache';
import DialogueNouvelleSession from './DialogueNouvelleSession';
import FenetreAnciennesSessions from '../profile/FenetreAnciennesSessions';
import { ID_EMPLACEMENT_TITRE_SESSION, ID_EMPLACEMENT_ACTIONS_SESSION } from '../timer/ChronoBarreProgression';

// Élément de la page (emplacement près du chrono) où afficher une commande
const useEmplacement = (id) => {
  const [element, setElement] = useState(null);
  useEffect(() => {
    setElement(document.getElementById(id));
  }, [id]);
  return element;
};

function Note({
  taches,
  ajouterTache,
  actionsPour,
  viderTaches,
  definirOrdreTache,
  reinitialiserOrdre,
  pointsPomodoro,
  modeLecture,
  setModeLecture,
  sessionConsultee,
  setSessionConsultee,
  sessionsSauvegardees,
  setSessionsSauvegardees,
  sessionsChargeesPourRef,
  remplacerTachesActives,
  titreSession,
  setTitreSession,
  numeroSession,
  modeCarnet,
  setModeCarnet,
  idSessionActive,
  onNouvelleSession
}) {
  const { connecte, utilisateur } = useAuth();

  // Titre de la session (sous le chrono) et boutons « nouvelle session » /
  // « enregistrer la session » (à gauche du chrono) : affichés près du chrono,
  // gérés ici
  const emplacementTitre = useEmplacement(ID_EMPLACEMENT_TITRE_SESSION);
  const emplacementActions = useEmplacement(ID_EMPLACEMENT_ACTIONS_SESSION);

  const [idAgrandie, setIdAgrandie] = useState(null);

  // Date de création de la session en cours, utilisée pour le compteur de
  // progression et affichée à côté du score (voir session_progression_ligne)
  const [dateCreationSession, setDateCreationSession] = useState(() => new Date().toISOString());

  // Boîte de dialogue "que faire de la session en cours ?"
  const [confirmationOuverte, setConfirmationOuverte] = useState(false);

  // Fenêtre "consulter les anciennes notes"
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [recherche, setRecherche] = useState('');

  // --- Toggle Daily : affiche/masque les notes du calendrier pour aujourd'hui ---
  const [filtreDaily, setFiltreDaily] = useState(true);
  const [notesProgrammes, setNotesProgrammes] = useState([]);

  useEffect(() => {
    if (!utilisateur?.id || !filtreDaily) return;
    
    let annule = false;
    const chargerNotes = async () => {
      try {
        const dateAujourdhui = formaterJourIso(new Date());
        const data = await chargerPlanningJour(utilisateur.id, dateAujourdhui);
        if (!annule && data && data.notes) {
          setNotesProgrammes(data.notes.map(n => ({ ...n, isProgramme: true })));
        }
      } catch (e) {
        console.error("Erreur chargement notes programmées", e);
      }
    };
    chargerNotes();
    
    return () => { annule = true; };
  }, [utilisateur?.id, filtreDaily]);

  const toggleDaily = () => {
    setFiltreDaily(!filtreDaily);
  };

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

  const tachesListeBase = sourceTaches
    .filter((t) => !t.epinglee)
    .slice()
    .sort((a, b) => (a.ordre ?? Infinity) - (b.ordre ?? Infinity));

  const tachesListe = (filtreDaily && !modeLecture)
    ? [...notesProgrammes, ...tachesListeBase]
    : tachesListeBase;

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

  // Clic sur une note pendant le mode organisation
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

  // Clique sur "+nouvelle session"
  const demarrerNouvelleSession = () => {
    setConfirmationOuverte(true);
  };

  // Archive la session en cours sous son identifiant stable (celui de son
  // cahier) : un nouvel enregistrement de la même session met à jour son entrée
  // dans l'historique au lieu d'en créer une autre. Renvoie la liste mise à jour.
  const archiverSessionEnCours = () => {
    const maintenant = new Date();
    const id = idSessionActive || `session_${Date.now()}`;
    const existante = sessionsSauvegardees.find((s) => s.id === id);
    const numero = existante?.numero ?? numeroSession;

    const sessionArchivee = {
      id,
      titre: titreSession.trim() || `Session ${numero}`,
      numero,
      date: maintenant.toLocaleDateString(),
      heure: maintenant.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateCreation: dateCreationSession,
      notes: taches,
    };

    const sessionsMisesAJour = existante
      ? sessionsSauvegardees.map((s) => (s.id === id ? sessionArchivee : s))
      : [...sessionsSauvegardees, sessionArchivee];
    setSessionsSauvegardees(sessionsMisesAJour);

    if (connecte && utilisateur?.id && sessionsChargeesPourRef.current === utilisateur.id) {
      sauvegarderSessionArchivee(utilisateur.id, sessionArchivee);
    }
    return sessionsMisesAJour;
  };

  // Enregistre la session actuelle puis repart sur une session vierge
  const enregistrerSessionEtRepartir = () => {
    repartirSurNouvelleSession(archiverSessionEnCours());
  };

  // Supprime la session actuelle sans l'enregistrer
  const supprimerSessionEtRepartir = () => {
    repartirSurNouvelleSession(sessionsSauvegardees);
  };

  // Vide l'éditeur et réinitialise : nouvelle session, donc nouveau cahier vide
  // (celui de la session précédente reste dans l'historique des notes)
  const repartirSurNouvelleSession = (sessionsActuelles) => {
    if (typeof viderTaches === 'function') {
      viderTaches();
    } else if (typeof ajouterTache === 'function') {
      ajouterTache();
    }
    onNouvelleSession?.();
    setTitreSession('');
    setDateCreationSession(new Date().toISOString());
    setConfirmationOuverte(false);
    setModeLecture(false);
    setSessionConsultee(null);
  };

  // Consulter les sessions
  const consulterSession = (session) => {
    setSessionConsultee(session);
    setModeLecture(true);
    setRechercheOuverte(false);
  };

  // Enregistre la session actuelle sans créer une nouvelle session
  const enregistrerSession = () => {
    archiverSessionEnCours();
  };

  // Filtre les sessions sauvegardées selon la barre de recherche
  const sessionsFiltrees = sessionsSauvegardees.filter((s) => {
    const cible = recherche.trim().toLowerCase();
    if (!cible) return true;
    return (
      s.titre.toLowerCase().includes(cible) ||
      s.numero.toLowerCase().includes(cible)
    );
  });

  // Mode lecture : nombre de tâches non terminées
  const tachesNonTerminees = modeLecture && sessionConsultee
    ? (sessionConsultee.notes || []).filter((n) => !n.terminee).length
    : 0;

  // Quitte le mode lecture pour revenir à la session en cours
  const continuerSession = () => {
    setModeLecture(false);
    setSessionConsultee(null);
  };

  // Déplace les tâches non terminées vers une nouvelle session
  const deplacerTachesNonTerminees = () => {
    if (!sessionConsultee) return;
    const nonTerminees = (sessionConsultee.notes || []).filter((n) => !n.terminee);
    const terminees = (sessionConsultee.notes || []).filter((n) => n.terminee);

    if (nonTerminees.length === 0) return;

    // La session en cours est archivée (avec son cahier) avant de laisser place à la suite
    const sessionsActuelles = taches.length > 0 ? archiverSessionEnCours() : sessionsSauvegardees;

    const ancienneSessionMiseAJour = {
      ...sessionConsultee,
      notes: terminees
    };

    const sessionsMisesAJour = sessionsActuelles.map((s) =>
      s.id === ancienneSessionMiseAJour.id ? ancienneSessionMiseAJour : s
    );
    setSessionsSauvegardees(sessionsMisesAJour);

    if (connecte && utilisateur?.id && sessionsChargeesPourRef.current === utilisateur.id) {
      sauvegarderSessionArchivee(utilisateur.id, ancienneSessionMiseAJour);
    }

    const nouvellesTaches = nonTerminees.map((n) => ({ ...n, id: genererIdTache() }));
    if (typeof remplacerTachesActives === 'function') {
      remplacerTachesActives(nouvellesTaches);
    }

    // « Suite de … » : une nouvelle session, avec son propre cahier
    onNouvelleSession?.();
    setTitreSession(`Suite de ${sessionConsultee.titre || 'Session'}`);
    setDateCreationSession(new Date().toISOString());

    setModeLecture(false);
    setSessionConsultee(null);
  };

  // Fondu bas de liste : affiché tant qu'il reste des cartes sous la zone visible
  const listeDefilementRef = useRef(null);
  const [listeASuite, setListeASuite] = useState(false);

  const mesurerSuiteListe = () => {
    const el = listeDefilementRef.current;
    if (!el) return;
    setListeASuite(el.scrollHeight - el.scrollTop - el.clientHeight > 2);
  };

  useEffect(() => {
    const el = listeDefilementRef.current;
    if (!el) return undefined;
    const observateur = new ResizeObserver(mesurerSuiteListe);
    observateur.observe(el);
    Array.from(el.children).forEach((enfant) => observateur.observe(enfant));
    mesurerSuiteListe();
    return () => observateur.disconnect();
  }, [tachesListe.length]);

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
      {/* Zone de commandes compacte, toujours visible au-dessus de la liste */}
      <div className="todo_entete">
        <div className="notes_commandes">
          {modeLecture ? (
            <div className="session_lecture_zone">
              <span className="session_lecture_texte">Mode lecture</span>

              <div className="notes_commandes_grille">
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
          ) : emplacementActions && createPortal(
            <div className="chrono_actions_session">
              <button
                type="button"
                className="chrono_action_session chrono_action_session--principal"
                onClick={demarrerNouvelleSession}
                aria-label="Démarrer une nouvelle session"
                data-infobulle="Démarrer une nouvelle session"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>

              <button
                type="button"
                className="chrono_action_session"
                onClick={enregistrerSession}
                aria-label="Enregistrer la session"
                data-infobulle="Enregistrer la session"
              >
                <Check size={18} strokeWidth={2.5} />
              </button>
            </div>,
            emplacementActions
          )}

          <div className="session_liste_actions">
            <button
              type="button"
              className={`session_action_btn${modeOrganisationActif ? ' session_action_btn--actif' : ''}`}
              onClick={basculerModeOrganisation}
            >
              Organiser
            </button>

            <button
              type="button"
              className={`session_action_btn${modeCarnet ? ' session_action_btn--actif' : ''}`}
              onClick={() => setModeCarnet && setModeCarnet((prev) => !prev)}
              title="Afficher les notes sous forme de carnet empilé dans l'espace de travail"
            >
              Carnet
            </button>

            {!modeLecture && (
              <div
                className="switch_ligne"
                onClick={toggleDaily}
                role="switch"
                aria-checked={filtreDaily}
                style={{ gap: '8px', cursor: 'pointer' }}
              >
                <span className="switch_label" style={{ fontSize: '0.85rem', fontWeight: 700, color: filtreDaily ? 'var(--dc-blurple, #5865f2)' : 'var(--dc-text-muted, #80848e)' }}>
                  Daily
                </span>
                <span className={`switch ${filtreDaily ? 'switch--actif' : ''}`} style={{ backgroundColor: filtreDaily ? 'var(--dc-blurple, #5865f2)' : undefined }}>
                  <span className="switch_bouton"></span>
                </span>
              </div>
            )}
          </div>

          {modeOrganisationActif && (
            <div className="notes_commandes_organiser">
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
            </div>
          )}

          <button
            type="button"
            className="note_btn_ajouter"
            onClick={ajouterTache}
            disabled={modeLecture}
          >
            <span>+Ajouter une note</span>
          </button>
        </div>

        <div className="notes_commandes">
          {emplacementTitre && createPortal(
            <input
              type="text"
              className="chrono_titre_session"
              placeholder="Titre de la session"
              aria-label="Titre de la session"
              value={titreSession}
              onChange={(e) => setTitreSession(e.target.value)}
            />,
            emplacementTitre
          )}

          <div className="notes_commandes_infos">
            <span className="session_progression_score">
              <strong>{tachesTerminees}</strong> / {tachesTotal} tâches accomplies
            </span>
            <PomodoroTracker points={pointsPomodoro || []} />
          </div>
        </div>
      </div>

      {/* Liste défilante : seule cette zone scrolle, le fondu signale la suite */}
      <div className={`todo_liste_zone${listeASuite ? ' todo_liste_zone--suite' : ''}`}>
        <div className="todo_liste_defilement" ref={listeDefilementRef} onScroll={mesurerSuiteListe}>
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
                    actions={
                      tache.isProgramme ? {
                        toggleTerminee: () => {
                          const nouvellesNotes = notesProgrammes.map(n => n.id === tache.id ? { ...n, terminee: !n.terminee } : n);
                          setNotesProgrammes(nouvellesNotes);
                          if (utilisateur?.id) {
                            sauvegarderPlanningJour(utilisateur.id, formaterJourIso(new Date()), {
                              notes: nouvellesNotes.map(({ isProgramme, ...reste }) => reste)
                            });
                          }
                        },
                        modifierContenu: (nouveauContenu) => {
                          const nouvellesNotes = notesProgrammes.map(n => n.id === tache.id ? { ...n, contenu: nouveauContenu } : n);
                          setNotesProgrammes(nouvellesNotes);
                          if (utilisateur?.id) {
                            sauvegarderPlanningJour(utilisateur.id, formaterJourIso(new Date()), {
                              notes: nouvellesNotes.map(({ isProgramme, ...reste }) => reste)
                            });
                          }
                        },
                        supprimer: () => {
                          const nouvellesNotes = notesProgrammes.filter(n => n.id !== tache.id);
                          setNotesProgrammes(nouvellesNotes);
                          if (utilisateur?.id) {
                            sauvegarderPlanningJour(utilisateur.id, formaterJourIso(new Date()), {
                              notes: nouvellesNotes.map(({ isProgramme, ...reste }) => reste)
                            });
                          }
                        },
                        epingler: () => { }
                      } : actionsPour(tache.id)
                    }
                    onAgrandir={() => setIdAgrandie(tache.id)}
                    lectureSeule={modeLecture}
                    estProgramme={tache.isProgramme}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="todo_liste_fondu" aria-hidden="true" />
      </div>

      {tacheAgrandie && createPortal(
        <ModalTache
          tache={tacheAgrandie}
          actions={actionsPour(tacheAgrandie.id)}
          fermer={() => setIdAgrandie(null)}
          lectureSeule={modeLecture}
        />,
        document.body
      )}

      {confirmationOuverte && createPortal(
        <DialogueNouvelleSession
          onEnregistrer={enregistrerSessionEtRepartir}
          onSupprimer={supprimerSessionEtRepartir}
          onAnnuler={() => setConfirmationOuverte(false)}
        />,
        document.body
      )}

      {rechercheOuverte && createPortal(
        <FenetreAnciennesSessions
          sessions={sessionsFiltrees}
          recherche={recherche}
          onChangerRecherche={setRecherche}
          fermer={() => setRechercheOuverte(false)}
          onConsulter={consulterSession}
        />,
        document.body
      )}
    </div>
  );
}

export default Note;
