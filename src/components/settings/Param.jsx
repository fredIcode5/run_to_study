import React from 'react';
import SectionPrereglages from './SectionPrereglages';
import CouleursChrono from './CouleursChrono';
import ReglagesEncouragements from './ReglagesEncouragements';
import ReglageTitreSession from './ReglageTitreSession';

// Onglet Mon Pomodoro / Paramètres :
// Contient le carrousel de préréglages, les détails du preset actif,
// la section de configuration (minuteur, musique, fond) et les actions associées.
function Param({
  musiqueActuelle,
  onOuvrirChoixMusique,
  prereglages,
  onAppliquerPrereglage,
  onOuvrirRenommagePrereglage,
  onDemanderSuppressionPrereglage,
  onRemplacerPrereglage,
  onMettreAJourPrereglage,
  onOuvrirCreationPrereglage,
  couleursChrono,
  onChangerCouleursChrono,
  encouragements,
  onChangerEncouragements,
  fondAccueil,
  onChangerFondAccueil,
  opaciteTitreSession,
  onChangerOpaciteTitreSession,
  titreSession,
}) {
  return (
    <div className="param">
      <h2>Paramètres</h2>

      {/* --- Couleurs de la barre du chronomètre (travail / pause) --- */}
      <CouleursChrono couleurs={couleursChrono} onChanger={onChangerCouleursChrono} />

      {/* --- Section complète des préréglages et de la configuration --- */}
      <SectionPrereglages
        prereglages={prereglages}
        onAppliquer={onAppliquerPrereglage}
        onOuvrirRenommage={onOuvrirRenommagePrereglage}
        onDemanderSuppression={onDemanderSuppressionPrereglage}
        onRemplacer={onRemplacerPrereglage}
        onMettreAJour={onMettreAJourPrereglage}
        onOuvrirCreation={onOuvrirCreationPrereglage}
        onOuvrirChoixMusique={onOuvrirChoixMusique}
        musiqueActuelle={musiqueActuelle}
      />

      {/* --- Encouragements : écran d'accueil et citations --- */}
      <ReglagesEncouragements
        encouragements={encouragements}
        onChanger={onChangerEncouragements}
        fond={fondAccueil}
        onChangerFond={onChangerFondAccueil}
      />

      {/* --- Titre de la session (sous le chrono) : opacité de sa barre --- */}
      <ReglageTitreSession
        opacite={opaciteTitreSession}
        titreSession={titreSession}
        onChanger={onChangerOpaciteTitreSession}
      />
    </div>
  );
}

export default Param;
