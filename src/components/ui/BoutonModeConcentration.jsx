import React from 'react';
import { Eye } from 'lucide-react';

// --- Bouton du mode concentration (plein écran + interface épurée) : l'active,
// ou demande confirmation pour le quitter
function BoutonModeConcentration({ actif, onClick, taille = 20, className = '' }) {
  const libelle = actif ? 'Quitter le mode concentration' : 'Mode concentration';
  return (
    <button
      type="button"
      className={`btn_mode_concentration${className ? ` ${className}` : ''}`}
      title={libelle}
      aria-label={libelle}
      onClick={onClick}
    >
      <Eye size={taille} />
    </button>
  );
}

export default BoutonModeConcentration;
