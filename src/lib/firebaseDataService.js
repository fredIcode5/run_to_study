// ==========================================================================
// Service de données Firebase — Opérations CRUD centralisées (Firestore)
// ==========================================================================
// Remplace supabaseDataService.js
// ==========================================================================

import { db } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  orderBy,
  addDoc,
  deleteDoc,
  limit,
  or
} from "firebase/firestore";

// -------------------------------------------------------
// Profil (collection « preferences_utilisateur »)
// -------------------------------------------------------

export async function chargerProfil(userId) {
  try {
    const docRef = doc(db, "preferences_utilisateur", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (err) {
    console.error('Erreur chargement profil :', err);
    return null;
  }
}

export async function sauvegarderProfil(userId, { pseudo, photo_profil, preferences, coins, temps_total_pomodoro, email }) {
  try {
    const docRef = doc(db, "preferences_utilisateur", userId);
    const dataToSave = { updated_at: new Date().toISOString() };
    if (pseudo !== undefined) dataToSave.pseudo = pseudo;
    if (photo_profil !== undefined) dataToSave.photo_profil = photo_profil;
    if (preferences !== undefined) dataToSave.preferences = preferences;
    if (coins !== undefined) dataToSave.coins = coins;
    if (temps_total_pomodoro !== undefined) dataToSave.temps_total_pomodoro = temps_total_pomodoro;
    if (email !== undefined) dataToSave.email = email;

    await setDoc(docRef, dataToSave, { merge: true });
  } catch (err) {
    console.error('Erreur sauvegarde profil :', err);
  }
}

export async function sauvegarderPhotoProfil(userId, photoProfil) {
  try {
    const docRef = doc(db, "preferences_utilisateur", userId);
    await setDoc(docRef, {
      photo_profil: photoProfil,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('Erreur sauvegarde photo de profil :', err);
    throw err;
  }
}

export async function sauvegarderPreferences(userId, preferences) {
  try {
    const docRef = doc(db, "preferences_utilisateur", userId);
    await setDoc(docRef, {
      preferences,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('Erreur sauvegarde préférences :', err);
  }
}

// -------------------------------------------------------
// Notes / Tâches (collection « taches »)
// -------------------------------------------------------

export async function chargerNotes(userId) {
  try {
    const q = query(
      collection(db, "taches"), 
      where("user_id", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const notes = [];
    querySnapshot.forEach((doc) => {
      notes.push(doc.data());
    });
    // Tri côté client (date décroissante)
    return notes.sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation));
  } catch (err) {
    console.error('Erreur chargement notes :', err);
    return [];
  }
}

export async function sauvegarderNotes(userId, notes) {
  try {
    const q = query(collection(db, "taches"), where("user_id", "==", userId));
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    
    // Supprimer les notes existantes
    querySnapshot.forEach((document) => {
      batch.delete(document.ref);
    });

    // Insérer les nouvelles
    notes.forEach((n) => {
      const docRef = doc(collection(db, "taches"), n.id);
      batch.set(docRef, {
        id: n.id,
        user_id: userId,
        contenu: n.contenu ?? '',
        tags: n.tags ?? [],
        dateEcheance: n.dateEcheance ?? '',
        terminee: n.terminee ?? false,
        epinglee: n.epinglee ?? false,
        position: n.position ?? null,
        ordre: n.ordre ?? null,
        dateCreation: n.dateCreation ?? new Date().toISOString(),
        dateModification: n.dateModification ?? new Date().toISOString(),
      });
    });

    await batch.commit();
  } catch (err) {
    console.error('Erreur sauvegarde notes :', err);
  }
}

// -------------------------------------------------------
// Préréglages (collection « prereglages »)
// -------------------------------------------------------

export async function chargerPrereglages(userId) {
  try {
    const q = query(
      collection(db, "prereglages"), 
      where("user_id", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const prereglages = [];
    querySnapshot.forEach((doc) => {
      prereglages.push(doc.data());
    });
    return prereglages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } catch (err) {
    console.error('Erreur chargement préréglages :', err);
    return [];
  }
}

export async function sauvegarderPrereglages(userId, prereglages) {
  try {
    const q = query(collection(db, "prereglages"), where("user_id", "==", userId));
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    
    // Supprimer
    querySnapshot.forEach((document) => {
      batch.delete(document.ref);
    });

    // Insérer
    prereglages.forEach((p) => {
      const { id, nom, ...config } = p;
      const docRef = doc(collection(db, "prereglages"), id);
      batch.set(docRef, {
        id,
        user_id: userId,
        nom,
        ...config, // Firestore gère bien le mix
        created_at: new Date().toISOString()
      });
    });

    await batch.commit();
  } catch (err) {
    console.error('Erreur sauvegarde préréglages :', err);
  }
}

// -------------------------------------------------------
// Historique Pomodoro (collection « seances_pomodoro »)
// -------------------------------------------------------

export async function chargerHistorique(userId) {
  try {
    const q = query(
      collection(db, "seances_pomodoro"), 
      where("user_id", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const jours = [];
    querySnapshot.forEach((doc) => {
      jours.push(doc.data().jour);
    });
    return jours.sort();
  } catch (err) {
    console.error('Erreur chargement historique :', err);
    return [];
  }
}

export async function ajouterJourHistorique(userId, jour) {
  try {
    // On utilise l'ID 'userId_jour' pour éviter les doublons et s'assurer que
    // les enregistrements sont uniques
    const docId = `${userId}_${jour}`;
    const docRef = doc(db, "seances_pomodoro", docId);
    await setDoc(docRef, {
      user_id: userId,
      jour: jour,
      created_at: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('Erreur ajout jour historique :', err);
  }
}

// -------------------------------------------------------
// Sessions archivées (collection « sessions_notes »)
// -------------------------------------------------------

export async function chargerSessionsArchivees(userId) {
  try {
    const q = query(
      collection(db, "sessions_notes"), 
      where("user_id", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const sessions = [];
    querySnapshot.forEach((doc) => {
      sessions.push(doc.data());
    });
    return sessions.sort((a, b) => new Date(a.dateCreation) - new Date(b.dateCreation));
  } catch (err) {
    console.error('Erreur chargement sessions archivées :', err);
    return [];
  }
}

export async function sauvegarderSessionArchivee(userId, session) {
  try {
    const docRef = doc(db, "sessions_notes", session.id);
    await setDoc(docRef, {
      id: session.id,
      user_id: userId,
      titre: session.titre,
      numero: session.numero,
      date: session.date, // Attention, la prop locale s'appelle "date"
      heure: session.heure,
      dateCreation: session.dateCreation,
      notes: session.notes ?? [],
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erreur sauvegarde session archivée :', err);
  }
}


// -------------------------------------------------------
// Récompenses (collection « recompenses »)
// -------------------------------------------------------

export async function chargerRecompenses(userId) {
  try {
    const q = query(
      collection(db, "recompenses"), 
      where("user_id", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const recompenses = [];
    querySnapshot.forEach((doc) => {
      recompenses.push({ id: doc.id, ...doc.data() });
    });
    // Tri côté client (date décroissante)
    return recompenses.sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation));
  } catch (err) {
    console.error("Erreur chargement récompenses :", err);
    return [];
  }
}

export async function ajouterRecompense(userId, recompense) {
  try {
    const docRef = doc(collection(db, "recompenses"));
    const dataToSave = {
      ...recompense,
      user_id: userId,
      dateCreation: new Date().toISOString()
    };
    await setDoc(docRef, dataToSave);
    return { id: docRef.id, ...dataToSave };
  } catch (err) {
    console.error("Erreur ajout récompense :", err);
    throw err;
  }
}

export async function mettreAJourRecompense(userId, recompenseId, misesAJour) {
  try {
    const docRef = doc(db, "recompenses", recompenseId);
    await setDoc(docRef, misesAJour, { merge: true });
  } catch (err) {
    console.error("Erreur màj récompense :", err);
    throw err;
  }
}
// -------------------------------------------------------
// Social (Recherche, Demandes d'amis, Amis)
// -------------------------------------------------------

export async function rechercherUtilisateurs(texteRecherche, currentUserId) {
  try {
    const q = query(collection(db, "preferences_utilisateur"), limit(50));
    const querySnapshot = await getDocs(q);
    const resultats = [];
    
    const cible = texteRecherche.toLowerCase().trim();
    if (!cible) return [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;
      
      if (id === currentUserId) return;
      
      const pseudoMatch = data.pseudo && data.pseudo.toLowerCase().includes(cible);
      const emailMatch = data.email && data.email.toLowerCase().includes(cible);
      
      if (pseudoMatch || emailMatch) {
        resultats.push({
          id,
          pseudo: data.pseudo || data.email || 'Utilisateur inconnu',
          photo_profil: data.photo_profil || null,
          niveau: data.temps_total_pomodoro ? Math.floor((data.temps_total_pomodoro / 60) / 10) + 1 : 1
        });
      }
    });
    
    return resultats;
  } catch (err) {
    console.error("Erreur recherche utilisateurs :", err);
    return [];
  }
}

export async function envoyerDemandeAmi(expediteurId, destinataireId) {
  try {
    const q = query(
      collection(db, "demandes_amis"),
      or(
        where("expediteur_id", "==", expediteurId),
        where("destinataire_id", "==", expediteurId)
      )
    );
    const querySnapshot = await getDocs(q);
    
    let demandeExiste = false;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if ((data.expediteur_id === expediteurId && data.destinataire_id === destinataireId) ||
          (data.expediteur_id === destinataireId && data.destinataire_id === expediteurId)) {
        demandeExiste = true;
      }
    });

    if (demandeExiste) {
      console.log("Une demande d'ami ou une amitié existe déjà.");
      return null;
    }

    const docRef = await addDoc(collection(db, "demandes_amis"), {
      expediteur_id: expediteurId,
      destinataire_id: destinataireId,
      statut: 'en_attente',
      created_at: new Date().toISOString()
    });
    return docRef.id;
  } catch (err) {
    console.error("Erreur envoi demande d'ami :", err);
    throw err;
  }
}

export async function repondreDemandeAmi(demandeId, nouveauStatut) {
  try {
    const docRef = doc(db, "demandes_amis", demandeId);
    if (nouveauStatut === 'refusee') {
      await deleteDoc(docRef);
    } else {
      await updateDoc(docRef, {
        statut: nouveauStatut,
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("Erreur réponse demande d'ami :", err);
    throw err;
  }
}

export async function getDemandesAmis(userId) {
  try {
    const q = query(
      collection(db, "demandes_amis"),
      where("destinataire_id", "==", userId),
      where("statut", "==", "en_attente")
    );
    const querySnapshot = await getDocs(q);
    
    const demandes = [];
    for (const d of querySnapshot.docs) {
      const data = d.data();
      const expediteurRef = doc(db, "preferences_utilisateur", data.expediteur_id);
      const expediteurSnap = await getDoc(expediteurRef);
      
      let profilExpediteur = { pseudo: 'Utilisateur inconnu', niveau: 1 };
      if (expediteurSnap.exists()) {
        const pData = expediteurSnap.data();
        profilExpediteur = {
          pseudo: pData.pseudo || 'Utilisateur inconnu',
          photo_profil: pData.photo_profil || null,
          niveau: pData.temps_total_pomodoro ? Math.floor((pData.temps_total_pomodoro / 60) / 10) + 1 : 1
        };
      }
      
      demandes.push({
        id: d.id,
        ...data,
        expediteur: profilExpediteur
      });
    }
    
    return demandes;
  } catch (err) {
    console.error("Erreur chargement demandes d'amis :", err);
    return [];
  }
}

export async function getDemandesEnvoyees(userId) {
  try {
    const q = query(
      collection(db, "demandes_amis"),
      where("expediteur_id", "==", userId),
      where("statut", "==", "en_attente")
    );
    const querySnapshot = await getDocs(q);
    
    const demandes = [];
    querySnapshot.forEach((doc) => {
      demandes.push({ id: doc.id, ...doc.data() });
    });
    return demandes;
  } catch (err) {
    console.error("Erreur chargement demandes envoyées :", err);
    return [];
  }
}

export async function getAmis(userId) {
  try {
    const q = query(
      collection(db, "demandes_amis"),
      or(
        where("expediteur_id", "==", userId),
        where("destinataire_id", "==", userId)
      )
    );
    const querySnapshot = await getDocs(q);
    
    const amis = [];
    for (const d of querySnapshot.docs) {
      const data = d.data();
      if (data.statut !== 'acceptee') continue;
      
      const amiId = data.expediteur_id === userId ? data.destinataire_id : data.expediteur_id;
      const amiRef = doc(db, "preferences_utilisateur", amiId);
      const amiSnap = await getDoc(amiRef);
      
      if (amiSnap.exists()) {
        const pData = amiSnap.data();
        amis.push({
          id: d.id, // L'id de la relation d'amitié (document 'demandes_amis')
          amiId: amiId, // L'id Firebase de l'ami
          pseudo: pData.pseudo || 'Ami',
          photo_profil: pData.photo_profil || null,
          niveau: pData.temps_total_pomodoro ? Math.floor((pData.temps_total_pomodoro / 60) / 10) + 1 : 1
        });
      }
    }
    
    return amis;
  } catch (err) {
    console.error("Erreur chargement amis :", err);
    return [];
  }
}

