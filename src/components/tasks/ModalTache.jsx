import React from 'react';
import { Pin } from 'lucide-react';
import TacheZoneTexte from './TacheZoneTexte';


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
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Pin size={16} />
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

export default ModalTache;
