import React from 'react';


// ==========================================================================
// Boîte de dialogue : que faire de la session en cours ?
// ==========================================================================

function DialogueNouvelleSession({ onEnregistrer, onSupprimer, onAnnuler }) {
  return (
    <div className="session_confirm_fond" onClick={onAnnuler}>
      <div className="session_confirm_fenetre" onClick={(e) => e.stopPropagation()}>
        <h3 className="session_confirm_titre">Nouvelle session</h3>
        <p className="session_confirm_texte">
          Que faire de la session en cours avant de commencer une nouvelle session ?
        </p>
        <div className="session_confirm_actions">
          <button
            type="button"
            className="session_confirm_btn session_confirm_btn--enregistrer"
            onClick={onEnregistrer}
          >
            Enregistrer la session actuelle
          </button>
          <button
            type="button"
            className="session_confirm_btn session_confirm_btn--supprimer"
            onClick={onSupprimer}
          >
            Supprimer sans enregistrer
          </button>
          <button
            type="button"
            className="session_confirm_btn session_confirm_btn--annuler"
            onClick={onAnnuler}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

export default DialogueNouvelleSession;
