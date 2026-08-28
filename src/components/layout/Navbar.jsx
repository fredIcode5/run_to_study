import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

function Navbar({ onAccueil, onCourse, onConnexion, modeInvite }) {
  const { connecte, utilisateur, deconnexion } = useAuth();

  // Pseudo affiché une fois connecté : priorité au pseudo renseigné à
  // l'inscription (user_metadata), sinon repli sur l'email du compte.
  const pseudoAffiche = utilisateur?.displayName || utilisateur?.email || '';

  return (
    <>
      <div className="navbar">
        <button onClick={onAccueil}>home</button>
        <button onClick={onCourse}>Course</button>
        {connecte ? (
          <div className="navbar_compte">
            <button type="button" className="navbar_compte_bouton">
              Connecté : {pseudoAffiche}
            </button>
            <div className="navbar_compte_menu">
              <button type="button" className="navbar_compte_menu_item" onClick={deconnexion}>
                Se déconnecter
              </button>
            </div>
          </div>
        ) : modeInvite ? (
          <button onClick={onConnexion} title="Cliquer pour créer un compte ou te connecter">
            Mode invité
          </button>
        ) : (
          <button onClick={onConnexion}>Se connecter</button>
        )}
      </div>
    </>
  );
}

export default Navbar;
