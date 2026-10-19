// --- Routes HTTP du Chat IA, branchées sur le serveur Vite (dev et preview) :
//   GET  /api/ia/modeles → fournisseurs configurés et modèles utilisables
//   POST /api/ia/chat    → { fournisseur, modele, messages } → réponse du modèle
// Seule l'application elle-même peut les appeler : JSON obligatoire (une page
// d'un autre site ne peut pas l'envoyer sans autorisation CORS) et même origine.

import { listerModeles, envoyerConversation, ErreurIa } from './serviceIa.js';

const TAILLE_MAX_CORPS = 256 * 1024;

const repondre = (res, statut, donnees) => {
  res.statusCode = statut;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(donnees));
};

const lireCorpsJson = (req) => new Promise((resoudre, rejeter) => {
  const morceaux = [];
  let taille = 0;
  req.on('data', (morceau) => {
    taille += morceau.length;
    if (taille > TAILLE_MAX_CORPS) {
      rejeter(new ErreurIa(413, 'trop_long', 'Conversation trop volumineuse.'));
      req.destroy();
      return;
    }
    morceaux.push(morceau);
  });
  req.on('end', () => {
    try {
      resoudre(JSON.parse(Buffer.concat(morceaux).toString('utf8') || '{}'));
    } catch {
      rejeter(new ErreurIa(400, 'requete_invalide', 'Corps JSON invalide.'));
    }
  });
  req.on('error', rejeter);
});

const memeOrigine = (req) => {
  const origine = req.headers.origin;
  if (!origine) return true;
  try {
    return new URL(origine).host === req.headers.host;
  } catch {
    return false;
  }
};

export function creerMiddlewareIa(env) {
  return async (req, res, next) => {
    const chemin = (req.url || '').split('?')[0];
    if (!chemin.startsWith('/api/ia/')) return next();
    try {
      if (!memeOrigine(req)) throw new ErreurIa(403, 'origine_refusee', 'Origine non autorisée.');
      if (chemin === '/api/ia/modeles' && req.method === 'GET') {
        return repondre(res, 200, await listerModeles(env));
      }
      if (chemin === '/api/ia/chat' && req.method === 'POST') {
        if (!String(req.headers['content-type'] || '').includes('application/json')) {
          throw new ErreurIa(415, 'requete_invalide', 'Format attendu : JSON.');
        }
        return repondre(res, 200, await envoyerConversation(env, await lireCorpsJson(req)));
      }
      throw new ErreurIa(404, 'introuvable', 'Route inconnue.');
    } catch (e) {
      if (!(e instanceof ErreurIa)) console.error('[api ia]', e);
      const erreur = e instanceof ErreurIa ? e : new ErreurIa(500, 'interne', 'Erreur interne du service IA.');
      return repondre(res, erreur.statut, { erreur: { code: erreur.code, message: erreur.message } });
    }
  };
}
