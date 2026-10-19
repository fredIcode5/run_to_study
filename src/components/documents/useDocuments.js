import { useState, useEffect, useMemo } from 'react';
import { listerDocuments, enregistrerDocument, supprimerDocumentLocal, modifierDocumentLocal } from '../../lib/documentsLocaux';

// Largeur occupée par le menu latéral droit ouvert (poignée + panneau)
const LARGEUR_MENU = 388;
const TAILLE_MIN = { largeur: 320, hauteur: 200 };

// Outils de la partie « Fenêtre » (Cahier, Chat IA) : ils prennent place dans
// les fenêtres comme les documents, sous l'identifiant « outil_<type> », et
// n'existent qu'en un exemplaire (sélectionnés, ils rejoignent leur fenêtre)
const TAILLES_OUTILS = {
  cahier: { largeur: 560, hauteur: 600 },
  chat: { largeur: 540, hauteur: 640 },
};
export const idOutil = (type) => `outil_${type}`;
export const estIdOutil = (id) => id.startsWith('outil_');

export const TYPES_ACCEPTES = 'application/pdf,image/*';

// Couleurs des pastilles : distinctes et lisibles sur le fond sombre
export const PALETTE_DOCUMENTS = [
  '#5865F2', '#23A559', '#F0B232', '#F23F43', '#EB459E',
  '#3BA3F5', '#A970FF', '#1ABC9C', '#F47B32', '#A3BE38',
];

// Première couleur de la palette pas encore prise ; une fois la palette
// épuisée, la moins utilisée
const choisirCouleur = (couleursPrises) => {
  const compte = new Map(PALETTE_DOCUMENTS.map((c) => [c, 0]));
  couleursPrises.forEach((c) => compte.has(c) && compte.set(c, compte.get(c) + 1));
  return PALETTE_DOCUMENTS.reduce((meilleure, c) => (compte.get(c) < compte.get(meilleure) ? c : meilleure));
};

export const estPdf = (doc) => doc?.type === 'application/pdf';
export const estImage = (doc) => doc?.type?.startsWith('image/');

// Taille initiale d'une fenêtre selon son premier élément : document toujours
// en format paysage (plus large que haute), outil à sa taille ; bornée à l'écran
const tailleInitiale = (doc, idElement) => {
  const largeurMax = window.innerWidth - 32;
  const hauteurMax = window.innerHeight - 32;
  const voulue = !doc
    ? TAILLES_OUTILS[idElement.slice('outil_'.length)]
    : estPdf(doc)
      ? { largeur: 760, hauteur: 480 }
      : { largeur: 640, hauteur: 420 };
  return {
    largeur: Math.max(TAILLE_MIN.largeur, Math.min(voulue.largeur, largeurMax)),
    hauteur: Math.max(TAILLE_MIN.hauteur, Math.min(voulue.hauteur, hauteurMax)),
  };
};

// Garde toujours une partie de la barre de titre à l'écran pour pouvoir la ressaisir
export const bornerPosition = ({ x, y }, largeur) => ({
  x: Math.min(Math.max(x, 80 - largeur), window.innerWidth - 80),
  y: Math.min(Math.max(y, 0), window.innerHeight - 40),
});

export const bornerTaille = ({ largeur, hauteur }, { x, y }) => ({
  largeur: Math.max(TAILLE_MIN.largeur, Math.min(largeur, window.innerWidth - Math.max(x, 0))),
  hauteur: Math.max(TAILLE_MIN.hauteur, Math.min(hauteur, window.innerHeight - Math.max(y, 0))),
});

// Retire un document des fenêtres (toutes, ou une seule) ; une fenêtre vidée se ferme
const retirerDesFenetres = (fenetres, documentId, idFenetre = null) => fenetres
  .map((f) => {
    if ((idFenetre && f.id !== idFenetre) || !f.documentIds.includes(documentId)) return f;
    const documentIds = f.documentIds.filter((id) => id !== documentId);
    const position = f.documentIds.indexOf(documentId);
    const actifId = f.actifId === documentId
      ? documentIds[Math.min(position, documentIds.length - 1)] ?? null
      : f.actifId;
    return { ...f, documentIds, actifId };
  })
  .filter((f) => f.documentIds.length > 0);

// --- Documents (liste permanente) et fenêtres (affichages temporaires) sont
// deux états distincts : ouvrir, déplacer ou fermer une fenêtre ne touche
// jamais à la liste ; seule une suppression explicite retire un document.
// Une fenêtre peut afficher plusieurs documents, chacun repéré par sa pastille.
function useDocuments() {
  const [documents, setDocuments] = useState([]);
  // Fenêtres ouvertes : { id, documentIds, actifId, x, y, largeur, hauteur }
  const [fenetres, setFenetres] = useState([]);
  // Ids des fenêtres, du plus en arrière au premier plan
  const [ordreFenetres, setOrdreFenetres] = useState([]);

  // Chargement ; un document importé avant l'arrivée des pastilles reçoit une couleur
  useEffect(() => {
    listerDocuments().then((liste) => {
      const prises = liste.map((d) => d.couleur).filter(Boolean);
      const completes = liste.slice().reverse().map((d) => {
        if (d.couleur) return d;
        const couleur = choisirCouleur(prises);
        prises.push(couleur);
        modifierDocumentLocal(d.id, { couleur }).catch(console.error);
        return { ...d, couleur };
      }).reverse();
      setDocuments(completes);
    }).catch(console.error);
  }, []);

  const importerFichiers = async (fichiers, categorie = 'documents') => {
    const acceptes = Array.from(fichiers || []).filter(
      (f) => f.type === 'application/pdf' || f.type.startsWith('image/')
    );
    const prises = documents.map((d) => d.couleur);
    const ajoutes = [];
    for (const fichier of acceptes) {
      const couleur = choisirCouleur(prises);
      prises.push(couleur);
      ajoutes.push(await enregistrerDocument(fichier, categorie, fichier.name, couleur));
    }
    if (ajoutes.length > 0) setDocuments((prev) => [...ajoutes.reverse(), ...prev]);
    return ajoutes.length;
  };

  // source : nom du document capturé depuis une fenêtre (absent pour une capture d'écran)
  const enregistrerCapture = async (blob, source) => {
    const maintenant = new Date();
    const horodatage = `${maintenant.toLocaleDateString()} ${maintenant.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    const nom = source ? `Capture ${source} – ${horodatage}.png` : `Capture ${horodatage}.png`;
    const couleur = choisirCouleur(documents.map((d) => d.couleur));
    const doc = await enregistrerDocument(blob, 'screens', nom, couleur);
    setDocuments((prev) => [doc, ...prev]);
  };

  const changerCouleurDocument = (id, couleur) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, couleur } : d)));
    modifierDocumentLocal(id, { couleur }).catch(console.error);
  };

  const synchroniserOrdre = (fenetresRestantes) => {
    const ids = new Set(fenetresRestantes.map((f) => f.id));
    setOrdreFenetres((prev) => prev.filter((idF) => ids.has(idF)));
  };

  const supprimerDocument = async (id) => {
    const restantes = retirerDesFenetres(fenetres, id);
    setFenetres(restantes);
    synchroniserOrdre(restantes);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    await supprimerDocumentLocal(id);
  };

  const mettreAuPremierPlan = (id) => {
    setOrdreFenetres((prev) => (prev[prev.length - 1] === id ? prev : [...prev.filter((idF) => idF !== id), id]));
  };

  // Ouvre une nouvelle fenêtre : au point de dépôt si fourni, sinon en
  // cascade au centre de l'espace de travail (zone à gauche du menu)
  const ouvrirFenetre = (documentId, pointDepot) => {
    const doc = documents.find((d) => d.id === documentId);
    if (!doc && !estIdOutil(documentId)) return;
    const taille = tailleInitiale(doc, documentId);
    let position;
    if (pointDepot) {
      position = { x: pointDepot.x - 60, y: pointDepot.y - 18 };
    } else {
      const decalage = (fenetres.length % 6) * 28;
      position = {
        x: Math.max(16, (window.innerWidth - LARGEUR_MENU - taille.largeur) / 2) + decalage,
        y: Math.max(16, (window.innerHeight - taille.hauteur) / 2) + decalage,
      };
    }
    // À l'ouverture, la fenêtre tient entière à l'écran (coin de redimensionnement compris)
    position = {
      x: Math.max(8, Math.min(position.x, window.innerWidth - taille.largeur - 8)),
      y: Math.max(8, Math.min(position.y, window.innerHeight - taille.hauteur - 8)),
    };
    const fenetre = {
      id: `fen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      documentIds: [documentId],
      actifId: documentId,
      ...position,
      ...taille,
    };
    setFenetres((prev) => [...prev, fenetre]);
    setOrdreFenetres((prev) => [...prev, fenetre.id]);
  };

  // Ajoute un document à une fenêtre existante (nouvelle pastille) et l'affiche
  const ajouterAFenetre = (idFenetre, documentId) => {
    setFenetres((prev) => prev.map((f) => (f.id !== idFenetre ? f : {
      ...f,
      documentIds: f.documentIds.includes(documentId) ? f.documentIds : [...f.documentIds, documentId],
      actifId: documentId,
    })));
    mettreAuPremierPlan(idFenetre);
  };

  // Clic sur une pastille : bascule le document affiché dans la fenêtre
  const activerDocument = (idFenetre, documentId) => {
    setFenetres((prev) => prev.map((f) => (f.id === idFenetre ? { ...f, actifId: documentId } : f)));
  };

  const retirerDeFenetre = (idFenetre, documentId) => {
    const restantes = retirerDesFenetres(fenetres, documentId, idFenetre);
    setFenetres(restantes);
    synchroniserOrdre(restantes);
  };

  // Sélection depuis la section « Documents » (document ou outil) : déjà ouvert →
  // sa fenêtre la plus en avant passe au premier plan sur cet élément ; sinon il
  // rejoint la fenêtre au premier plan (ou une nouvelle fenêtre s'il n'y en a
  // aucune). Un outil n'est donc jamais ouvert deux fois.
  const selectionnerDocument = (documentId) => {
    const contenant = [...ordreFenetres].reverse()
      .map((idF) => fenetres.find((f) => f.id === idF))
      .find((f) => f?.documentIds.includes(documentId));
    if (contenant) {
      activerDocument(contenant.id, documentId);
      mettreAuPremierPlan(contenant.id);
      return;
    }
    const premierPlan = ordreFenetres[ordreFenetres.length - 1];
    if (premierPlan) ajouterAFenetre(premierPlan, documentId);
    else ouvrirFenetre(documentId);
  };

  const fermerFenetre = (id) => {
    setFenetres((prev) => prev.filter((f) => f.id !== id));
    setOrdreFenetres((prev) => prev.filter((idF) => idF !== id));
  };

  // Position et/ou dimensions d'une fenêtre, sans toucher à la liste
  const mettreAJourFenetre = (id, modifications) => {
    setFenetres((prev) => prev.map((f) => (f.id === id ? { ...f, ...modifications } : f)));
  };

  // Nombre de fenêtres affichant chaque document : pilote l'état des bandes
  const fenetresParDocument = useMemo(() => {
    const compte = new Map();
    fenetres.forEach((f) => f.documentIds.forEach((id) => compte.set(id, (compte.get(id) || 0) + 1)));
    return compte;
  }, [fenetres]);

  // Outils présents dans une fenêtre (état des boutons Cahier / Chat IA)
  const outils = {
    cahier: fenetresParDocument.has(idOutil('cahier')),
    chat: fenetresParDocument.has(idOutil('chat')),
  };

  return {
    documents,
    fenetres,
    outils,
    ouvrirOutil: (type) => selectionnerDocument(idOutil(type)),
    ordreFenetres,
    fenetresParDocument,
    importerFichiers,
    enregistrerCapture,
    changerCouleurDocument,
    supprimerDocument,
    ouvrirFenetre,
    ajouterAFenetre,
    activerDocument,
    retirerDeFenetre,
    selectionnerDocument,
    fermerFenetre,
    mettreAJourFenetre,
    mettreAuPremierPlan,
  };
}

export default useDocuments;
