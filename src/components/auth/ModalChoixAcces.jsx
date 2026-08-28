import React from 'react';

function ModalChoixAcces({ ouvert, fermer, onInscription, onInvite, onConnexion }) {
  if (!ouvert) return null;

  return (
    <div className="modal_fond" onClick={fermer}>
      <div className="modal_fenetre choix_acces_fenetre" onClick={(e) => e.stopPropagation()}>
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>

        <div className="modal_contenu choix_acces_contenu">
          <h3 className="choix_acces_titre">Comment veux-tu continuer ?</h3>

          <div className="choix_acces_options">
            <button type="button" className="btn_secondaire choix_acces_option" onClick={onInscription}>
              S'inscrire
            </button>
            <button type="button" className="btn_secondaire choix_acces_option" onClick={onInvite}>
              invité
            </button>
            <button type="button" className="btn_primaire choix_acces_option" onClick={onConnexion}>
              Se connecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalChoixAcces;
