import React from 'react';
import { Users } from 'lucide-react';

// --- Nombre de coureurs sur la piste, coureur de l'utilisateur compris.
// fictif : la valeur vient des joueurs de test, d'où la mention « (fake) » ;
// le futur compteur multijoueur passera simplement fictif à false.
function CompteurCoureurs({ nombre, fictif = false }) {
  return (
    <div
      className="compteur_coureurs"
      role="status"
      title={fictif ? 'Coureurs de test : pas de vrais joueurs connectés' : undefined}
    >
      <Users size={14} aria-hidden="true" />
      <span><span className="compteur_coureurs_nombre">{nombre}</span> coureur{nombre > 1 ? 's' : ''}</span>
      {fictif && <span className="compteur_coureurs_fictif">(fake)</span>}
    </div>
  );
}

export default CompteurCoureurs;
