import React from 'react';

function PanneauJoueur({ pseudo, niveau, distance, position, ouvrirProfil, photoProfil, coins }) {
  return (
    <div className="joueur_info">
      <button
        className="joueur_photo"
        onClick={ouvrirProfil}
        aria-label="Ouvrir le profil"
      >
        {photoProfil?.dataUrl ? (
          <img
            src={photoProfil.dataUrl}
            alt={`Photo de profil de ${pseudo}`}
            className="joueur_photo_img"
            style={{ objectPosition: `${photoProfil.position?.x ?? 50}% ${photoProfil.position?.y ?? 50}%` }}
            draggable={false}
          />
        ) : (
          <span className="joueur_photo_icone">👤</span>
        )}
      </button>

      <div className="joueur_details">
        <div className="joueur_identite">
          <span className="joueur_pseudo">{pseudo}</span>
          <span className="joueur_niveau">Niv. {niveau}</span>
          <div className="joueur_coins" title="Coins gagnés">
            <svg className="icone_coin" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" fill="#fbbf24" />
              <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="12" fontWeight="bold" fill="#b45309">C</text>
            </svg>
            <span>{coins}</span>
          </div>
        </div>

        <div className="joueur_stats">
          <div className="joueur_stat">
            <span className="joueur_stat_valeur">{distance} m</span>
            <span className="joueur_stat_label">Distance</span>
          </div>
          <div className="joueur_stat">
            <span className="joueur_stat_valeur">Position : {position}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PanneauJoueur;
