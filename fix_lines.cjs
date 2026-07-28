const fs = require("fs");
let lines = fs.readFileSync("src/App.jsx", "utf8").split("\n");

const sigIndex = lines.findIndex(l => l.includes("function ModalProfil ({ ouvert, fermer, pseudo, distanceTotale, historiqueJoursPomodoro, photoProfil, onEnregistrerPhotoProfil, enregistrementPhotoEnCours, erreurPhotoProfil, coins }) {"));
if (sigIndex !== -1) {
  lines[sigIndex] = "function ModalProfil ({ ouvert, fermer, pseudo, distanceTotale, historiqueJoursPomodoro, photoProfil, onEnregistrerPhotoProfil, enregistrementPhotoEnCours, erreurPhotoProfil, coins, sessions, onReprendre }) {";
}

const ongletsStart = lines.findIndex(l => l.includes("  const ONGLETS_PROFIL = ["));
if (ongletsStart !== -1) {
  lines.splice(ongletsStart, 6, 
    "  const ONGLETS_PROFIL = [",
    "    { id: 'profil', label: 'Profil' },",
    "    { id: 'stats', label: 'Stats' },",
    "    { id: 'social', label: 'Social' },",
    "    { id: 'progression', label: 'Progression' },",
    "    { id: 'boutique', label: 'Boutique' },",
    "    { id: 'sessions', label: 'Sessions' },",
    "    { id: 'parametres', label: 'Paramètres' },",
    "  ];"
  );
}

const renderIndex = lines.findIndex(l => l.includes("{ongletActif === 'stats' && <OngletStats />}"));
if (renderIndex !== -1) {
  lines.splice(renderIndex, 2,
    "          {ongletActif === 'stats' && <OngletStats />}",
    "          {ongletActif === 'social' && <OngletSocial />}",
    "          {ongletActif === 'progression' && <OngletProgression distanceTotale={distanceTotale} />}",
    "          {ongletActif === 'boutique' && <OngletBoutique coins={coins} />}",
    "          {ongletActif === 'sessions' && <OngletSessions sessions={sessions} onReprendre={onReprendre} />}"
  );
}

const callIndex = lines.findIndex(l => l.includes("erreurPhotoProfil={erreurPhotoProfil}"));
if (callIndex !== -1 && lines[callIndex - 1].includes("enregistrementPhotoEnCours")) {
  lines.splice(callIndex, 1,
    "      erreurPhotoProfil={erreurPhotoProfil}",
    "      coins={coins}",
    "      sessions={sessionsSauvegardees}",
    "      onReprendre={reprendreSession}"
  );
}

const appIndex = lines.findIndex(l => l.includes("function App() {"));
if (appIndex !== -1) {
  lines.splice(appIndex + 1, 0,
    "",
    "  const reprendreSession = (session) => {",
    "    if (session.notes) {",
    "      setTachesListe(session.notes);",
    "    } else {",
    "      setTachesListe([]);",
    "    }",
    "    setProfilOuvert(false);",
    "  };"
  );
}

fs.writeFileSync("src/App.jsx", lines.join("\n"));
