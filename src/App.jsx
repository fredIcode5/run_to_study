import { useState, useEffect, useRef } from 'react'
import './App.css'


// --- Réglages Pomodoro par défaut, utilisés au premier lancement
// et comme valeurs de repli en cas de données invalides dans le localStorage ---
const REGLAGES_PAR_DEFAUT = {
  dureeTravail: 25,        // minutes
  dureePause: 5,           // minutes
  couleurChrono: '#1f2430',
  couleurPoignee: '#e2472a',
  couleurBoutons: '#e2472a',
};

const CLE_STOCKAGE_REGLAGES = 'pomodoro_reglages';
const CLE_STOCKAGE_TACHES = 'pomodoro_taches';

// Formate une date ISO en "jj/mm/aaaa hh:mm" (locale FR), utilisée dans
// l'en-tête des notes épinglées pour afficher la création/dernière modification
function formaterDateNote (dateIso) {
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


function Navbar(){
  return(
    <>
    <div className="navbar">
    <button>home</button>
    <button>page</button>
    <button>stats</button>
    <button>compte</button>
    </div>
    </>
  );
}


function PanneauJoueur ({ pseudo, niveau, distance, position, ouvrirProfil }) {
  return(
    <div className="joueur_info">
      <button
        className="joueur_photo"
        onClick={ouvrirProfil}
        aria-label="Ouvrir le profil"
      >
        <span className="joueur_photo_icone">👤</span>
      </button>

      <div className="joueur_details">
        <div className="joueur_identite">
          <span className="joueur_pseudo">{pseudo}</span>
          <span className="joueur_niveau">Niv. {niveau}</span>
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


function ModalProfil ({ ouvert, fermer, distanceTotale }) {
  if (!ouvert) return null;

  return(
    <div className="modal_fond" onClick={fermer}>
      <div className="modal_fenetre" onClick={(e) => e.stopPropagation()}>
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>
        <div className="modal_contenu">
          <p>Voici votre profil</p>
          <p className="modal_distance_totale">
            Distance totale parcourue : <strong>{distanceTotale} m</strong>
          </p>
        </div>
      </div>
    </div>
  );
}


// --- Chrono : gère le cycle "travail" / "pause" dont les durées sont
// pilotées par les réglages (props dureeTravailMinutes / dureePauseMinutes).
// Les couleurs (chrono, boutons) sont appliquées globalement via des
// variables CSS (voir App > useEffect couleurs), pas via des props ici.
function Chrono ({ enMarche, setEnMarche, onSessionTerminee, dureeTravailMinutes, dureePauseMinutes }) {
  // 'travail' = session Pomodoro classique, 'pause' = pause qui suit
  const [phase, setPhase] = useState('travail');

  const dureeTravail = dureeTravailMinutes * 60;
  const dureePause = dureePauseMinutes * 60;
  const dureeActuelle = phase === 'travail' ? dureeTravail : dureePause;

  const [secondesRestantes, setSecondesRestantes] = useState(dureeActuelle);
  const intervalRef = useRef(null);

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
    if (enMarche) pause();
    else start();
  };

  const libelleBouton = enMarche
    ? 'Pause'
    : secondesRestantes === dureeActuelle
      ? (phase === 'travail' ? 'Démarrer' : 'Démarrer la pause')
      : secondesRestantes === 0
        ? 'Terminé'
        : 'Reprendre';

  // Distance simulée de la session en cours : 5 secondes écoulées = 1 mètre
  const secondesEcoulees = dureeActuelle - secondesRestantes;
  const distanceSession = Math.floor(secondesEcoulees / 5);

  return(
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
        <button className="btn_secondaire" onClick={reset}>Recommencer</button>
      </div>

      <div className="chrono_distance">
        <span className="chrono_distance_valeur">{distanceSession} m</span>
        <span className="chrono_distance_label">Distance parcourue</span>
      </div>
    </div>
  );
}


// --- To-Do List (section "Notes") -------------------------------------
// Chaque tâche : { id, contenu, tags: string[], dateEcheance, terminee }

function genererIdTache () {
  return `tache_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

// Petit chip visuel représentant un tag, avec bouton de suppression
function TacheTag ({ texte, onSupprimer }) {
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
function TacheBarre ({ tags, onAjouterTag, onSupprimerTag, dateEcheance, onModifierDate }) {
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
function TacheZoneTexte ({ className, valeur, onChange, placeholder, autoFocus }) {
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
function TacheCarte ({ tache, actions, onAgrandir }) {
  const zoneTexteRef = useRef(null);

  // Clique n'importe où dans la carte (hors boutons/inputs déjà gérés) -> focus l'édition
  const focaliserEdition = () => {
    zoneTexteRef.current?.focus();
  };

  return (
    <div
      className={`todo_carte ${tache.terminee ? 'todo_carte--terminee' : ''}`}
      onClick={focaliserEdition}
    >
      <button
        type="button"
        className="todo_carte_suppr"
        onClick={(e) => { e.stopPropagation(); actions.supprimer(); }}
        aria-label="Supprimer la tâche"
      >
        ×
      </button>

      <TacheBarre
        tags={tache.tags}
        onAjouterTag={actions.ajouterTag}
        onSupprimerTag={actions.supprimerTag}
        dateEcheance={tache.dateEcheance}
        onModifierDate={actions.modifierDate}
      />

      <textarea
        ref={zoneTexteRef}
        className="todo_contenu"
        value={tache.contenu}
        onChange={(e) => actions.modifierContenu(e.target.value)}
        placeholder="Écris ta tâche..."
        onClick={(e) => e.stopPropagation()}
      />

      <div className="todo_carte_actions">
        <button
          type="button"
          className="todo_btn_epingler"
          onClick={(e) => { e.stopPropagation(); actions.epingler(); }}
          title="Épingler sur le fond de la page"
        >
          📌 Épingler
        </button>
        <button
          type="button"
          className={`todo_btn_terminer ${tache.terminee ? 'actif' : ''}`}
          onClick={(e) => { e.stopPropagation(); actions.toggleTerminee(); }}
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
function ModalTache ({ tache, actions, fermer }) {
  if (!tache) return null;

  return (
    <div className="modal_fond todo_modal_fond" onClick={fermer}>
      <div
        className={`modal_fenetre todo_modal_fenetre ${tache.terminee ? 'todo_carte--terminee' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>

        <div className="todo_modal_contenu">
          <TacheBarre
            tags={tache.tags}
            onAjouterTag={actions.ajouterTag}
            onSupprimerTag={actions.supprimerTag}
            dateEcheance={tache.dateEcheance}
            onModifierDate={actions.modifierDate}
          />

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
function ModalConfirmation ({ ouvert, message, onConfirmer, onAnnuler }) {
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
function ModalConfirmationSortie ({ ouvert, toggleActif, onToggle, onConfirmer, onAnnuler }) {
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
function NoteEpinglee ({ tache, actions }) {
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

  // Date affichée dans l'en-tête : dernière modification si elle existe et
  // diffère de la création, sinon date de création (repli pour les notes
  // créées avant l'ajout de ce champ, auquel cas rien n'est affiché)
  const dateAffichee = tache.dateModification || tache.dateCreation;
  const estModifiee = Boolean(
    tache.dateModification && tache.dateCreation && tache.dateModification !== tache.dateCreation
  );

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

        {dateAffichee && (
          <span
            className="note_epinglee_date"
            title={estModifiee ? 'Dernière modification' : 'Création'}
          >
            {estModifiee ? '✎ ' : '＋ '}{formaterDateNote(dateAffichee)}
          </span>
        )}

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

      {(tache.tags.length > 0 || tache.dateEcheance) && (
        <div className="note_epinglee_barre_lecture">
          {tache.tags.length > 0 && (
            <div className="note_epinglee_tags_lecture">
              {tache.tags.map((tag, i) => (
                <span key={`${tag}-${i}`} className="note_epinglee_tag_lecture">{tag}</span>
              ))}
            </div>
          )}
          {tache.dateEcheance && (
            <span className="note_epinglee_echeance_lecture">
              Échéance : {tache.dateEcheance}
            </span>
          )}
        </div>
      )}

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
function Note ({ taches, ajouterTache, actionsPour }) {
  const [idAgrandie, setIdAgrandie] = useState(null);

  // Une note épinglée quitte la liste : elle est déjà visible sur le fond principal
  const tachesListe = taches.filter((t) => !t.epinglee);
  const tacheAgrandie = taches.find((t) => t.id === idAgrandie) || null;

  return (
    <div className="todo_zone">
      <div className="todo_entete">
        <h2>Notes</h2>
        <button type="button" className="todo_btn_ajouter" onClick={ajouterTache}>
          + Nouvelle tâche
        </button>
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
            <TacheCarte
              key={tache.id}
              tache={tache}
              actions={actionsPour(tache.id)}
              onAgrandir={() => setIdAgrandie(tache.id)}
            />
          ))}
        </div>
      )}

      {tacheAgrandie && (
        <ModalTache
          tache={tacheAgrandie}
          actions={actionsPour(tacheAgrandie.id)}
          fermer={() => setIdAgrandie(null)}
        />
      )}
    </div>
  );
}

// --- Param : deux sections ---
// 1. Arrière-plan du site (couleur RGB + image/GIF)
// 2. Minuteur Pomodoro (durées + couleurs)
function Param ({
  couleurFondInput,
  setCouleurFondInput,
  onAppliquerCouleur,
  onChangerImage,
  imageFondActuelle,
  reglages,
  onChangerDuree,
  onChangerCouleur,
  onReinitialiserReglages
}) {
  return(
    <div className='param'>
      <h2>Paramètre 2</h2>
      <p>Contenu du bloc paramètres...</p>

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
              placeholder="rgb(255, 0, 0)"
              value={couleurFondInput}
              onChange={(e) => setCouleurFondInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onAppliquerCouleur(couleurFondInput);
              }}
            />
            <button
              className="param_btn_valider"
              onClick={() => onAppliquerCouleur(couleurFondInput)}
            >
              Valider
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
    </div>
  );
}


function Chat_IA (){
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chargement, setChargement] = useState(false);
  const messagesFinRef = useRef(null);

  useEffect(() => {
    messagesFinRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const envoyerMessage = async () => {
    if (!input.trim() || chargement) return;

    const nouveauxMessages = [...messages, { role: 'user', text: input }];
    setMessages(nouveauxMessages);
    setInput('');
    setChargement(true);

    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nouveauxMessages.map(m => ({
            role: m.role,
            content: m.text
          }))
        })
      });
      const data = await res.json();
      const reponseTexte = data.content?.[0]?.text || 'Erreur de réponse';

      setMessages(prev => [...prev, { role: 'assistant', text: reponseTexte }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Erreur de connexion au serveur.' }]);
    } finally {
      setChargement(false);
    }
  };

  const gererTouche = (e) => {
    if (e.key === 'Enter') envoyerMessage();
  };

  return(
    <div className='Chat_IA'>
      <div className="chat_messages">
        {messages.length === 0 && (
          <div className="chat_message_vide">Pose ta question à Claude...</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat_message ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {chargement && <div className="chat_message assistant">...</div>}
        <div ref={messagesFinRef}></div>
      </div>

      <div className="chat_input_zone">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={gererTouche}
          placeholder="Écris un message..."
          disabled={chargement}
        />
        <button onClick={envoyerMessage} disabled={chargement}>Envoyer</button>
      </div>
    </div>
  );
}


function Salon_course () {
  return(
    <div className='salon_course'>
      <h2>Statistiques</h2>
      <p>Contenu du bloc stats...</p>
    </div>
  );
}


const ONGLETS_POIGNEE = [
  { id: 1, icone: '📝', label: 'Notes', notif: true },
  { id: 2, icone: '⚙️', label: 'Réglages', notif: true },
  { id: 3, icone: '🤖', label: 'Assistant', notif: true },
  { id: 4, icone: '🏁', label: 'Salon de course', notif: true },
];

// BlocDeux relaie les props "fond" et "réglages Pomodoro" vers Param,
// et les props des tâches/notes vers Note
function BlocDeux ({
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
  actionsPourTache
}) {
  const [vueActive, setVueActive] = useState(1);

  const choisirOnglet = (id) => {
    setVueActive(id);
    if (!ouvert) setOuvert(true);
  };

  return(
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
          <button className={vueActive === 2 ? 'actif' : ''} onClick={() => setVueActive(2)}>Réglages</button>
          <button className={vueActive === 3 ? 'actif' : ''} onClick={() => setVueActive(3)}>Assistant</button>
          <button className={vueActive === 4 ? 'actif' : ''} onClick={() => setVueActive(4)}>salon de course</button>
        </div>

        <div className="panel_contenu">
          {vueActive === 1 && (
            <Note
              taches={taches}
              ajouterTache={ajouterTache}
              actionsPour={actionsPourTache}
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
            />
          )}
          {vueActive === 3 && <Chat_IA/>}
          {vueActive === 4 && <Salon_course/>}
        </div>
      </div>
    </div>
  );
}


// --- BarreDefilante : le coureur GIF est placé AU-DESSUS de la bande
// de flèches défilantes, et agrandi pour plus de visibilité. Le GIF
// s'anime nativement (image par image) : aucune animation CSS de saut
// ne lui est appliquée. Le fichier coureur.gif doit être placé dans /public.
function BarreDefilante ({ actif }) {
  const fleches = Array.from({ length: 16 }, (_, i) => i);

  return(
    <div className="bas_page">
      {/* Coureur animé : placé au-dessus de la bande de flèches */}
      <img
        src="/coureur.gif"
        alt="Coureur animé"
        className="coureur_defilant"
      />

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
  const [profilOuvert, setProfilOuvert] = useState(false);
  const [distanceTotale, setDistanceTotale] = useState(0);

  // --- États : personnalisation de l'arrière-plan ---
  const [couleurFondInput, setCouleurFondInput] = useState('');
  const [couleurFondAppliquee, setCouleurFondAppliquee] = useState(null);
  const [imageFond, setImageFond] = useState(null);

  // --- Réglages Pomodoro (durées + couleurs) ---
  // Initialisation "paresseuse" : lecture du localStorage une seule fois,
  // au tout premier rendu, pour restaurer les réglages sauvegardés.
  const [reglages, setReglages] = useState(() => {
    try {
      const sauvegarde = localStorage.getItem(CLE_STOCKAGE_REGLAGES);
      if (!sauvegarde) return REGLAGES_PAR_DEFAUT;
      const parsed = JSON.parse(sauvegarde);
      return { ...REGLAGES_PAR_DEFAUT, ...parsed };
    } catch {
      return REGLAGES_PAR_DEFAUT;
    }
  });

  const ajouterDistanceSession = (metres) => {
    setDistanceTotale((prev) => prev + metres);
  };

  // --- Tâches / Notes (liste + notes épinglées sur le fond principal) ---
  // L'état vit ici (et non dans le composant Note) afin que les notes
  // épinglées restent visibles même quand l'onglet "Notes" n'est pas actif.
  const [taches, setTaches] = useState(() => {
    try {
      const sauvegarde = localStorage.getItem(CLE_STOCKAGE_TACHES);
      return sauvegarde ? JSON.parse(sauvegarde) : [];
    } catch {
      return [];
    }
  });
  // Id de la note pour laquelle une confirmation de désépinglage est demandée
  const [idADesepingler, setIdADesepingler] = useState(null);

  // --- Mode concentration (plein écran + interface épurée) ---
  const [modeConcentration, setModeConcentration] = useState(false);
  const [confirmationSortieOuverte, setConfirmationSortieOuverte] = useState(false);
  const [toggleSortieActif, setToggleSortieActif] = useState(false);
  // Permet de distinguer, dans l'écouteur fullscreenchange, une sortie déjà
  // validée par la modale (on finalise simplement) d'une sortie provoquée par
  // autre chose (ex : touche F11 ou Echap), qui doit déclencher la même
  // confirmation avant d'être effective.
  const sortieConfirmeeRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(CLE_STOCKAGE_TACHES, JSON.stringify(taches));
    } catch {
      // Stockage indisponible : on ignore silencieusement
    }
  }, [taches]);

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

  // Lit le fichier choisi (image ou GIF) et le convertit en data URL utilisable en CSS
  const appliquerImageFond = (fichier) => {
    if (!fichier) return;

    const lecteur = new FileReader();
    lecteur.onload = () => {
      setCouleurFondAppliquee(null);
      setImageFond(lecteur.result);
    };
    lecteur.readAsDataURL(fichier);
  };

  // Applique dynamiquement le fond choisi (couleur ou image) sur le <body>
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
      document.body.style.backgroundImage = '';
      document.body.style.backgroundColor = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundAttachment = '';
    }
  }, [couleurFondAppliquee, imageFond]);

  // Sauvegarde automatique des réglages Pomodoro dans le localStorage
  // à chaque modification, pour être restaurés au rechargement de la page.
  useEffect(() => {
    try {
      localStorage.setItem(CLE_STOCKAGE_REGLAGES, JSON.stringify(reglages));
    } catch {
      // Stockage indisponible (navigation privée, quota dépassé...) : on ignore silencieusement
    }
  }, [reglages]);

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

  return(
    <>
    {!modeConcentration && <Navbar/>}

    {!modeConcentration && (
      <PanneauJoueur
        pseudo="Pseudo"
        niveau={1}
        distance={distanceTotale}
        position={0}
        ouvrirProfil={() => setProfilOuvert(true)}
      />
    )}

    <main className={`stage ${panelOuvert && !modeConcentration ? 'stage--panel-ouvert' : ''}`}>
      <Chrono
        enMarche={enMarche}
        setEnMarche={setEnMarche}
        onSessionTerminee={ajouterDistanceSession}
        dureeTravailMinutes={reglages.dureeTravail}
        dureePauseMinutes={reglages.dureePause}
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
      />
    )}

    {!modeConcentration && <BarreDefilante actif={enMarche}/>}

    {/* Bouton Mode concentration : toujours visible, y compris en plein écran,
        pour permettre à l'utilisateur de sortir du mode. */}
    <button
      type="button"
      className="btn_mode_concentration"
      onClick={modeConcentration ? demanderQuitterModeConcentration : activerModeConcentration}
    >
      {modeConcentration ? 'Quitter le mode concentration' : 'Mode concentration'}
    </button>

    <ModalProfil
      ouvert={profilOuvert}
      fermer={() => setProfilOuvert(false)}
      distanceTotale={distanceTotale}
    />

    {/* Notes épinglées : widgets flottants affichés sur le fond principal */}
    {notesEpinglees.map((tache) => (
      <NoteEpinglee key={tache.id} tache={tache} actions={actionsPourTache(tache.id)} />
    ))}

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
    </>
  )
}

export default App