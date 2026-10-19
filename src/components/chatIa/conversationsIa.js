// --- Conversations du Chat IA, distinctes des cahiers et des documents.
// Conversation = { id, titre, fournisseur, modele, messages, dateCreation, dateModification }
//   fournisseur / modele : dernier modèle utilisé dans la conversation
// Message = { id, role: 'user' | 'assistant', contenu, date, fournisseur?, modele?, tronquee? }
//   (fournisseur et modèle sur chaque réponse : on peut changer de modèle en cours de route)

const LONGUEUR_TITRE = 60;
// Un document Firestore est limité à 1 Mo : les plus anciens messages sont
// retirés au-delà de cette taille (la conversation reste lisible, tronquée)
const TAILLE_MAX_CONVERSATION = 700000;
const NOMBRE_MAX_CONVERSATIONS_LOCALES = 30;

export const genererIdIa = (prefixe) => `${prefixe}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const titreDepuisMessage = (texte) => {
  const ligne = texte.replace(/\s+/g, ' ').trim();
  return ligne.length > LONGUEUR_TITRE ? `${ligne.slice(0, LONGUEUR_TITRE - 1)}…` : ligne;
};

export const creerConversation = (texte, fournisseur, modele) => {
  const maintenant = new Date().toISOString();
  return {
    id: genererIdIa('conv'),
    titre: titreDepuisMessage(texte),
    fournisseur,
    modele,
    messages: [],
    dateCreation: maintenant,
    dateModification: maintenant,
  };
};

export const limiterConversation = (conversation) => {
  let { messages } = conversation;
  while (messages.length > 2 && JSON.stringify(messages).length > TAILLE_MAX_CONVERSATION) {
    messages = messages.slice(1);
  }
  return messages === conversation.messages ? conversation : { ...conversation, messages };
};

const normaliserMessage = (m) => (m && (m.role === 'user' || m.role === 'assistant') && typeof m.contenu === 'string'
  ? { ...m, id: m.id || genererIdIa('msg') }
  : null);

export const normaliserConversation = (brut) => {
  if (!brut || typeof brut.id !== 'string' || !Array.isArray(brut.messages)) return null;
  return {
    id: brut.id,
    titre: typeof brut.titre === 'string' && brut.titre ? brut.titre : 'Conversation',
    fournisseur: brut.fournisseur || null,
    modele: brut.modele || null,
    messages: brut.messages.map(normaliserMessage).filter(Boolean),
    dateCreation: brut.dateCreation || new Date().toISOString(),
    dateModification: brut.dateModification || brut.dateCreation || new Date().toISOString(),
  };
};

export const trierConversations = (liste) => liste.slice().sort((a, b) => (a.dateModification < b.dateModification ? 1 : -1));

// Mode invité : conversations gardées dans ce navigateur (les plus récentes)
const CLE_LOCALE = 'conversationsIa';

export const lireConversationsLocales = () => {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_LOCALE) || '[]');
    return Array.isArray(brut) ? brut.map(normaliserConversation).filter(Boolean) : [];
  } catch {
    return [];
  }
};

// Renvoie true si l'enregistrement a réussi ; en cas de stockage plein, les
// conversations les plus anciennes sont abandonnées une à une
export const ecrireConversationsLocales = (conversations) => {
  let liste = trierConversations(conversations).slice(0, NOMBRE_MAX_CONVERSATIONS_LOCALES);
  while (liste.length > 0) {
    try {
      localStorage.setItem(CLE_LOCALE, JSON.stringify(liste));
      return true;
    } catch {
      liste = liste.slice(0, -1);
    }
  }
  return false;
};

// Modèle choisi en dernier, retrouvé à la prochaine ouverture
const CLE_SELECTION = 'chatIaModele';

export const lireSelectionModele = () => {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_SELECTION) || 'null');
    return brut?.fournisseur && brut?.modele ? { fournisseur: brut.fournisseur, modele: brut.modele } : null;
  } catch {
    return null;
  }
};

export const ecrireSelectionModele = (selection) => {
  try {
    localStorage.setItem(CLE_SELECTION, JSON.stringify(selection));
  } catch {
    // préférence de confort : sans stockage, le premier modèle est repris
  }
};
