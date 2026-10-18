import React from 'react';


// Petite modale de confirmation générique (désépinglage, suppression de document…)
function ModalConfirmation({ ouvert, message, onConfirmer, onAnnuler, libelleConfirmer = 'Désépingler' }) {
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
            {libelleConfirmer}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalConfirmation;
