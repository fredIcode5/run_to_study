import React from 'react';

// Petite miniature carrée réutilisée à la fois dans la modale de choix de
// musique (aperçu) et sur la carte du lecteur flottant : miniature YouTube
// ou pochette Spotify, avec un repli en dégradé + icône si aucune image
// n'est disponible (cas de la simulation Spotify, faute d'API réelle).
function MiniatureMusique({ className, iconeClassName, type, thumbnail }) {
  return (
    <div className={className}>
      {thumbnail ? (
        <img src={thumbnail} alt="" />
      ) : (
        <span className={iconeClassName}>{type === 'spotify' ? '🎧' : '🎵'}</span>
      )}
    </div>
  );
}

export default MiniatureMusique;
