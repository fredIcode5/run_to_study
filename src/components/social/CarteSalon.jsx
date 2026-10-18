import React from 'react';

// ======================================================================
// --- Section "Salons de course" ---------------------------------------
// ======================================================================

// Jeu de données statique temporaire, en attendant une vraie source (API/back)
function CarteSalon({ salon, onRejoindre }) {
  return (
    <div className="salon_carte" onClick={() => onRejoindre(salon)}>
      <div 
        className="salon_carte_image" 
        aria-hidden="true" 
        style={salon.imageFond ? { backgroundImage: `url(${salon.imageFond})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        <span className="salon_carte_image_icone">🏞️</span>
        <span className="salon_carte_code">{salon.code}</span>
      </div>
      <div className="salon_carte_info">
        <span className="salon_carte_nom">{salon.nom}</span>
        <div className="salon_carte_meta">
          <span className="salon_carte_tag">⏱ {salon.tempsTravail} / {salon.tempsPause}</span>
          <span className="salon_carte_tag">🏷️ {salon.theme}</span>
        </div>
      </div>
    </div>
  );
}

export default CarteSalon;
