import React from 'react';

// --- Sessions archivées : persistées dans Supabase (table « sessions_notes »).
// Un compte connecté ne voit jamais les sessions archivées d'un autre compte.
// Le mode invité n'a aucune persistance : ses sessions vivent en mémoire.

// ==========================================================================
// Composant principal
// ==========================================================================

// --- Pomodoro Tracker : barre de points représentant les séances de
// travail terminées (10 emplacements max). Survol d'un point rempli =
// tooltip affichant la durée de la séance correspondante.
function PomodoroTracker({ points }) {
  return (
    <span className="pomodoro_tours_compteur">
      Tours : {points.length}
    </span>
  );
}

export default PomodoroTracker;
