import React from 'react';
import { useRef } from 'react';
import { Pin, Trash2, Check } from 'lucide-react';

// Une carte = une tâche, éditable directement dans la liste
function TacheCarte({ tache, actions, onAgrandir, lectureSeule, estProgramme }) {
  const zoneTexteRef = useRef(null);

  // Clique n'importe où dans la carte (hors boutons/inputs déjà gérés) -> focus l'édition
  const focaliserEdition = () => {
    zoneTexteRef.current?.focus();
  };

  return (
    <div
      className={`todo_carte ${tache.terminee ? 'todo_carte--terminee' : ''}${lectureSeule && !tache.terminee ? ' todo_carte--non-terminee-lecture' : ''}${estProgramme ? ' todo_carte--programme' : ''}`}
      onClick={focaliserEdition}
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
            className="todo_btn_epingler"
            onClick={(e) => { e.stopPropagation(); actions.epingler?.(); }}
            title="Épingler sur le fond de la page"
            disabled={lectureSeule}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Pin size={16} />
          </button>
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

        {/* Boutons Supprimer et Terminer déplacés en bas à droite */}
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
    </div>
  );
}

export default TacheCarte;
