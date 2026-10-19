import React from 'react';
import { OPACITE_TITRE_DEFAUT, BORNES_OPACITE_TITRE } from '../timer/opaciteTitreSession';

// --- « Mon Pomodoro » : opacité de la barre du titre de la session, sous le
// chrono. Appliquée en direct à la barre ; l'aperçu reprend son rendu (utile
// quand le menu recouvre le chrono, sur petit écran).
function ReglageTitreSession({ opacite, titreSession, onChanger }) {
  const pourcentage = Math.round(opacite * 100);
  const changer = (valeur) => onChanger(Number(valeur) / 100);
  const min = Math.round(BORNES_OPACITE_TITRE.min * 100);
  const max = Math.round(BORNES_OPACITE_TITRE.max * 100);

  return (
    <div className="param_section reglage_titre_session">
      <div className="couleurs_chrono_entete">
        <h3 className="param_section_titre">Titre de la session</h3>
        {opacite !== OPACITE_TITRE_DEFAUT && (
          <button type="button" className="couleurs_chrono_reinit" onClick={() => onChanger(OPACITE_TITRE_DEFAUT)}>
            Par défaut
          </button>
        )}
      </div>
      <p className="couleurs_chrono_aide">Opacité de la barre du titre, sous le chrono.</p>

      <div className="encouragements_reglage_ligne">
        <input
          type="range"
          className="encouragements_curseur"
          min={min}
          max={max}
          step={5}
          value={pourcentage}
          onChange={(e) => changer(e.target.value)}
          aria-label="Opacité de la barre du titre de la session"
        />
        <span className="encouragements_reglage_valeur">
          <input
            type="number"
            min={min}
            max={max}
            step={1}
            value={pourcentage}
            onChange={(e) => e.target.value !== '' && changer(e.target.value)}
            aria-label="Opacité de la barre du titre de la session (%)"
          />
          %
        </span>
      </div>

      <div className="reglage_titre_session_apercu" aria-hidden="true">
        <div className="reglage_titre_session_barre" style={{ opacity: opacite }}>
          {titreSession.trim() || 'Titre de la session'}
        </div>
      </div>
    </div>
  );
}

export default ReglageTitreSession;
