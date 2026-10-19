import { useState, useEffect, useRef, useCallback } from 'react';
import { chargerModelesIa, envoyerMessagesIa } from '../../lib/clientIa';
import { chargerConversationsIa, sauvegarderConversationIa, supprimerConversationIa } from '../../lib/firebaseDataService';
import {
  genererIdIa,
  creerConversation,
  limiterConversation,
  normaliserConversation,
  trierConversations,
  lireConversationsLocales,
  ecrireConversationsLocales,
  lireSelectionModele,
  ecrireSelectionModele,
} from './conversationsIa';

export const LONGUEUR_MAX_MESSAGE = 12000;

// --- État du Chat IA : catalogue des modèles (fourni par le serveur), modèle
// choisi, conversations (compte : Firestore ; invité : ce navigateur), brouillon
// et génération en cours. Vit dans App : fermer la fenêtre ou changer de
// session ne perd ni la conversation ni le message en cours de rédaction.
function useChatIa({ connecte, idUtilisateur }) {
  const cible = connecte && idUtilisateur ? idUtilisateur : null;
  const cibleRef = useRef(cible);
  cibleRef.current = cible;

  // etat : 'inactif' (pas encore demandé) | 'chargement' | 'pret' | 'erreur'
  const [catalogue, setCatalogue] = useState({ etat: 'inactif', fournisseurs: [], erreur: null });
  const [selection, setSelection] = useState(lireSelectionModele);
  const [conversations, setConversations] = useState([]);
  const [idActive, setIdActive] = useState(null);
  const [brouillon, setBrouillon] = useState('');
  const [generation, setGeneration] = useState(null); // { conversationId } pendant l'attente
  const [erreurs, setErreurs] = useState({}); // conversationId → { code, message } (non enregistré)
  const [erreurStockage, setErreurStockage] = useState(null);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const controleurRef = useRef(null);

  // Modèles proposés : uniquement ceux que le serveur déclare utilisables
  const modeles = catalogue.fournisseurs.flatMap((f) => f.modeles.map((m) => ({ ...m, fournisseur: f.id, nomFournisseur: f.nom })));
  const modeleChoisi = modeles.find((m) => m.fournisseur === selection?.fournisseur && m.id === selection?.modele) || modeles[0] || null;

  const chargerCatalogue = useCallback(async () => {
    setCatalogue((c) => ({ ...c, etat: 'chargement', erreur: null }));
    try {
      const { fournisseurs } = await chargerModelesIa();
      setCatalogue({ etat: 'pret', fournisseurs, erreur: null });
    } catch (e) {
      setCatalogue({ etat: 'erreur', fournisseurs: [], erreur: e.message });
    }
  }, []);

  const arreterGeneration = () => {
    controleurRef.current?.abort();
    controleurRef.current = null;
    setGeneration(null);
  };

  // Conversations du compte (ou de l'invité), rechargées à chaque changement de compte
  useEffect(() => {
    let annule = false;
    controleurRef.current?.abort();
    controleurRef.current = null;
    setGeneration(null);
    setErreurs({});
    setErreurStockage(null);
    const appliquer = (liste) => {
      const triees = trierConversations(liste.map(normaliserConversation).filter(Boolean));
      setConversations(triees);
      setIdActive(triees[0]?.id ?? null);
    };
    if (!cible) {
      appliquer(lireConversationsLocales());
    } else {
      setConversations([]);
      setIdActive(null);
      chargerConversationsIa(cible).then((liste) => {
        if (annule) return;
        if (!liste) setErreurStockage('Les conversations enregistrées n\'ont pas pu être chargées.');
        appliquer(liste || []);
      });
    }
    return () => { annule = true; };
  }, [cible]);

  // Remplace (ou ajoute en tête) une conversation et renvoie la nouvelle liste
  const remplacer = (conversation) => {
    const liste = [conversation, ...conversationsRef.current.filter((c) => c.id !== conversation.id)];
    conversationsRef.current = liste;
    setConversations(liste);
    return liste;
  };

  const enregistrer = async (conversation, liste, cibleConversation = cibleRef.current) => {
    const reussi = cibleConversation
      ? await sauvegarderConversationIa(cibleConversation, limiterConversation(conversation))
      : ecrireConversationsLocales(liste.map(limiterConversation));
    if (cibleConversation === cibleRef.current) {
      setErreurStockage(reussi ? null : 'La conversation n\'a pas pu être enregistrée : elle reste affichée jusqu\'au rechargement.');
    }
  };

  // Demande la réponse du modèle choisi pour la conversation (dernier message : l'utilisateur)
  const demanderReponse = async (conversation) => {
    if (!modeleChoisi) return;
    const controleur = new AbortController();
    controleurRef.current = controleur;
    const cibleEnvoi = cibleRef.current;
    setGeneration({ conversationId: conversation.id });
    setErreurs((e) => ({ ...e, [conversation.id]: null }));
    try {
      const reponse = await envoyerMessagesIa({
        fournisseur: modeleChoisi.fournisseur,
        modele: modeleChoisi.id,
        messages: conversation.messages.map(({ role, contenu }) => ({ role, contenu })),
        signal: controleur.signal,
      });
      const maintenant = new Date().toISOString();
      const message = {
        id: genererIdIa('msg'),
        role: 'assistant',
        contenu: reponse.contenu,
        date: maintenant,
        fournisseur: reponse.fournisseur,
        modele: reponse.modele,
        ...(reponse.tronquee ? { tronquee: true } : {}),
      };
      const actuelle = conversationsRef.current.find((c) => c.id === conversation.id) || conversation;
      const misAJour = {
        ...actuelle,
        fournisseur: reponse.fournisseur,
        modele: reponse.modele,
        dateModification: maintenant,
        messages: [...actuelle.messages, message],
      };
      // Compte changé pendant l'attente : la réponse rejoint la conversation de l'ancien compte
      if (cibleEnvoi !== cibleRef.current) {
        if (cibleEnvoi) enregistrer(misAJour, [misAJour], cibleEnvoi);
        return;
      }
      enregistrer(misAJour, remplacer(misAJour));
    } catch (e) {
      if (e?.name === 'AbortError') {
        setErreurs((er) => ({ ...er, [conversation.id]: { code: 'arret', message: 'Génération arrêtée.' } }));
        return;
      }
      setErreurs((er) => ({ ...er, [conversation.id]: { code: e.code, message: e.message } }));
    } finally {
      if (controleurRef.current === controleur) {
        controleurRef.current = null;
        setGeneration(null);
      }
    }
  };

  const envoyer = () => {
    const texte = brouillon.trim();
    if (!texte || generation || !modeleChoisi) return;
    const maintenant = new Date().toISOString();
    const base = conversationsRef.current.find((c) => c.id === idActive)
      || creerConversation(texte, modeleChoisi.fournisseur, modeleChoisi.id);
    const conversation = {
      ...base,
      dateModification: maintenant,
      messages: [...base.messages, { id: genererIdIa('msg'), role: 'user', contenu: texte.slice(0, LONGUEUR_MAX_MESSAGE), date: maintenant }],
    };
    enregistrer(conversation, remplacer(conversation));
    setIdActive(conversation.id);
    setBrouillon('');
    demanderReponse(conversation);
  };

  // Relance la dernière question restée sans réponse (erreur, quota, arrêt)
  const reessayer = () => {
    const conversation = conversationsRef.current.find((c) => c.id === idActive);
    if (!conversation || generation || conversation.messages.at(-1)?.role !== 'user') return;
    demanderReponse(conversation);
  };

  const choisirModele = (fournisseur, modele) => {
    const choix = { fournisseur, modele };
    setSelection(choix);
    ecrireSelectionModele(choix);
  };

  const nouvelleConversation = () => {
    if (generation) return;
    setIdActive(null);
  };

  const choisirConversation = (id) => {
    if (generation) return;
    setIdActive(id);
  };

  const supprimerConversation = async (id) => {
    if (generation?.conversationId === id) arreterGeneration();
    const liste = conversationsRef.current.filter((c) => c.id !== id);
    conversationsRef.current = liste;
    setConversations(liste);
    if (idActive === id) setIdActive(null);
    const reussi = cible ? await supprimerConversationIa(cible, id) : ecrireConversationsLocales(liste);
    setErreurStockage(reussi ? null : 'La conversation n\'a pas pu être supprimée du stockage.');
  };

  return {
    catalogue,
    chargerCatalogue,
    modeles,
    modeleChoisi,
    choisirModele,
    conversations,
    conversationActive: conversations.find((c) => c.id === idActive) || null,
    nouvelleConversation,
    choisirConversation,
    supprimerConversation,
    brouillon,
    setBrouillon,
    envoyer,
    reessayer,
    arreterGeneration,
    generation,
    erreur: idActive ? erreurs[idActive] : null,
    erreurStockage,
  };
}

export default useChatIa;
