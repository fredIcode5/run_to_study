// ======================================================================
// Onglet Sessions (dans ModalProfil)
// ======================================================================

function OngletSessions({ sessions, onReprendre }) {
  const [recherche, setRecherche] = useState("");
  const [sessionAffichee, setSessionAffichee] = useState(null);

  if (sessionAffichee) {
    const terminees = sessionAffichee.notes ? sessionAffichee.notes.filter(n => n.terminee).length : 0;
    const totales = sessionAffichee.notes ? sessionAffichee.notes.length : 0;

    return (
      <div className="profil_onglet_panneau">
        <div className="session_detail_entete">
          <button type="button" className="btn_secondaire" onClick={() => setSessionAffichee(null)}>
            ← Retour à la liste
          </button>
          <button type="button" className="btn_primaire" onClick={() => onReprendre(sessionAffichee)}>
            Reprendre la session
          </button>
        </div>
        
        <div className="session_detail_resume">
          <h3 className="session_detail_titre">{sessionAffichee.titre} <span className="session_detail_numero">#{sessionAffichee.numero}</span></h3>
          <div className="session_detail_stats">
            <span className="session_detail_stat"><strong>Date :</strong> {sessionAffichee.date} à {sessionAffichee.heure}</span>
            <span className="session_detail_stat"><strong>Notes :</strong> {terminees} / {totales} terminées</span>
          </div>
        </div>

        <div className="session_detail_notes_liste">
          <h4>Notes associées</h4>
          {totales === 0 ? (
            <p className="session_ligne_vide">Aucune note dans cette session.</p>
          ) : (
            <div className="todo_liste">
              {sessionAffichee.notes.map(note => (
                <div key={note.id} className={	odo_carte }>
                  <div className="todo_carte_barre">
                    <div className="todo_tags">
                      {note.tags && note.tags.map(tag => (
                        <span key={tag} className="todo_tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="todo_contenu_lecture">
                    {note.texte}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const sessionsFiltrees = sessions.filter(
    (s) =>
      s.titre.toLowerCase().includes(recherche.toLowerCase()) ||
      s.numero.toString().includes(recherche)
  );

  return (
    <div className="profil_onglet_panneau">
      <input
        type="text"
        placeholder="Rechercher par titre ou numéro..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        className="session_recherche_input"
      />
      <div className="session_historique_liste_onglet">
        {sessionsFiltrees.length === 0 ? (
          <p className="session_ligne_vide">Aucune session trouvée.</p>
        ) : (
          <table className="sessions_tableau">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Numéro</th>
                <th>Date</th>
                <th>Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessionsFiltrees.map((s) => (
                <tr key={s.id}>
                  <td className="session_titre_cellule">{s.titre}</td>
                  <td><span className="session_numero_badge">#{s.numero}</span></td>
                  <td>{s.date}</td>
                  <td><span className="session_notes_badge">{s.notes ? s.notes.length : 0}</span></td>
                  <td>
                    <button type="button" className="session_action_btn" onClick={() => setSessionAffichee(s)}>Consulter</button>
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
