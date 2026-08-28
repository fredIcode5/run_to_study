import React from 'react';
import { useState, useEffect, useRef } from 'react';
import Note from './Note';


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

export default NoteEpinglee;
