const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

c = c.replace(
  \import { supabase } from './lib/SupabaseClient'\,
  \\
);

// 1. Update ONGLETS_PROFIL
c = c.replace(
  \  const ONGLETS_PROFIL = [
    { id: 'profil', label: 'Profil' },
    { id: 'stats', label: 'Stats' },
    { id: 'social', label: 'Social' },
    { id: 'parametres', label: 'Paramètres' },
  ];\,
  \  const ONGLETS_PROFIL = [
    { id: 'profil', label: 'Profil' },
    { id: 'stats', label: 'Stats' },
    { id: 'social', label: 'Social' },
    { id: 'progression', label: 'Progression' },
    { id: 'boutique', label: 'Boutique' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'parametres', label: 'Paramètres' },
  ];\
);

// 2. Update ModalProfil signature
c = c.replace(
  \unction ModalProfil ({ ouvert, fermer, pseudo, distanceTotale, historiqueJoursPomodoro, photoProfil, onEnregistrerPhotoProfil, enregistrementPhotoEnCours, erreurPhotoProfil, coins }) {\,
  \unction ModalProfil ({ ouvert, fermer, pseudo, distanceTotale, historiqueJoursPomodoro, photoProfil, onEnregistrerPhotoProfil, enregistrementPhotoEnCours, erreurPhotoProfil, coins, sessions, onReprendre }) {\
);

// 3. Update ModalProfil render block
c = c.replace(
  \          {ongletActif === 'stats' && <OngletStats />}
          {ongletActif === 'social' && <OngletSocial />}
          {ongletActif === 'parametres' && (\,
  \          {ongletActif === 'stats' && <OngletStats />}
          {ongletActif === 'social' && <OngletSocial />}
          {ongletActif === 'progression' && <OngletProgression distanceTotale={distanceTotale} />}
          {ongletActif === 'boutique' && <OngletBoutique coins={coins} />}
          {ongletActif === 'sessions' && <OngletSessions sessions={sessions} onReprendre={onReprendre} />}
          {ongletActif === 'parametres' && (\
);

// 4. Update App's ModalProfil call
c = c.replace(
  \<ModalProfil
      ouvert={profilOuvert}
      fermer={() => setProfilOuvert(false)}
      pseudo={pseudoJoueur}
      distanceTotale={distanceTotale}
      historiqueJoursPomodoro={historiqueJoursPomodoro}
      photoProfil={photoProfil}
      onEnregistrerPhotoProfil={enregistrerPhotoProfil}
      enregistrementPhotoEnCours={enregistrementPhotoEnCours}
      erreurPhotoProfil={erreurPhotoProfil}
      coins={coins}
    />\,
  \<ModalProfil
      ouvert={profilOuvert}
      fermer={() => setProfilOuvert(false)}
      pseudo={pseudoJoueur}
      distanceTotale={distanceTotale}
      historiqueJoursPomodoro={historiqueJoursPomodoro}
      photoProfil={photoProfil}
      onEnregistrerPhotoProfil={enregistrerPhotoProfil}
      enregistrementPhotoEnCours={enregistrementPhotoEnCours}
      erreurPhotoProfil={erreurPhotoProfil}
      coins={coins}
      sessions={sessionsSauvegardees}
      onReprendre={reprendreSession}
    />\
);

// 5. Add reprendreSession to App
c = c.replace(
  \  const gererClicJoueur = () => {\,
  \  const reprendreSession = (session) => {
    if (session.notes) {
      setTachesListe(session.notes);
    } else {
      setTachesListe([]);
    }
    setProfilOuvert(false);
  };

  const gererClicJoueur = () => {\
);

// 6. Append OngletSessions
c += '\\n\\n' + fs.readFileSync('OngletSessions.js', 'utf8');

fs.writeFileSync('src/App.jsx', c);
console.log('App.jsx updated successfully!');

