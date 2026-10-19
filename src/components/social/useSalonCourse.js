import { useState, useCallback } from 'react';
import { AMIS_TEST, idJoueurAmi, creerJoueurAmi, genererJoueursFictifs } from './joueursFictifs';

const NOMBRE_JOUEURS_REJOINDRE = 3;
const NOMBRE_JOUEURS_MARATHON = 7;

// --- Joueurs affichés sur la Piste de course, à côté du coureur de
// l'utilisateur. L'état vit dans App car la piste (près du chronomètre), le
// Salon de course (menu latéral) et le compteur le partagent.
// Version de test : seuls des joueurs fictifs existent, gardés en mémoire
// pour la session. Le futur multijoueur remplacera `test` sans toucher au reste.
function useSalonCourse() {
  const [joueurs, setJoueurs] = useState([]);

  // Position enregistrée à la fin d'un glisser-déposer
  const deplacerJoueur = useCallback((id, position) => {
    setJoueurs((prev) => prev.map((j) => (j.id === id ? { ...j, position } : j)));
  }, []);

  const retirerJoueur = useCallback((id) => {
    setJoueurs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const viderPiste = useCallback(() => setJoueurs([]), []);

  // --- Boutons de test : générés dans le setter pour toujours partir de la
  // liste à jour (pas de doublon même en cliquant très vite)
  const basculerAmiTest = useCallback((ami) => {
    const id = idJoueurAmi(ami);
    setJoueurs((prev) => (prev.some((j) => j.id === id)
      ? prev.filter((j) => j.id !== id)
      : [...prev, creerJoueurAmi(ami, prev)]));
  }, []);

  const ajouterJoueursTest = useCallback((nombre, origine) => {
    setJoueurs((prev) => [...prev, ...genererJoueursFictifs(nombre, prev, origine)]);
  }, []);

  return {
    joueurs,
    // Coureur de l'utilisateur compris ; `fictif` tant que la piste ne
    // contient que des données de test
    compteur: { nombre: joueurs.length + 1, fictif: true },
    deplacerJoueur,
    retirerJoueur,
    viderPiste,
    test: {
      amis: AMIS_TEST,
      basculerAmi: basculerAmiTest,
      rejoindre: () => ajouterJoueursTest(NOMBRE_JOUEURS_REJOINDRE, 'rejoindre'),
      marathon: () => ajouterJoueursTest(NOMBRE_JOUEURS_MARATHON, 'marathon'),
    },
  };
}

export default useSalonCourse;
