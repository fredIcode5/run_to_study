// --- Chat IA côté navigateur : dialogue avec le serveur de l'application
// (/api/ia/*, voir server/ia). Le navigateur ne connaît ni les clés API ni les
// adresses des fournisseurs ; il reçoit des messages d'erreur prêts à afficher.

export class ErreurClientIa extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const SERVICE_ABSENT = 'Le service Chat IA n\'est pas disponible sur ce serveur : il fonctionne avec « npm run dev » ou « npm run preview » (voir .env.example).';

const lireReponse = async (reponse) => {
  let donnees = null;
  try {
    donnees = await reponse.json();
  } catch {
    donnees = null;
  }
  if (!reponse.ok) {
    if (!donnees?.erreur) {
      throw new ErreurClientIa(reponse.status === 404 ? 'service_absent' : 'erreur', reponse.status === 404 ? SERVICE_ABSENT : `Erreur ${reponse.status} du service IA.`);
    }
    throw new ErreurClientIa(donnees.erreur.code, donnees.erreur.message);
  }
  // Hébergement statique : la route renvoie la page de l'application, pas du JSON
  if (!donnees || typeof donnees !== 'object') throw new ErreurClientIa('service_absent', SERVICE_ABSENT);
  return donnees;
};

const appeler = async (chemin, options) => {
  try {
    return await lireReponse(await fetch(chemin, options));
  } catch (e) {
    if (e instanceof ErreurClientIa || e?.name === 'AbortError') throw e;
    throw new ErreurClientIa('reseau', 'Le serveur de l\'application est injoignable. Vérifie ta connexion puis réessaie.');
  }
};

// { fournisseurs: [{ id, nom, modeles: [{ id, nom, gratuit }], payantsMasques, erreur? }] }
export const chargerModelesIa = async () => {
  const donnees = await appeler('/api/ia/modeles', { headers: { Accept: 'application/json' } });
  if (!Array.isArray(donnees.fournisseurs)) throw new ErreurClientIa('service_absent', SERVICE_ABSENT);
  return donnees;
};

// messages : [{ role: 'user' | 'assistant', contenu }] → { contenu, tronquee, fournisseur, modele }
export const envoyerMessagesIa = ({ fournisseur, modele, messages, signal }) => appeler('/api/ia/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ fournisseur, modele, messages }),
  signal,
});
