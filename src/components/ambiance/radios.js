// --- Radios : listes de sources YouTube (playlists et/ou vidéos) créées par
// l'utilisateur, lues à la suite par le lecteur de musique existant.
// Une radio = { id, nom, elements: [{ id, type: 'playlist' | 'video', youtubeId, lien }] }

import { extraireIdYoutube } from '../../utils/helpers';

// Commandes envoyées au lecteur YouTube unique (LecteurProfilMusique)
export const EVENEMENT_COMMANDE_MUSIQUE = 'pomodoroMusiqueCommande';
// Progression remontée par ce lecteur (temps écoulé / durée de la piste)
export const EVENEMENT_PROGRESSION_MUSIQUE = 'pomodoroMusiqueProgression';

export const envoyerCommandeMusique = (action, details = {}) => {
  window.dispatchEvent(new CustomEvent(EVENEMENT_COMMANDE_MUSIQUE, { detail: { action, ...details } }));
};

export const miniatureYoutube = (videoId, qualite = 'hqdefault') => (
  videoId ? `https://img.youtube.com/vi/${videoId}/${qualite}.jpg` : null
);

export const genererIdRadio = () => `radio_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const genererIdElement = () => `src_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * Analyse un lien collé par l'utilisateur.
 * @returns {{ element: object|null, erreur: string|null }}
 */
export function analyserLienRadio(lien) {
  const texte = (lien || '').trim();
  if (!texte) return { element: null, erreur: 'Colle un lien YouTube.' };

  let url;
  try {
    url = new URL(texte);
  } catch {
    return { element: null, erreur: 'Ce n\'est pas un lien valide (il doit commencer par https://).' };
  }

  const hote = url.hostname.replace(/^www\./, '');
  if (hote.endsWith('spotify.com')) {
    // Aucune lecture Spotify réelle n'est intégrée à l'application : on refuse
    // plutôt que de simuler une lecture qui n'aurait pas lieu
    return {
      element: null,
      erreur: 'Les liens Spotify ne peuvent pas être lus ici : l\'application n\'a pas accès à la lecture Spotify. Utilise une playlist ou une vidéo YouTube.',
    };
  }
  if (!['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(hote)) {
    return { element: null, erreur: 'Seuls les liens YouTube (playlist ou vidéo) sont pris en charge.' };
  }

  // Un lien « watch?v=…&list=… » ouvre la playlist entière
  const liste = url.searchParams.get('list');
  if (liste) {
    if (liste === 'WL' || liste === 'LL') {
      return { element: null, erreur: 'Cette playlist est privée (« À regarder plus tard » ou « J\'aime ») : YouTube ne permet pas de la lire ici.' };
    }
    return { element: { id: genererIdElement(), type: 'playlist', youtubeId: liste, lien: texte }, erreur: null };
  }

  const videoId = extraireIdYoutube(texte)
    || url.pathname.match(/^\/(?:shorts|live)\/([^/?]+)/)?.[1]
    || null;
  if (videoId) return { element: { id: genererIdElement(), type: 'video', youtubeId: videoId, lien: texte }, erreur: null };

  return { element: null, erreur: 'Lien YouTube non reconnu : utilise le lien d\'une playlist (…list=…) ou d\'une vidéo.' };
}

const normaliserElement = (e) => (
  e && (e.type === 'playlist' || e.type === 'video') && typeof e.youtubeId === 'string' && e.youtubeId
    ? { id: e.id || genererIdElement(), type: e.type, youtubeId: e.youtubeId, lien: e.lien || '' }
    : null
);

export const normaliserRadios = (radios) => (Array.isArray(radios) ? radios : [])
  .filter((r) => r && typeof r.nom === 'string')
  .map((r) => ({
    id: r.id || genererIdRadio(),
    nom: r.nom,
    elements: (Array.isArray(r.elements) ? r.elements : []).map(normaliserElement).filter(Boolean),
  }));

// Mode invité : les radios sont gardées dans ce navigateur
const CLE_LOCALE = 'radiosMusique';

export const lireRadiosLocales = () => {
  try {
    return normaliserRadios(JSON.parse(localStorage.getItem(CLE_LOCALE) || '[]'));
  } catch {
    return [];
  }
};

export const ecrireRadiosLocales = (radios) => {
  try {
    localStorage.setItem(CLE_LOCALE, JSON.stringify(radios));
  } catch {
    // stockage indisponible : les radios restent disponibles pour la session
  }
};
