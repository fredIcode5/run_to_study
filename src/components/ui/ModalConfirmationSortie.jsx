import React from 'react';
import ModalConfirmation from './ModalConfirmation';


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

export default ModalConfirmationSortie;
