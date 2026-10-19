import React from 'react';
import {
  COULEURS_CHRONO_DEFAUT,
  normaliserCouleursChrono,
  verifierCouleursChrono,
} from '../timer/couleursChrono';

const CHOIX = [
  { cle: 'travail', label: 'Travail', aide: 'Pendant la session' },
  { cle: 'pause', label: 'Pause', aide: 'Par-dessus, en pause' },
];

// --- « Mon Pomodoro » : couleurs de remplissage de la barre du chronomètre.
// Appliquées en direct au chrono ; l'aperçu reprend exactement son rendu.
function CouleursChrono({ couleurs, onChanger }) {
  const valeurs = normaliserCouleursChrono(couleurs);
  const avertissements = verifierCouleursChrono(valeurs);
  const parDefaut = valeurs.travail === COULEURS_CHRONO_DEFAUT.travail && valeurs.pause === COULEURS_CHRONO_DEFAUT.pause;

  return (
    <div className="param_section couleurs_chrono">
      <div className="couleurs_chrono_entete">
        <h3 className="param_section_titre">Couleurs du chronomètre</h3>
        {!parDefaut && (
          <button type="button" className="couleurs_chrono_reinit" onClick={() => onChanger(COULEURS_CHRONO_DEFAUT)}>
            Par défaut
          </button>
        )}
      </div>

      <div className="couleurs_chrono_choix_liste">
        {CHOIX.map(({ cle, label, aide }) => (
          <label key={cle} className="couleurs_chrono_choix">
            <span className="preset_config_fond_selecteur" title={`Choisir la couleur : ${label.toLowerCase()}`}>
              <input
                type="color"
                value={valeurs[cle]}
                onChange={(e) => onChanger({ ...valeurs, [cle]: e.target.value })}
                aria-label={`Couleur de la barre — ${label.toLowerCase()}`}
              />
              <span style={{ backgroundColor: valeurs[cle] }} aria-hidden="true" />
            </span>
            <span className="couleurs_chrono_texte">
              <span className="couleurs_chrono_label">{label}</span>
              <span className="couleurs_chrono_aide">{aide}</span>
            </span>
          </label>
        ))}
      </div>

      {/* Aperçu : travail terminé, pause à moitié */}
      <div
        className="chrono_barre_piste couleurs_chrono_apercu"
        style={{ '--chrono-couleur-travail': valeurs.travail, '--chrono-couleur-pause': valeurs.pause }}
        aria-hidden="true"
      >
        <div className="chrono_barre_couche chrono_barre_couche--travail" style={{ width: '100%' }} />
        <div className="chrono_barre_couche chrono_barre_couche--pause" style={{ width: '50%' }} />
      </div>

      {avertissements.map((texte) => (
        <p key={texte} className="couleurs_chrono_avertissement" role="status">⚠ {texte}</p>
      ))}
    </div>
  );
}

export default CouleursChrono;
