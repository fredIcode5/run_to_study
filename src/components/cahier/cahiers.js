// --- Cahiers de session : un cahier de notes libre par session Pomodoro.
// Cahier = { sessionId, contenu, dateCreation, dateModification } ; il est lié
// à sa session par l'identifiant stable de celle-ci (« session_<horodatage> »),
// le même que celui de la session une fois archivée dans l'historique.

export const nouvelIdSession = () => `session_${Date.now()}`;

const estIdSession = (valeur) => typeof valeur === 'string' && /^session_\d+$/.test(valeur);

export const normaliserCahier = (brut) => {
  if (!brut || !estIdSession(brut.sessionId)) return null;
  const maintenant = new Date().toISOString();
  return {
    sessionId: brut.sessionId,
    contenu: typeof brut.contenu === 'string' ? brut.contenu : '',
    dateCreation: typeof brut.dateCreation === 'string' ? brut.dateCreation : maintenant,
    dateModification: typeof brut.dateModification === 'string' ? brut.dateModification : maintenant,
  };
};

// Mode invité : session en cours et cahiers gardés dans ce navigateur
const CLE_SESSION_ACTIVE = 'sessionActive';
const CLE_CAHIERS = 'cahiersSessions';

export const lireSessionActiveLocale = () => {
  try {
    const id = localStorage.getItem(CLE_SESSION_ACTIVE);
    return estIdSession(id) ? id : null;
  } catch {
    return null;
  }
};

export const ecrireSessionActiveLocale = (id) => {
  try {
    localStorage.setItem(CLE_SESSION_ACTIVE, id);
  } catch {
    // stockage indisponible : la session vit le temps de l'onglet
  }
};

// Copie locale des cahiers : seule source pour l'invité, copie de secours pour
// un compte (une par compte), pour que le cahier reste utilisable même si
// Firestore ne répond pas
const cleLocale = (idCompte) => (idCompte ? `${CLE_CAHIERS}:${idCompte}` : CLE_CAHIERS);

const lireMagasinLocal = (idCompte) => {
  try {
    const brut = JSON.parse(localStorage.getItem(cleLocale(idCompte)) || '{}');
    return brut && typeof brut === 'object' && !Array.isArray(brut) ? brut : {};
  } catch {
    return {};
  }
};

export const lireCahiersLocaux = (idCompte = null) => Object.values(lireMagasinLocal(idCompte)).map(normaliserCahier).filter(Boolean);

// Renvoie true si l'enregistrement a réussi
export const ecrireCahierLocal = (cahier, idCompte = null) => {
  try {
    const magasin = lireMagasinLocal(idCompte);
    magasin[cahier.sessionId] = cahier;
    localStorage.setItem(cleLocale(idCompte), JSON.stringify(magasin));
    return true;
  } catch {
    return false;
  }
};

// Réunit deux listes de cahiers : pour une même session, le plus récemment modifié
export const fusionnerCahiers = (...listes) => {
  const parSession = {};
  listes.flat().forEach((c) => {
    if (!parSession[c.sessionId] || parSession[c.sessionId].dateModification < c.dateModification) parSession[c.sessionId] = c;
  });
  return Object.values(parSession);
};

// Premières lignes non vides du cahier, pour l'historique
export const apercuCahier = (contenu, longueur = 140) => {
  const texte = contenu.split('\n').map((ligne) => ligne.trim()).filter(Boolean).join(' · ');
  return texte.length > longueur ? `${texte.slice(0, longueur - 1)}…` : texte;
};

export const compterMots = (contenu) => (contenu.match(/\S+/g) || []).length;

const formaterDate = (iso) => new Date(iso).toLocaleDateString();
const formaterHeure = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Session d'un cahier : celle de l'historique si elle y figure, sinon des
// informations reconstituées depuis l'identifiant (date de début de la session)
export const decrireSessionDuCahier = (sessionId, sessionsArchivees) => {
  const archivee = sessionsArchivees.find((s) => s.id === sessionId);
  if (archivee) return { titre: archivee.titre, numero: archivee.numero, date: archivee.date, heure: archivee.heure };
  const debut = new Date(Number(sessionId.split('_')[1]) || Date.now()).toISOString();
  return { titre: `Session du ${formaterDate(debut)}`, numero: null, date: formaterDate(debut), heure: formaterHeure(debut) };
};

// Historique des notes : cahiers non vides des sessions passées (hors session en cours)
export const listerCahiersHistorique = (cahiers, sessionsArchivees, idSessionActive) => Object.values(cahiers)
  .filter((c) => c.sessionId !== idSessionActive && c.contenu.trim())
  .map((c) => ({
    ...decrireSessionDuCahier(c.sessionId, sessionsArchivees),
    sessionId: c.sessionId,
    contenu: c.contenu,
    apercu: apercuCahier(c.contenu),
    dateModification: c.dateModification,
    modifieLe: `${formaterDate(c.dateModification)} ${formaterHeure(c.dateModification)}`,
  }));
