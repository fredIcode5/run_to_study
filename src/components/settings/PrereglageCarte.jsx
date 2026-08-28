import React from 'react';

// Carte du carrousel de préréglages avec illustration/fond, coins fortement arrondis,
// actions rapides, badge et état actif mis en valeur.
function PrereglageCarte({
  prereglage,
  estActif,
  posClass,
  onSelectionner,
  onAppliquer,
  onRenommer,
  onSupprimer,
  onRemplacer
}) {
  const getStyleApercu = () => {
    if (prereglage.imageFond) {
      return { backgroundImage: `url(${prereglage.imageFond})` };
    }
    if (prereglage.isSessionEnLigne) {
      return {
        background: 'linear-gradient(135deg, #064e3b 0%, #059669 60%, #10b981 100%)',
      };
    }
    if (prereglage.couleurFondAppliquee) {
      return {
        backgroundColor: prereglage.couleurFondAppliquee,
        backgroundImage: 'radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.18) 0%, transparent 65%), linear-gradient(180deg, transparent 30%, rgba(0, 0, 0, 0.5) 100%)',
      };
    }
    return {
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 60%, #1e293b 100%)',
    };
  };

  const handleClick = () => {
    if (!estActif) {
      onSelectionner();
    } else {
      onAppliquer();
    }
  };

  return (
    <div
      className={`prereglage_carte ${posClass || ''} ${estActif ? 'prereglage_carte--actif' : ''} ${prereglage.isSessionEnLigne ? 'prereglage_carte--en-ligne' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Préréglage ${prereglage.nom}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <div className="prereglage_carte_apercu" style={getStyleApercu()}>
        <div className="prereglage_carte_gradient_overlay" />

        {/* Partie haute de la carte : badges & actions */}
        <div className="prereglage_carte_haut">
          {prereglage.isSessionEnLigne ? (
            <div className="prereglage_carte_badge_online">
              <span className="prereglage_carte_badge_pulse" />
              <span>EN LIGNE</span>
            </div>
          ) : estActif ? (
            <div className="prereglage_carte_badge_focus">
              <span>Preset</span>
            </div>
          ) : (
            <div />
          )}

          {!prereglage.isSessionEnLigne && estActif && (
            <div className="prereglage_carte_actions" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="prereglage_action_btn"
                onClick={onRemplacer}
                aria-label="Mettre à jour avec les réglages actuels"
                title="Mettre à jour avec les réglages actuels"
              >
                ⟳
              </button>
              <button
                type="button"
                className="prereglage_action_btn"
                onClick={onRenommer}
                aria-label="Renommer le préréglage"
                title="Renommer"
              >
                ✎
              </button>
              <button
                type="button"
                className="prereglage_action_btn"
                onClick={onSupprimer}
                aria-label="Supprimer le préréglage"
                title="Supprimer"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Partie basse de la carte : nom, durées */}
        <div className="prereglage_carte_bas">
          <div className="prereglage_carte_titre_ligne">
            <span className="prereglage_carte_nom" title={prereglage.nom}>
              {prereglage.nom}
            </span>
          </div>

          <div className="prereglage_carte_metas">
            {prereglage.reglages && (
              <span className="prereglage_carte_duree">
                ⏱ {prereglage.reglages.dureeTravail ?? 25}m / {prereglage.reglages.dureePause ?? 5}m
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrereglageCarte;
