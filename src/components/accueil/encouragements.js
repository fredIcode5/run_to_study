// --- Écran d'accueil : réglage « Encouragements » (Mon Pomodoro) et signal de
// glisser-déposer vers l'espace de travail.
// Une citation = { texte, auteur } (auteur facultatif ; chaîne vide si inconnu).

import { POLICE_ACCUEIL_DEFAUT, trouverPoliceAccueil } from './policesAccueil';

// Les mécanismes de glisser existants (cartes de notes, bandes de documents)
// signalent le début et la fin d'un glisser vers l'espace de travail ; l'écran
// d'accueil s'efface dès le début du geste, sans attendre le dépôt.
export const EVENEMENT_GLISSER_ESPACE = 'pomodoroGlisserVersEspace';

export const signalerGlisserVersEspace = (enCours) => {
  window.dispatchEvent(new CustomEvent(EVENEMENT_GLISSER_ESPACE, { detail: { enCours } }));
};

export const CITATIONS_DEFAUT = [
  { texte: 'Un voyage de mille lieues commence toujours par un premier pas.', auteur: 'Lao Tseu' },
  { texte: 'Ce n\'est pas parce que les choses sont difficiles que nous n\'osons pas, c\'est parce que nous n\'osons pas qu\'elles sont difficiles.', auteur: 'Sénèque' },
  { texte: 'Il n\'y a point de vent favorable pour celui qui ne sait où il va.', auteur: 'Sénèque' },
  { texte: 'Rien ne sert de courir ; il faut partir à point.', auteur: 'Jean de La Fontaine' },
  { texte: 'Patience et longueur de temps font plus que force ni que rage.', auteur: 'Jean de La Fontaine' },
  { texte: 'Hâtez-vous lentement, et sans perdre courage.', auteur: 'Nicolas Boileau' },
  { texte: 'Vingt fois sur le métier remettez votre ouvrage.', auteur: 'Nicolas Boileau' },
  { texte: 'Le travail éloigne de nous trois grands maux : l\'ennui, le vice et le besoin.', auteur: 'Voltaire' },
  { texte: 'Nous sommes ce que nous faisons de manière répétée. L\'excellence n\'est donc pas un acte, mais une habitude.', auteur: 'Will Durant' },
  { texte: 'C\'est en forgeant qu\'on devient forgeron.', auteur: 'Proverbe' },
  { texte: 'Petit à petit, l\'oiseau fait son nid.', auteur: 'Proverbe' },
];

// Anciennes citations par défaut (sans auteur) : une liste encore identique à
// celle-ci est remplacée par les nouvelles citations par défaut
const ANCIENNES_CITATIONS_DEFAUT = [
  'Chaque petit pas te rapproche de ton objectif.',
  'Concentre-toi sur ce que tu peux accomplir aujourd\'hui.',
  'La régularité est plus puissante que la perfection.',
  'Tu n\'as pas besoin d\'aller vite, tu as besoin de continuer.',
  'Commence maintenant, améliore ensuite.',
  'Le plus dur, c\'est de commencer. Tu es là : c\'est fait.',
  'Une tâche à la fois, une victoire à la fois.',
  'La motivation suit l\'action, pas l\'inverse.',
  'Ton futur toi te remerciera pour cette séance.',
  'Respire. Tu as le temps de bien faire.',
  'Chaque séance terminée est une promesse tenue envers toi-même.',
  'Fais de ton mieux, puis accorde-toi une vraie pause.',
];

// Réglages d'affichage du bloc : décalage (px), échelle du texte, couleur du
// pseudo, police du message de bienvenue et de la citation
export const BORNES_AFFICHAGE_ACCUEIL = {
  x: { min: -500, max: 500 },
  y: { min: -300, max: 300 },
  taille: { min: 0.5, max: 2.5 },
};
export const AFFICHAGE_ACCUEIL_DEFAUT = { x: 0, y: 0, taille: 1, couleurPseudo: '#7289da', police: POLICE_ACCUEIL_DEFAUT };

const borner = (valeur, { min, max }, defaut) => {
  const n = Number(valeur);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut;
};

export const normaliserAffichageAccueil = (affichage) => ({
  x: borner(affichage?.x, BORNES_AFFICHAGE_ACCUEIL.x, 0),
  y: borner(affichage?.y, BORNES_AFFICHAGE_ACCUEIL.y, 0),
  taille: borner(affichage?.taille, BORNES_AFFICHAGE_ACCUEIL.taille, 1),
  couleurPseudo: /^#[0-9a-f]{6}$/i.test(affichage?.couleurPseudo || '')
    ? affichage.couleurPseudo.toLowerCase()
    : AFFICHAGE_ACCUEIL_DEFAUT.couleurPseudo,
  police: trouverPoliceAccueil(affichage?.police).id,
});

export const ENCOURAGEMENTS_DEFAUT = { actif: true, citations: CITATIONS_DEFAUT, affichage: AFFICHAGE_ACCUEIL_DEFAUT };

export const LONGUEUR_MAX_CITATION = 300;
export const LONGUEUR_MAX_AUTEUR = 80;
export const NOMBRE_MAX_CITATIONS = 500;

// Accepte un texte seul ou un objet { texte (ou citation), auteur } ; null si invalide
export const normaliserCitation = (valeur) => {
  const brut = typeof valeur === 'string' ? { texte: valeur } : valeur;
  const texte = typeof brut?.texte === 'string' ? brut.texte : brut?.citation;
  if (typeof texte !== 'string' || !texte.trim() || texte.trim().length > LONGUEUR_MAX_CITATION) return null;
  const auteur = typeof brut.auteur === 'string' ? brut.auteur.trim().slice(0, LONGUEUR_MAX_AUTEUR) : '';
  return { texte: texte.trim(), auteur };
};

const estAncienneListeParDefaut = (citations) => citations.length === ANCIENNES_CITATIONS_DEFAUT.length
  && citations.every((c, i) => c.texte === ANCIENNES_CITATIONS_DEFAUT[i] && !c.auteur);

// Réglage relu (stockage, compte) : toute valeur invalide retombe sur les valeurs par défaut
export const normaliserEncouragements = (valeur) => {
  const citations = Array.isArray(valeur?.citations)
    ? valeur.citations.map(normaliserCitation).filter(Boolean).slice(0, NOMBRE_MAX_CITATIONS)
    : [];
  return {
    actif: typeof valeur?.actif === 'boolean' ? valeur.actif : ENCOURAGEMENTS_DEFAUT.actif,
    citations: citations.length && !estAncienneListeParDefaut(citations) ? citations : CITATIONS_DEFAUT,
    affichage: normaliserAffichageAccueil(valeur?.affichage),
  };
};

/**
 * Valide le contenu d'un fichier JSON importé.
 * Format : { "citations": [ { "texte": "…", "auteur": "…" }, "texte seul", … ] }
 * @returns {{ citations: Array<{texte: string, auteur: string}> | null, erreur: string | null }}
 */
export function analyserFichierCitations(contenu) {
  const echec = (erreur) => ({ citations: null, erreur });
  let donnees;
  try {
    donnees = JSON.parse(contenu);
  } catch (e) {
    return echec(`Le fichier n'est pas un JSON valide (${e.message}).`);
  }
  if (!donnees || typeof donnees !== 'object' || Array.isArray(donnees) || !('citations' in donnees)) {
    return echec('Le fichier doit contenir un objet avec une clé « citations » : { "citations": [ … ] }.');
  }
  const { citations } = donnees;
  if (!Array.isArray(citations)) return echec('« citations » doit être une liste (tableau).');
  if (citations.length === 0) return echec('La liste « citations » est vide.');
  if (citations.length > NOMBRE_MAX_CITATIONS) return echec(`Trop de citations (${citations.length}) : ${NOMBRE_MAX_CITATIONS} au maximum.`);
  const normalisees = citations.map(normaliserCitation);
  const invalides = normalisees.map((c, i) => (c ? null : i + 1)).filter(Boolean);
  if (invalides.length) {
    const positions = invalides.slice(0, 5).join(', ') + (invalides.length > 5 ? '…' : '');
    return echec(`Entrée(s) invalide(s) à la position ${positions} : chaque citation doit être un texte non vide de ${LONGUEUR_MAX_CITATION} caractères au plus, ou un objet { "texte": "…", "auteur": "…" }.`);
  }
  return { citations: normalisees, erreur: null };
}

// Citation au hasard, différente de la précédente quand la liste le permet
export const choisirCitation = (citations, precedente) => {
  const liste = citations?.length ? citations : CITATIONS_DEFAUT;
  if (liste.length === 1) return liste[0];
  const candidates = liste.filter((c) => c.texte !== precedente?.texte);
  return candidates[Math.floor(Math.random() * candidates.length)];
};

// Mode invité : réglage gardé dans ce navigateur
const CLE_LOCALE = 'encouragements';

export const lireEncouragementsLocaux = () => {
  try {
    return normaliserEncouragements(JSON.parse(localStorage.getItem(CLE_LOCALE) || 'null'));
  } catch {
    return ENCOURAGEMENTS_DEFAUT;
  }
};

export const ecrireEncouragementsLocaux = (encouragements) => {
  try {
    localStorage.setItem(CLE_LOCALE, JSON.stringify(encouragements));
  } catch {
    // stockage indisponible : le réglage reste actif pour la session
  }
};
