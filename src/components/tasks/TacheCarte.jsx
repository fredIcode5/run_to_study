import React from 'react';
import { useRef } from 'react';
import { Pin } from 'lucide-react';


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
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Pin size={16} />
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

export default TacheCarte;
