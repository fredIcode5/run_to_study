import React from 'react';
import { useState } from 'react';
import FenetreAnciennesSessions from './FenetreAnciennesSessions';


// --- « Historique des notes » : cahiers des sessions passées, présentés comme
// les anciennes sessions (recherche, tri, tableau). Ouvrir un cahier l'affiche
// en consultation dans la fenêtre « Cahier », distinct du cahier en cours.
function HistoriqueNotes({ cahiers, onOuvrir }) {
  const [recherche, setRecherche] = useState('');
  const [critereTri, setCritereTri] = useState('modification');
  const [ordreCroissant, setOrdreCroissant] = useState(false);

  const cible = recherche.trim().toLowerCase();
  const filtres = (cahiers || []).filter((c) => !cible
    || c.titre.toLowerCase().includes(cible)
    || (c.numero || '').toLowerCase().includes(cible)
    || c.contenu.toLowerCase().includes(cible));

  const valeurTri = (c) => (critereTri === 'session' ? Number(c.sessionId.split('_')[1]) || 0
    : critereTri === 'titre' ? c.titre.toLowerCase()
      : c.dateModification);
  const tries = [...filtres].sort((a, b) => {
    const [va, vb] = [valeurTri(a), valeurTri(b)];
    if (va < vb) return ordreCroissant ? -1 : 1;
    if (va > vb) return ordreCroissant ? 1 : -1;
    return 0;
  });

  return (
    <>
      <h3 className="profil_section_titre historique_notes_titre">Historique des notes</h3>

      <div className="historique_controles">
        <input
          type="text"
          placeholder="Rechercher dans les notes, le titre ou le numéro..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="historique_recherche_input"
        />

        <select
          className="historique_tri_select"
          value={critereTri}
          onChange={(e) => setCritereTri(e.target.value)}
        >
          <option value="modification">Dernière modification</option>
          <option value="session">Date de la session</option>
          <option value="titre">Titre</option>
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
        {tries.length === 0 ? (
          <p className="historique_vide">
            {(cahiers || []).length === 0
              ? 'Aucun cahier pour les sessions passées. Les notes du Cahier (Documents › Fenêtre) apparaissent ici une fois la session terminée.'
              : 'Aucun cahier trouvé.'}
          </p>
        ) : (
          <table className="sessions_tableau historique_tableau">
            <thead>
              <tr>
                <th>Session</th>
                <th>Date</th>
                <th>Heure</th>
                <th>Aperçu</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tries.map((c) => (
                <tr key={c.sessionId}>
                  <td className="session_titre_cellule">
                    {c.titre}
                    {c.numero && <span className="session_numero_badge historique_notes_numero">#{c.numero}</span>}
                  </td>
                  <td>{c.date}</td>
                  <td>{c.heure}</td>
                  <td className="historique_notes_apercu" title={`Modifié le ${c.modifieLe}`}>{c.apercu}</td>
                  <td>
                    <button type="button" className="session_action_btn" onClick={() => onOuvrir?.(c.sessionId)}>
                      Ouvrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// --- Onglet "Historique" : liste des anciennes sessions Pomodoro archivées.
// Réutilise la même structure de tableau que FenetreAnciennesSessions mais
// directement intégrée dans la modale de profil. En dessous : l'historique des
// notes (cahiers des sessions passées).
function OngletHistorique({ sessionsSauvegardees, onConsulter, cahiers, onOuvrirCahier }) {
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

      <HistoriqueNotes cahiers={cahiers} onOuvrir={onOuvrirCahier} />
    </div>
  );
}

export default OngletHistorique;
