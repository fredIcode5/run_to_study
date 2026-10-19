// --- Couche de communication avec les fournisseurs de modèles de langage.
// S'exécute uniquement côté serveur : les clés API (variables d'environnement)
// ne sont jamais transmises au navigateur. Le client ne voit que des
// fournisseurs, des modèles et des messages d'erreur rédigés pour l'utilisateur.

import { FOURNISSEURS_IA } from './fournisseurs.js';

const DELAI_REPONSE_MS = 60000;
const DELAI_LISTE_MS = 15000;
const DUREE_CACHE_MODELES_MS = 10 * 60 * 1000;
const MAX_MODELES_DYNAMIQUES = 25;
// Limites d'une requête de conversation
const MAX_MESSAGES = 60;
const MAX_CARACTERES_MESSAGE = 12000;

const CONSIGNE_SYSTEME = 'Tu es l\'assistant du Chat IA d\'une application Pomodoro. '
  + 'Réponds de façon claire et concise, en français sauf si l\'utilisateur écrit dans une autre langue.';

export class ErreurIa extends Error {
  constructor(statut, code, message) {
    super(message);
    this.statut = statut;
    this.code = code;
  }
}

const cleDe = (env, fournisseur) => String(env[fournisseur.cleEnv] || '').trim();
const payantsAutorises = (env) => String(env.IA_MODELES_PAYANTS || '').trim().toLowerCase() === 'true';

// Message d'erreur renvoyé par le fournisseur ({ error: { message } } ou [{ error }])
const messageFournisseur = (donnees) => {
  const erreur = (Array.isArray(donnees) ? donnees[0] : donnees)?.error;
  const message = typeof erreur === 'string' ? erreur : erreur?.message;
  return typeof message === 'string' ? message.trim().slice(0, 300) : '';
};

const erreurFournisseur = (fournisseur, statut, donnees, attente) => {
  const detail = messageFournisseur(donnees);
  const precision = detail ? ` (${detail})` : '';
  if (statut === 429) {
    const secondes = Number(attente);
    const quand = Number.isFinite(secondes) && secondes > 0 ? `dans ${Math.ceil(secondes)} s` : 'dans un moment';
    return new ErreurIa(429, 'quota', `Limite d'utilisation atteinte chez ${fournisseur.nom} (quota ou débit du niveau gratuit). Réessaie ${quand} ou choisis un autre modèle.`);
  }
  if (statut === 401 || statut === 403 || (statut === 400 && /api[ _-]?key/i.test(detail))) {
    return new ErreurIa(502, 'cle_refusee', `Clé API refusée par ${fournisseur.nom} : vérifie ${fournisseur.cleEnv} dans le fichier .env.${precision}`);
  }
  if (statut === 402) return new ErreurIa(402, 'credit', `${fournisseur.nom} demande des crédits pour utiliser ce modèle.${precision}`);
  if (statut === 404) return new ErreurIa(404, 'modele_indisponible', `Ce modèle n'est pas disponible chez ${fournisseur.nom}.${precision}`);
  if (statut >= 500) return new ErreurIa(502, 'fournisseur_indisponible', `${fournisseur.nom} rencontre un problème temporaire (${statut}). Réessaie dans un moment.`);
  return new ErreurIa(502, 'requete_refusee', `${fournisseur.nom} a refusé la requête (${statut}).${precision}`);
};

// Appel HTTP vers un fournisseur au format OpenAI, avec délai maximal
const appelerFournisseur = async (fournisseur, cle, chemin, { methode = 'GET', corps, delai = DELAI_REPONSE_MS } = {}) => {
  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), delai);
  try {
    const reponse = await fetch(`${fournisseur.urlBase}${chemin}`, {
      method: methode,
      headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json', ...fournisseur.entetes },
      body: corps ? JSON.stringify(corps) : undefined,
      signal: controleur.signal,
    });
    const texte = await reponse.text();
    let donnees = null;
    try {
      donnees = texte ? JSON.parse(texte) : null;
    } catch {
      donnees = null;
    }
    if (!reponse.ok) throw erreurFournisseur(fournisseur, reponse.status, donnees, reponse.headers.get('retry-after'));
    return donnees;
  } catch (e) {
    if (e instanceof ErreurIa) throw e;
    if (e?.name === 'AbortError') throw new ErreurIa(504, 'delai', `${fournisseur.nom} n'a pas répondu à temps. Réessaie.`);
    throw new ErreurIa(502, 'reseau', `Impossible de joindre ${fournisseur.nom} (${e?.message || 'erreur réseau'}).`);
  } finally {
    clearTimeout(minuterie);
  }
};

// --- Adaptateurs : un par format d'API. Le format « chat completions » d'OpenAI
// est partagé par Gemini (couche de compatibilité), Groq, OpenRouter et OpenAI.
const ADAPTATEURS = {
  compatibleOpenAI: {
    listerIds: async (fournisseur, cle) => {
      const donnees = await appelerFournisseur(fournisseur, cle, '/models', { delai: DELAI_LISTE_MS });
      return { ids: new Set((donnees?.data || []).map((m) => String(m.id || '').replace(/^models\//, ''))), brut: donnees };
    },
    repondre: async (fournisseur, cle, modele, messages) => {
      const donnees = await appelerFournisseur(fournisseur, cle, '/chat/completions', {
        methode: 'POST',
        corps: {
          model: modele,
          messages: [
            { role: 'system', content: CONSIGNE_SYSTEME },
            ...messages.map((m) => ({ role: m.role, content: m.contenu })),
          ],
        },
      });
      const choix = donnees?.choices?.[0];
      const contenu = Array.isArray(choix?.message?.content)
        ? choix.message.content.map((partie) => partie?.text || '').join('')
        : choix?.message?.content;
      if (typeof contenu !== 'string' || !contenu.trim()) {
        throw new ErreurIa(502, 'reponse_vide', choix?.finish_reason === 'content_filter'
          ? `${fournisseur.nom} a bloqué la réponse (filtre de contenu).`
          : `${fournisseur.nom} a renvoyé une réponse vide. Réessaie ou change de modèle.`);
      }
      return { contenu, tronquee: choix?.finish_reason === 'length' };
    },
  },
};

// Modèles utilisables avec la clé : ceux de la configuration présents dans la
// liste du fournisseur, ou ses modèles gratuits pour un catalogue dynamique
const modelesUtilisables = async (fournisseur, cle, env) => {
  const { ids, brut } = await ADAPTATEURS[fournisseur.adaptateur].listerIds(fournisseur, cle);
  if (fournisseur.modelesGratuitsDynamiques) {
    const modeles = (brut?.data || [])
      .filter((m) => String(m.id).endsWith(':free') && Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0)
      .filter((m) => !m.architecture?.output_modalities || m.architecture.output_modalities.includes('text'))
      .map((m) => ({ id: m.id, nom: String(m.name || m.id).replace(/\s*\(free\)\s*$/i, ''), gratuit: true }))
      .sort((a, b) => a.nom.localeCompare(b.nom))
      .slice(0, MAX_MODELES_DYNAMIQUES);
    return { modeles, payantsMasques: 0 };
  }
  const presents = fournisseur.modeles.filter((m) => ids.has(m.id));
  const modeles = presents.filter((m) => m.gratuit || payantsAutorises(env));
  return { modeles, payantsMasques: presents.length - modeles.length };
};

const cacheModeles = new Map();

// Fournisseurs configurés (clé définie) et leurs modèles réellement utilisables
export const listerModeles = async (env) => {
  const configures = FOURNISSEURS_IA.filter((f) => cleDe(env, f));
  const fournisseurs = await Promise.all(configures.map(async (f) => {
    const cle = cleDe(env, f);
    const enCache = cacheModeles.get(f.id);
    if (enCache && enCache.cle === cle && enCache.expire > Date.now()) return enCache.resultat;
    try {
      const resultat = { id: f.id, nom: f.nom, ...(await modelesUtilisables(f, cle, env)) };
      cacheModeles.set(f.id, { cle, expire: Date.now() + DUREE_CACHE_MODELES_MS, resultat });
      return resultat;
    } catch (e) {
      return { id: f.id, nom: f.nom, modeles: [], payantsMasques: 0, erreur: e instanceof ErreurIa ? e.message : 'Liste des modèles indisponible.' };
    }
  }));
  return { fournisseurs };
};

const validerMessages = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) throw new ErreurIa(400, 'requete_invalide', 'La conversation est vide.');
  const valides = messages.slice(-MAX_MESSAGES).map((m) => {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.contenu !== 'string' || !m.contenu.trim()) {
      throw new ErreurIa(400, 'requete_invalide', 'Message invalide dans la conversation.');
    }
    if (m.contenu.length > MAX_CARACTERES_MESSAGE) {
      throw new ErreurIa(413, 'trop_long', `Un message dépasse ${MAX_CARACTERES_MESSAGE} caractères.`);
    }
    return { role: m.role, contenu: m.contenu };
  });
  if (valides[valides.length - 1].role !== 'user') throw new ErreurIa(400, 'requete_invalide', 'Le dernier message doit venir de l\'utilisateur.');
  // Alternance attendue par certains fournisseurs : la conversation commence par
  // l'utilisateur, et deux messages consécutifs du même auteur sont réunis
  // (message renvoyé après une erreur, par exemple)
  while (valides[0].role !== 'user') valides.shift();
  return valides.reduce((alternes, m) => {
    const precedent = alternes[alternes.length - 1];
    if (precedent?.role === m.role) precedent.contenu = `${precedent.contenu}\n\n${m.contenu}`;
    else alternes.push({ ...m });
    return alternes;
  }, []);
};

// Envoie la conversation au modèle choisi et renvoie sa réponse
export const envoyerConversation = async (env, demande) => {
  const fournisseur = FOURNISSEURS_IA.find((f) => f.id === demande?.fournisseur);
  if (!fournisseur) throw new ErreurIa(400, 'fournisseur_inconnu', 'Fournisseur inconnu.');
  const cle = cleDe(env, fournisseur);
  if (!cle) {
    throw new ErreurIa(503, 'non_configure', `${fournisseur.nom} n'est pas configuré : ajoute ${fournisseur.cleEnv} dans le fichier .env puis relance le serveur.`);
  }
  const messages = validerMessages(demande.messages);
  const { fournisseurs } = await listerModeles(env);
  const disponible = fournisseurs.find((f) => f.id === fournisseur.id);
  if (disponible?.erreur) throw new ErreurIa(502, 'liste_indisponible', disponible.erreur);
  const modele = disponible?.modeles.find((m) => m.id === demande.modele);
  if (!modele) throw new ErreurIa(400, 'modele_indisponible', 'Ce modèle n\'est pas disponible avec la configuration actuelle.');
  const reponse = await ADAPTATEURS[fournisseur.adaptateur].repondre(fournisseur, cle, modele.id, messages);
  return { ...reponse, fournisseur: fournisseur.id, modele: modele.id };
};
