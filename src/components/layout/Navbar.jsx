import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

function Navbar({ onAccueil, onCourse, onConnexion, modeInvite, autoMasquage = false, positionBas = false }) {
  const { connecte, utilisateur, deconnexion } = useAuth();
  const [estVisible, setEstVisible] = useState(true);
  const timerMasquageRef = useRef(null);
  const estDansZoneRef = useRef(false);

  // Pseudo affiché une fois connecté : priorité au pseudo renseigné à
  // l'inscription (user_metadata), sinon repli sur l'email du compte.
  const pseudoAffiche = utilisateur?.displayName || utilisateur?.email || '';

  const lancerCompteAReboursMasquage = () => {
    if (!autoMasquage) return;
    clearTimeout(timerMasquageRef.current);
    timerMasquageRef.current = setTimeout(() => {
      if (!estDansZoneRef.current) {
        setEstVisible(false);
      }
    }, 3000); // 3 secondes
  };

  const afficherNavbar = () => {
    setEstVisible(true);
    lancerCompteAReboursMasquage();
  };

  useEffect(() => {
    if (!autoMasquage) {
      setEstVisible(true);
      clearTimeout(timerMasquageRef.current);
      return;
    }

    // Afficher au montage et lancer le compte à rebours initial de 3s
    setEstVisible(true);
    lancerCompteAReboursMasquage();

    // Détection globale de la position du curseur
    const gererMouvementSouris = (e) => {
      // Si la souris est dans la zone active (en haut ou en bas selon positionBas)
      const dansZone = positionBas
        ? (window.innerHeight - e.clientY <= 80)
        : (e.clientY <= 75);

      if (dansZone) {
        estDansZoneRef.current = true;
        clearTimeout(timerMasquageRef.current);
        setEstVisible(true);
      } else {
        if (estDansZoneRef.current) {
          // La souris vient de quitter la zone -> démarre le compte à rebours de 3s
          estDansZoneRef.current = false;
          lancerCompteAReboursMasquage();
        }
      }
    };

    window.addEventListener('mousemove', gererMouvementSouris, { passive: true });
    return () => {
      clearTimeout(timerMasquageRef.current);
      window.removeEventListener('mousemove', gererMouvementSouris);
    };
  }, [autoMasquage, positionBas]);

  const handleMouseEnter = () => {
    estDansZoneRef.current = true;
    clearTimeout(timerMasquageRef.current);
    setEstVisible(true);
  };

  const handleMouseLeave = () => {
    estDansZoneRef.current = false;
    lancerCompteAReboursMasquage();
  };

  return (
    <>
      {/* Zone invisible au sommet ou au bas de l'écran pour déclencher la réapparition au passage du curseur */}
      {autoMasquage && (
        <div
          className={`navbar_zone_declencheur ${positionBas ? 'navbar_zone_declencheur--en-bas' : ''}`}
          onMouseEnter={afficherNavbar}
          aria-hidden="true"
        />
      )}

      <div
        className={`navbar ${positionBas ? 'navbar--en-bas' : ''} ${!estVisible && autoMasquage ? 'navbar--masquee' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
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
