// --- Stockage local des documents importés (PDF, images, captures « Screens »).
// Les fichiers sont gardés dans IndexedDB : ils survivent au rechargement de la
// page mais restent propres à ce navigateur. Si IndexedDB est indisponible
// (navigation privée stricte…), on se rabat sur une simple Map en mémoire.

const NOM_BASE = 'pomodoro_documents';
const VERSION_BASE = 1;
const MAGASIN = 'documents';

let basePromesse = null;
const memoireDeSecours = new Map();

const ouvrirBase = () => {
  if (basePromesse) return basePromesse;
  basePromesse = new Promise((resoudre) => {
    try {
      const requete = indexedDB.open(NOM_BASE, VERSION_BASE);
      requete.onupgradeneeded = () => {
        requete.result.createObjectStore(MAGASIN, { keyPath: 'id' });
      };
      requete.onsuccess = () => resoudre(requete.result);
      requete.onerror = () => resoudre(null);
    } catch {
      resoudre(null);
    }
  });
  return basePromesse;
};

// Exécute une opération sur le magasin et renvoie son résultat
const transaction = async (mode, operation) => {
  const base = await ouvrirBase();
  if (!base) return null;
  return new Promise((resoudre, rejeter) => {
    const tx = base.transaction(MAGASIN, mode);
    const requete = operation(tx.objectStore(MAGASIN));
    tx.oncomplete = () => resoudre(requete?.result ?? null);
    tx.onerror = () => rejeter(tx.error);
  });
};

// Métadonnées seules (sans le contenu binaire), pour l'affichage de la liste
const sansContenu = ({ contenu: _contenu, ...meta }) => meta;

export const listerDocuments = async () => {
  const tous = (await transaction('readonly', (magasin) => magasin.getAll()))
    ?? Array.from(memoireDeSecours.values());
  return tous.map(sansContenu).sort((a, b) => b.dateAjout - a.dateAjout);
};

export const enregistrerDocument = async (fichier, categorie, nom = fichier.name, couleur = null) => {
  const enregistrement = {
    id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    nom,
    type: fichier.type || 'application/octet-stream',
    taille: fichier.size,
    categorie,
    couleur,
    dateAjout: Date.now(),
    contenu: fichier,
  };
  const base = await ouvrirBase();
  if (base) {
    await transaction('readwrite', (magasin) => magasin.put(enregistrement));
  } else {
    memoireDeSecours.set(enregistrement.id, enregistrement);
  }
  return sansContenu(enregistrement);
};

// Met à jour des métadonnées (ex : couleur) sans toucher au contenu du fichier
export const modifierDocumentLocal = async (id, modifications) => {
  const enMemoire = memoireDeSecours.get(id);
  if (enMemoire) {
    memoireDeSecours.set(id, { ...enMemoire, ...modifications });
    return;
  }
  const enregistrement = await transaction('readonly', (magasin) => magasin.get(id));
  if (enregistrement) {
    await transaction('readwrite', (magasin) => magasin.put({ ...enregistrement, ...modifications }));
  }
};

export const supprimerDocumentLocal = async (id) => {
  memoireDeSecours.delete(id);
  await transaction('readwrite', (magasin) => magasin.delete(id));
};

export const chargerContenuDocument = async (id) => {
  const enregistrement = (await transaction('readonly', (magasin) => magasin.get(id)))
    ?? memoireDeSecours.get(id);
  return enregistrement?.contenu ?? null;
};
