import React from 'react';
import { formaterJourIso } from '../../utils/helpers';


// --- Heatmap mensuelle façon GitHub : un carré par jour du mois en cours,
// actif dès qu'au moins un Pomodoro a été terminé ce jour-là.
function HeatmapPomodoro({ historique }) {
  const joursActifs = new Set(historique || []);

  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = maintenant.getMonth(); // 0-indexé
  const nombreJours = new Date(annee, mois + 1, 0).getDate();
  const jours = Array.from({ length: nombreJours }, (_, i) => i + 1);
  const nomMois = maintenant.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="heatmap_pomodoro">
      <p className="heatmap_pomodoro_mois">{nomMois}</p>
      <div className="heatmap_pomodoro_grille">
        {jours.map((jour) => {
          const iso = formaterJourIso(new Date(annee, mois, jour));
          const actif = joursActifs.has(iso);
          return (
            <span
              key={iso}
              className={`heatmap_pomodoro_case ${actif ? 'heatmap_pomodoro_case--actif' : ''}`}
              title={`${jour} ${nomMois}${actif ? ' — au moins un Pomodoro terminé' : ''}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default HeatmapPomodoro;
