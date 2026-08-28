import React from 'react';
import { useState } from 'react';
import FenetreAnciennesSessions from './FenetreAnciennesSessions';


// --- Onglet "Historique" : liste des anciennes sessions Pomodoro archivées.
// Réutilise la même structure de tableau que FenetreAnciennesSessions mais
// directement intégrée dans la modale de profil.
function OngletHistorique({ sessionsSauvegardees, onConsulter }) {
  const [recherche, setRecherche] = useState('');
  const [critereTri, setCritereTri] = useState('chronologie');
  const [ordreCroissant, setOrdreCroissant] = useState(false);

  const sessionsFiltrees = (sessionsSauvegardees || []).filter((s) => {
    const cible = recherche.trim().toLowerCase();
    if (!cible) return true;
    return (
      s.titre.toLowerCase().includes(cible) ||
      s.numero.toLowerCase().includes(cible)
    );
  });

  const sessionsTriees = [...sessionsFiltrees].sort((a, b) => {
    let valA, valB;

    if (critereTri === 'chronologie') {
      valA = parseInt(a.id.split('_')[1]) || 0;
      valB = parseInt(b.id.split('_')[1]) || 0;
    } else if (critereTri === 'theme') {
      valA = a.titre.toLowerCase();
      valB = b.titre.toLowerCase();
    } else if (critereTri === 'tachesCompletees') {
      valA = a.notes.filter(n => n.terminee).length;
      valB = b.notes.filter(n => n.terminee).length;
    }

    if (valA < valB) return ordreCroissant ? -1 : 1;
    if (valA > valB) return ordreCroissant ? 1 : -1;
    return 0;
  });

  return (
    <div className="profil_onglet_panneau profil_onglet_panneau--historique">
      <h3 className="profil_section_titre" style={{ marginBottom: 12 }}>Anciennes sessions</h3>

      <div className="historique_controles">
        <input
          type="text"
          placeholder="Rechercher par titre ou numéro..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="historique_recherche_input"
        />

        <select
          className="historique_tri_select"
          value={critereTri}
          onChange={(e) => setCritereTri(e.target.value)}
        >
          <option value="chronologie">Chronologie</option>
          <option value="theme">Thème</option>
          <option value="tachesCompletees">Tâches complétées</option>
        </select>

        <button
          type="button"
          className="historique_tri_btn"
          onClick={() => setOrdreCroissant(!ordreCroissant)}
          title={ordreCroissant ? "Ordre croissant" : "Ordre décroissant"}
        >
          {ordreCroissant ? '↑' : '↓'}
        </button>
      </div>

      <div className="historique_liste">
        {sessionsTriees.length === 0 ? (
          <p className="historique_vide">Aucune session trouvée.</p>
        ) : (
          <table className="sessions_tableau historique_tableau">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Numéro</th>
                <th>Date</th>
                <th>Heure</th>
                <th>Progression</th>
                <th>Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessionsTriees.map((s) => (
                <tr key={s.id}>
                  <td className="session_titre_cellule">{s.titre}</td>
                  <td>
                    <span className="session_numero_badge">#{s.numero}</span>
                  </td>
                  <td>{s.date}</td>
                  <td>{s.heure}</td>
                  <td>
                    <span className="session_progression_badge">
                      {s.notes.filter((n) => n.terminee).length} / {s.notes.length}
                    </span>
                  </td>
                  <td>
                    <span className="session_notes_badge">{s.notes.length}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="session_action_btn"
                      onClick={() => onConsulter && onConsulter(s)}
                    >
                      Consulter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default OngletHistorique;
