import { useState, useEffect, useRef, useCallback } from 'react';
import { chargerCahiers, sauvegarderCahier } from '../../lib/firebaseDataService';
import { normaliserCahier, lireCahiersLocaux, ecrireCahierLocal, fusionnerCahiers } from './cahiers';

// Délai sans frappe avant l'enregistrement automatique
const DELAI_ENREGISTREMENT_MS = 800;

const indexer = (liste) => Object.fromEntries(liste.map((c) => [c.sessionId, c]));
const idCompteDe = (cible) => (cible === 'invite' ? null : cible.slice('compte:'.length));

// --- Un cahier par session. Invité : gardés dans ce navigateur. Compte :
// Firestore, avec une copie dans ce navigateur, si bien que le cahier reste
// toujours utilisable, même si Firestore refuse ou ne répond pas. Chaque
// modification est enregistrée automatiquement après un court délai ;
// etats[sessionId] suit l'enregistrement : 'modifie' (en attente),
// 'enregistrement', 'enregistre', 'local' (compte injoignable : gardé sur cet
// appareil) ou 'erreur'. Une modification en attente est
// toujours enregistrée dans le compte où elle a été faite, même après un
// changement de compte, et un départ de la page est signalé tant qu'elle n'est
// pas sauvegardée.
function useCahiers({ connecte, idUtilisateur }) {
  const cible = connecte && idUtilisateur ? `compte:${idUtilisateur}` : 'invite';
  const [cahiers, setCahiers] = useState({});
  const [etats, setEtats] = useState({});
  const [chargePour, setChargePour] = useState(null);
  // Compte : Firestore n'a pas répondu au chargement (copie locale seule)
  const [synchroIndisponible, setSynchroIndisponible] = useState(false);
  const cahiersRef = useRef(cahiers);
  cahiersRef.current = cahiers;
  // sessionId → { minuterie, cahier, cible } ; nombre d'enregistrements en cours
  const enAttenteRef = useRef(new Map());
  const enCoursRef = useRef(0);

  const enregistrer = useCallback(async (cahier, cibleCahier) => {
    setEtats((e) => ({ ...e, [cahier.sessionId]: 'enregistrement' }));
    enCoursRef.current += 1;
    const idCompte = idCompteDe(cibleCahier);
    const local = ecrireCahierLocal(cahier, idCompte);
    const compte = idCompte ? await sauvegarderCahier(idCompte, cahier) : local;
    enCoursRef.current -= 1;
    // Une frappe plus récente attend déjà : son propre enregistrement donnera l'état
    if (enAttenteRef.current.has(cahier.sessionId)) return;
    setEtats((e) => ({ ...e, [cahier.sessionId]: compte ? 'enregistre' : local ? 'local' : 'erreur' }));
  }, []);

  const viderEnAttente = useCallback(() => {
    enAttenteRef.current.forEach(({ minuterie, cahier, cible: cibleCahier }) => {
      clearTimeout(minuterie);
      enregistrer(cahier, cibleCahier);
    });
    enAttenteRef.current.clear();
  }, [enregistrer]);

  // Chargement à chaque changement de compte (les modifications en attente du
  // compte précédent sont d'abord enregistrées)
  useEffect(() => {
    let annule = false;
    setCahiers({});
    setEtats({});
    setSynchroIndisponible(false);
    // Copie locale tout de suite : on peut écrire sans attendre le compte
    const idCompte = idCompteDe(cible);
    setCahiers(indexer(lireCahiersLocaux(idCompte)));
    setChargePour(cible);
    if (idCompte) {
      chargerCahiers(idCompte).then((liste) => {
        if (annule) return;
        if (!liste) {
          setSynchroIndisponible(true);
          return;
        }
        // Pour chaque session, la version la plus récente (compte ou cet appareil)
        setCahiers((actuels) => indexer(fusionnerCahiers(Object.values(actuels), liste.map(normaliserCahier).filter(Boolean))));
      });
    }
    return () => {
      annule = true;
      viderEnAttente();
    };
  }, [cible, viderEnAttente]);

  // Départ de la page : enregistre tout de suite, et demande confirmation tant
  // qu'un enregistrement vers le compte n'est pas terminé
  useEffect(() => {
    const avantDepart = (e) => {
      const nonEnregistre = enAttenteRef.current.size > 0 || enCoursRef.current > 0;
      viderEnAttente();
      if (nonEnregistre) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const pageMasquee = () => {
      if (document.visibilityState === 'hidden') viderEnAttente();
    };
    window.addEventListener('beforeunload', avantDepart);
    document.addEventListener('visibilitychange', pageMasquee);
    return () => {
      window.removeEventListener('beforeunload', avantDepart);
      document.removeEventListener('visibilitychange', pageMasquee);
    };
  }, [viderEnAttente]);

  const modifierCahier = (sessionId, contenu) => {
    const maintenant = new Date().toISOString();
    const cahier = {
      sessionId,
      contenu,
      dateCreation: cahiersRef.current[sessionId]?.dateCreation || maintenant,
      dateModification: maintenant,
    };
    setCahiers((c) => ({ ...c, [sessionId]: cahier }));
    setEtats((e) => ({ ...e, [sessionId]: 'modifie' }));
    clearTimeout(enAttenteRef.current.get(sessionId)?.minuterie);
    const minuterie = setTimeout(() => {
      enAttenteRef.current.delete(sessionId);
      enregistrer(cahier, cible);
    }, DELAI_ENREGISTREMENT_MS);
    enAttenteRef.current.set(sessionId, { minuterie, cahier, cible });
  };

  // Nouvel essai après une erreur d'enregistrement
  const reessayer = (sessionId) => {
    const cahier = cahiersRef.current[sessionId];
    if (cahier) enregistrer(cahier, cible);
  };

  return {
    cahiers,
    etats,
    charge: chargePour === cible,
    synchroIndisponible,
    modifierCahier,
    reessayer,
  };
}

export default useCahiers;
