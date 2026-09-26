import React, { useState } from 'react';
import { 
  User, 
  Calendar, 
  History, 
  BarChart3, 
  Trophy, 
  Users, 
  TrendingUp, 
  ShoppingBag, 
  Settings 
} from 'lucide-react';

function PanneauJoueur({ 
  pseudo, 
  niveau, 
  distance, 
  position, 
  ouvrirProfil, 
  onOuvrirOnglet, 
  photoProfil, 
  coins 
}) {
  const [menuOuvert, setMenuOuvert] = useState(false);

  const gererClicOnglet = (ongletId) => {
    setMenuOuvert(false);
    if (onOuvrirOnglet) {
      onOuvrirOnglet(ongletId);
    } else if (ouvrirProfil) {
      ouvrirProfil();
    }
  };

  const ONGLETS = [
    { id: 'profil', label: 'Profil', icone: <User size={15} /> },
    { id: 'planning', label: 'Planning', icone: <Calendar size={15} /> },
    { id: 'historique', label: 'Historique', icone: <History size={15} /> },
    { id: 'stats', label: 'Statistiques', icone: <BarChart3 size={15} /> },
    { id: 'collection', label: 'Collection', icone: <Trophy size={15} /> },
    { id: 'social', label: 'Social', icone: <Users size={15} /> },
    { id: 'progression', label: 'Progression', icone: <TrendingUp size={15} /> },
    { id: 'boutique', label: 'Boutique', icone: <ShoppingBag size={15} /> },
    { id: 'parametres', label: 'Paramètres', icone: <Settings size={15} /> },
  ];

  return (
    <div 
      className="joueur_info"
      onMouseEnter={() => setMenuOuvert(true)}
      onMouseLeave={() => setMenuOuvert(false)}
    >
      <button
        className="joueur_photo"
        onClick={() => gererClicOnglet('profil')}
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

      {/* Menu déroulant sous le bloc de profil */}
      <div className={`joueur_menu_deroulant ${menuOuvert ? 'ouvert' : ''}`}>
        <div className="joueur_menu_liste">
          {ONGLETS.map((onglet) => (
            <button
              key={onglet.id}
              type="button"
              className="joueur_menu_item"
              onClick={() => gererClicOnglet(onglet.id)}
            >
              <span className="joueur_menu_item_icone">{onglet.icone}</span>
              <span className="joueur_menu_item_label">{onglet.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PanneauJoueur;
