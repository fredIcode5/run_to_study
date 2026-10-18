import React from 'react';


// --- Onglet "Boutique" : Achats avec les Coins
function OngletBoutique({ coins }) {
  return (
    <div className="profil_onglet_panneau boutique_panneau">
      <div className="boutique_entete">
        <h3 className="boutique_titre">Boutique</h3>
        <div className="boutique_solde">
          <span>Solde :</span>
          <div className="joueur_coins">
            <svg className="icone_coin" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" fill="#fbbf24" />
              <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="12" fontWeight="bold" fill="#b45309">C</text>
            </svg>
            <span>{coins}</span>
          </div>
        </div>
      </div>

      <div className="boutique_contenu_vide">
        <div className="boutique_placeholder_icone">🛒</div>
        <p className="boutique_placeholder_texte">
          La boutique sera bientôt disponible.<br />
          Continuez vos sessions pour gagner des Coins !
        </p>
      </div>
    </div>
  );
}

export default OngletBoutique;
