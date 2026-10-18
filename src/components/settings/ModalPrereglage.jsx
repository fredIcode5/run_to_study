import React from 'react';
import { useState, useEffect } from 'react';


// Modale utilisée à la fois pour créer un nouveau préréglage (saisie du nom)
// et pour renommer un préréglage existant (champ pré-rempli)
function ModalPrereglage({ ouvert, modeRenommage, nomInitial, fermer, onValider }) {
  const [nom, setNom] = useState(nomInitial || '');

  useEffect(() => {
    setNom(nomInitial || '');
  }, [nomInitial, ouvert]);

  if (!ouvert) return null;

  const valider = () => {
    const nomFinal = nom.trim();
    if (!nomFinal) return;
    onValider(nomFinal);
  };

  return (
    <div className="modal_fond salon_modal_fond" onClick={fermer}>
      <div className="modal_fenetre salon_modal_fenetre" onClick={(e) => e.stopPropagation()}>
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>

        <div className="salon_modal_contenu">
          <h3 className="salon_modal_titre">
            {modeRenommage ? 'Renommer le préréglage' : 'Créer un préréglage'}
          </h3>

          <div className="salon_champ">
            <label className="salon_label" htmlFor="prereglage-nom">Nom du préréglage</label>
            <input
              id="prereglage-nom"
              type="text"
              className="param_input"
              placeholder="Ex : Soirée détente"
              value={nom}
              autoFocus
              onChange={(e) => setNom(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') valider(); }}
            />
          </div>

          <button type="button" className="salon_btn_valider_creation" onClick={valider}>
            {modeRenommage ? 'Renommer' : 'Créer le préréglage'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalPrereglage;
