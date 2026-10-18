import React from 'react';
import SectionPrereglages from './SectionPrereglages';

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
}) {
  return (
    <div className="param">
      <h2>Paramètres</h2>

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
    </div>
  );
}

export default Param;
