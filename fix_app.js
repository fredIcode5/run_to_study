const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

c = c.replace(
  'function ModalProfil ({ ouvert, fermer, pseudo, distanceTotale, historiqueJoursPomodoro, photoProfil, onEnregistrerPhotoProfil, enregistrementPhotoEnCours, erreurPhotoProfil, coins }) {',
  'function ModalProfil ({ ouvert, fermer, pseudo, distanceTotale, historiqueJoursPomodoro, photoProfil, onEnregistrerPhotoProfil, enregistrementPhotoEnCours, erreurPhotoProfil, coins, sessions, onReprendre }) {'
);

c = c.replace(
  '{ongletActif === \\'sessions\\' && <OngletSessions sessions={historiqueJoursPomodoro || []} onReprendre={(s) => onReprendre(s)} />}',
  '{ongletActif === \\'sessions\\' && <OngletSessions sessions={sessions} onReprendre={onReprendre} />}'
);

const fnReprendre = \  const reprendreSession = (session) => {
    if (session.notes) {
      setTachesListe(session.notes);
    } else {
      setTachesListe([]);
    }
    setProfilOuvert(false);
  };

  const gererClicJoueur = () => {\;

c = c.replace('  const gererClicJoueur = () => {', fnReprendre);

c = c.replace(/<ModalProfil[\\s\\S]*?erreurPhotoProfil=\\{erreurPhotoProfil\\}/, '$&\\n      sessions={sessionsSauvegardees}\\n      onReprendre={reprendreSession}');

fs.writeFileSync('src/App.jsx', c);
