import React from 'react';
import Param from '../settings/Param';

// --- Onglet "Paramètres" : gestion du compte (photo de profil avec
// repositionnement, e-mail, mot de passe, comptes liés, suppression de
// compte) et des informations personnelles (date de naissance, sexe).
// Purement front-end pour l'instant : aucune donnée n'est envoyée à un
// serveur, "Enregistrer les modifications" est un emplacement réservé
// prêt à être branché sur une vraie API plus tard.
// --- Onglet "Progression" : Jauge d'expérience et récompenses
function OngletProgression({ distanceTotale }) {
  const NIVEAUX = [
    { id: 'C1', distance: 1000, recompense: 'Récompense 1' },
    { id: 'C2', distance: 5000, recompense: 'Récompense 2' },
    { id: 'C3', distance: 10000, recompense: 'Récompense 3' },
    { id: 'C4', distance: 20000, recompense: 'Récompense 4' },
    { id: 'C5', distance: 45000, recompense: 'Récompense 5' },
  ];

  let pourcentage = 0;
  let prochainNiveau = null;
  let distanceRestanteInfo = '';

  if (distanceTotale < NIVEAUX[0].distance) {
    pourcentage = (distanceTotale / NIVEAUX[0].distance) * 20;
    prochainNiveau = NIVEAUX[0];
    distanceRestanteInfo = `${Math.floor(distanceTotale)} m / ${NIVEAUX[0].distance} m pour atteindre ${NIVEAUX[0].id}`;
  } else if (distanceTotale >= NIVEAUX[4].distance) {
    pourcentage = 100;
    distanceRestanteInfo = 'Niveau maximum atteint !';
  } else {
    for (let i = 0; i < NIVEAUX.length - 1; i++) {
      if (distanceTotale >= NIVEAUX[i].distance && distanceTotale < NIVEAUX[i + 1].distance) {
        const base = (i + 1) * 20;
        const progressionDansSegment = (distanceTotale - NIVEAUX[i].distance) / (NIVEAUX[i + 1].distance - NIVEAUX[i].distance);
        pourcentage = base + (progressionDansSegment * 20);
        prochainNiveau = NIVEAUX[i + 1];
        distanceRestanteInfo = `${Math.floor(distanceTotale)} m / ${NIVEAUX[i + 1].distance} m pour atteindre ${NIVEAUX[i + 1].id}`;
        break;
      }
    }
  }

  return (
    <div className="profil_onglet_panneau">
      <h3 className="progression_titre">Votre Progression</h3>
      <p className="progression_sous_titre">{distanceRestanteInfo}</p>

      <div className="progression_container">
        <div className="progression_barre_fond">
          <div
            className="progression_barre_remplissage"
            style={{ width: `${pourcentage}%` }}
          ></div>
        </div>

        <div className="progression_etapes">
          {NIVEAUX.map((niveau, index) => {
            const estAtteint = distanceTotale >= niveau.distance;
            const positionFixe = (index + 1) * 20;

            return (
              <div
                key={niveau.id}
                className={`progression_etape ${estAtteint ? 'progression_etape--atteint' : ''}`}
                style={{ left: `${positionFixe}%` }}
              >
                <div className="progression_etape_haut">
                  <span className="progression_etape_id">{niveau.id}</span>
                  <span className="progression_etape_distance">{niveau.distance.toLocaleString()} m</span>
                </div>
                <div className="progression_point">
                  {estAtteint && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="progression_icone_valide">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="progression_etape_bas">
                  <span className="progression_etape_recompense">{niveau.recompense}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default OngletProgression;
