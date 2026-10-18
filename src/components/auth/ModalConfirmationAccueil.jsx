import React from 'react';

// --- Fenêtre de choix d'accès : affichée dès qu'un utilisateur non connecté
// tente d'accéder à Home ou à Pomodoro (depuis la navbar ou le bouton
// "Commencer à travailler"). Propose 3 options alignées horizontalement.
function ModalConfirmationAccueil({ ouvert, fermer, onConfirmer }) {
  if (!ouvert) return null;
  return (
    <div className="modal_fond" onClick={fermer}>
      <div className="modal_fenetre choix_acces_fenetre" onClick={(e) => e.stopPropagation()}>
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>

        <div className="modal_contenu choix_acces_contenu">
          <h3 className="choix_acces_titre" style={{ textAlign: 'center', marginBottom: '16px' }}>Attention</h3>
          <p className="choix_acces_texte" style={{ textAlign: 'center', marginBottom: '24px' }}>
            Vous utilisez actuellement le mode invité. Si vous retournez à l'accueil, toutes vos notes, sessions et données non sauvegardées seront <strong>définitivement supprimées</strong>. Souhaitez-vous continuer ?
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button type="button" className="btn_secondaire" onClick={fermer}>
              Annuler
            </button>
            <button type="button" className="btn_primaire" onClick={onConfirmer}>
              Continuer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalConfirmationAccueil;
