import React from 'react';


// ==========================================================================
// Fenêtre : consulter les anciennes sessions
// ==========================================================================

function FenetreAnciennesSessions({ sessions, recherche, onChangerRecherche, fermer, onConsulter }) {
  return (
    <div className="session_historique_fond" onClick={fermer}>
      <div className="session_historique_fenetre" onClick={(e) => e.stopPropagation()}>
        <div className="session_historique_entete">
          <h3 className="session_historique_titre">Anciennes sessions</h3>
          <button type="button" className="session_historique_fermer" onClick={fermer}>
            ✕
          </button>
        </div>

        <input
          type="text"
          placeholder="Rechercher par titre ou numéro..."
          value={recherche}
          onChange={(e) => onChangerRecherche(e.target.value)}
          className="session_recherche_input"
        />

        <div className="session_historique_liste">
          {sessions.length === 0 ? (
            <p className="session_ligne_vide">Aucune session trouvée.</p>
          ) : (
            <table className="sessions_tableau">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Numéro</th>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Progression</th>
                  <th>Nombre de notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
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
                      <button type="button" className="session_action_btn" onClick={() => onConsulter(s)} >Consulter </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default FenetreAnciennesSessions;
