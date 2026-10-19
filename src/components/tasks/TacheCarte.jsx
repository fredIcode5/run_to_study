import React from 'react';
import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Check } from 'lucide-react';
import { bloquerProchainMenuContextuel } from '../../utils/helpers';
import { signalerGlisserVersEspace } from '../accueil/encouragements';

// Distance (px) à parcourir clic droit enfoncé avant que le glisser ne démarre :
// en dessous, c'est un simple clic droit sans effet
const SEUIL_GLISSER = 6;
// Largeur d'une note épinglée (voir .note_epinglee) : le fantôme a la même
const LARGEUR_NOTE_EPINGLEE = 260;

// Une carte = une tâche, éditable directement dans la liste.
// Épinglage : maintenir le clic droit et glisser la carte hors du panneau.
function TacheCarte({ tache, actions, onAgrandir, lectureSeule, estProgramme }) {
  const zoneTexteRef = useRef(null);
  const carteRef = useRef(null);
  const glisserRef = useRef(null);
  const [fantome, setFantome] = useState(null);
  const actionsRef = useRef(actions);

  // Garde une référence à jour des actions, sans ré-attacher les écouteurs du glisser
  useEffect(() => {
    actionsRef.current = actions;
  });

  const peutEpingler = !lectureSeule && typeof actions.epinglerA === 'function';

  // Clique n'importe où dans la carte (hors boutons/inputs déjà gérés) -> focus l'édition
  const focaliserEdition = () => {
    zoneTexteRef.current?.focus();
  };

  // Vrai si le point est au-dessus du panneau latéral : y relâcher annule
  const estSurLePanneau = (x, y) => {
    const panneau = carteRef.current?.closest('.panel_corps');
    if (!panneau) return false;
    const r = panneau.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const demarrerGlisser = (e) => {
    if (e.button !== 2 || !peutEpingler) return;
    const r = carteRef.current.getBoundingClientRect();
    glisserRef.current = {
      departX: e.clientX,
      departY: e.clientY,
      // Le fantôme est saisi au même endroit relatif que la carte
      decalageX: Math.min(e.clientX - r.left, LARGEUR_NOTE_EPINGLEE - 16),
      decalageY: e.clientY - r.top,
      actif: false,
    };
  };

  useEffect(() => {
    const deplacer = (e) => {
      const g = glisserRef.current;
      if (!g) return;
      if (!g.actif) {
        if (Math.hypot(e.clientX - g.departX, e.clientY - g.departY) < SEUIL_GLISSER) return;
        g.actif = true;
        signalerGlisserVersEspace(true);
      }
      setFantome({
        x: e.clientX - g.decalageX,
        y: e.clientY - g.decalageY,
        surPanneau: estSurLePanneau(e.clientX, e.clientY),
      });
    };

    const relacher = (e) => {
      const g = glisserRef.current;
      if (!g) return;
      glisserRef.current = null;
      if (!g.actif) return;

      bloquerProchainMenuContextuel();
      setFantome(null);
      if (estSurLePanneau(e.clientX, e.clientY)) {
        signalerGlisserVersEspace(false);
        return;
      }

      const marge = 8;
      const hauteur = carteRef.current?.offsetHeight || 160;
      actionsRef.current.epinglerA({
        x: Math.min(Math.max(e.clientX - g.decalageX, marge), window.innerWidth - LARGEUR_NOTE_EPINGLEE - marge),
        y: Math.min(Math.max(e.clientY - g.decalageY, marge), window.innerHeight - hauteur - marge),
      });
      signalerGlisserVersEspace(false);
    };

    // Échap annule un glisser en cours
    const annuler = (e) => {
      if (e.key !== 'Escape' || !glisserRef.current) return;
      if (glisserRef.current.actif) {
        bloquerProchainMenuContextuel();
        signalerGlisserVersEspace(false);
      }
      glisserRef.current = null;
      setFantome(null);
    };

    document.addEventListener('pointermove', deplacer);
    document.addEventListener('pointerup', relacher);
    document.addEventListener('keydown', annuler);
    return () => {
      document.removeEventListener('pointermove', deplacer);
      document.removeEventListener('pointerup', relacher);
      document.removeEventListener('keydown', annuler);
    };
  }, []);

  return (
    <div
      ref={carteRef}
      className={`todo_carte ${tache.terminee ? 'todo_carte--terminee' : ''}${lectureSeule && !tache.terminee ? ' todo_carte--non-terminee-lecture' : ''}${estProgramme ? ' todo_carte--programme' : ''}${fantome ? ' todo_carte--glissee' : ''}`}
      onClick={focaliserEdition}
      onPointerDown={demarrerGlisser}
      // Pas de stopPropagation : le clic droit doit toujours pouvoir quitter le mode "Organiser"
      onContextMenu={(e) => { if (peutEpingler) e.preventDefault(); }}
      title={peutEpingler ? 'Clic droit maintenu + glisser hors du panneau pour épingler' : undefined}
    >
      {tache.ordre != null && (
        <span className="session_ordre_badge" title={`Ordre : ${tache.ordre}`}>
          {tache.ordre}
        </span>
      )}

      <textarea
        ref={zoneTexteRef}
        className="todo_contenu"
        value={tache.contenu || ''}
        onChange={(e) => actions.modifierContenu?.(e.target.value)}
        placeholder="Écris ta tâche..."
        onClick={(e) => e.stopPropagation()}
        readOnly={lectureSeule}
      />

      <div className="todo_carte_actions">
        <div className="todo_carte_actions_gauche">
          <button
            type="button"
            className="todo_btn_agrandir"
            onClick={(e) => { e.stopPropagation(); onAgrandir?.(); }}
            aria-label="Agrandir la tâche"
            title="Agrandir"
          >
            ⤢
          </button>
        </div>

        {/* Supprimer / Terminer : affichés au survol de la carte */}
        <div className="todo_carte_actions_droite">
          <button
            type="button"
            className="todo_btn_supprimer_carte"
            onClick={(e) => { e.stopPropagation(); actions.supprimer?.(); }}
            aria-label="Supprimer la tâche"
            title="Supprimer"
            disabled={lectureSeule}
          >
            <Trash2 size={14} />
            <span>Supprimer</span>
          </button>

          <button
            type="button"
            className={`todo_btn_terminer ${tache.terminee ? 'actif' : ''}`}
            onClick={(e) => { e.stopPropagation(); actions.toggleTerminee?.(); }}
            disabled={lectureSeule}
          >
            <Check size={14} />
            <span>{tache.terminee ? '✓ Terminé' : 'Terminé'}</span>
          </button>
        </div>
      </div>

      {/* Fantôme suivant le pointeur pendant le glisser (rendu hors du panneau) */}
      {fantome && createPortal(
        <div
          className={`todo_carte_fantome${fantome.surPanneau ? ' todo_carte_fantome--annule' : ''}`}
          style={{ left: `${fantome.x}px`, top: `${fantome.y}px`, width: `${LARGEUR_NOTE_EPINGLEE}px` }}
          aria-hidden="true"
        >
          <span className="todo_carte_fantome_texte">{tache.contenu || '(Note vide)'}</span>
          <span className="todo_carte_fantome_aide">
            {fantome.surPanneau ? 'Relâche hors du panneau pour épingler' : 'Relâche pour épingler ici'}
          </span>
        </div>,
        document.body
      )}
    </div>
  );
}

export default TacheCarte;
