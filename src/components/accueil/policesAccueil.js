// --- Polices de l'écran d'accueil (message de bienvenue et citation), choisies
// dans « Encouragements ». Google Fonts : seule la police choisie est chargée.
// requete : paramètre « family » de l'API css2, limité aux graisses et italiques
// que la police possède (une variante absente fait échouer toute la requête).
// lettresLiees : écriture manuscrite, sans espacement entre les lettres.

export const POLICE_ACCUEIL_DEFAUT = 'defaut';

export const POLICES_ACCUEIL = [
  { id: POLICE_ACCUEIL_DEFAUT, nom: 'Par défaut (Space Grotesk et Cascadia Code)' },
  { id: 'roboto', nom: 'Roboto', famille: "'Roboto', sans-serif", requete: 'Roboto:ital,wght@0,400;0,500;0,700;1,400' },
  { id: 'open-sans', nom: 'Open Sans', famille: "'Open Sans', sans-serif", requete: 'Open+Sans:ital,wght@0,400;0,500;0,700;1,400' },
  { id: 'montserrat', nom: 'Montserrat', famille: "'Montserrat', sans-serif", requete: 'Montserrat:ital,wght@0,400;0,500;0,700;1,400' },
  { id: 'poppins', nom: 'Poppins', famille: "'Poppins', sans-serif", requete: 'Poppins:ital,wght@0,400;0,500;0,700;1,400' },
  { id: 'lato', nom: 'Lato', famille: "'Lato', sans-serif", requete: 'Lato:ital,wght@0,400;0,700;1,400' },
  { id: 'raleway', nom: 'Raleway', famille: "'Raleway', sans-serif", requete: 'Raleway:ital,wght@0,400;0,500;0,700;1,400' },
  { id: 'nunito', nom: 'Nunito', famille: "'Nunito', sans-serif", requete: 'Nunito:ital,wght@0,400;0,500;0,700;1,400' },
  { id: 'playfair-display', nom: 'Playfair Display', famille: "'Playfair Display', serif", requete: 'Playfair+Display:ital,wght@0,400;0,500;0,700;1,400' },
  { id: 'lora', nom: 'Lora', famille: "'Lora', serif", requete: 'Lora:ital,wght@0,400;0,500;0,700;1,400' },
  { id: 'merriweather', nom: 'Merriweather', famille: "'Merriweather', serif", requete: 'Merriweather:ital,wght@0,400;0,700;1,400' },
  { id: 'roboto-mono', nom: 'Roboto Mono', famille: "'Roboto Mono', monospace", requete: 'Roboto+Mono:ital,wght@0,400;0,500;0,700;1,400' },
  { id: 'space-mono', nom: 'Space Mono', famille: "'Space Mono', monospace", requete: 'Space+Mono:ital,wght@0,400;0,700;1,400' },
  { id: 'caveat', nom: 'Caveat', famille: "'Caveat', cursive", requete: 'Caveat:wght@400;500;700', lettresLiees: true },
  { id: 'dancing-script', nom: 'Dancing Script', famille: "'Dancing Script', cursive", requete: 'Dancing+Script:wght@400;500;700', lettresLiees: true },
  { id: 'pacifico', nom: 'Pacifico', famille: "'Pacifico', cursive", requete: 'Pacifico', lettresLiees: true },
];

export const trouverPoliceAccueil = (id) => POLICES_ACCUEIL.find((p) => p.id === id) || POLICES_ACCUEIL[0];

// Ajoute (une seule fois) la feuille Google Fonts de la police ; rien pour la police par défaut
export const chargerPoliceAccueil = (id) => {
  const police = trouverPoliceAccueil(id);
  if (!police.requete) return;
  const idLien = `police-accueil-${police.id}`;
  if (document.getElementById(idLien)) return;
  const lien = document.createElement('link');
  lien.id = idLien;
  lien.rel = 'stylesheet';
  lien.href = `https://fonts.googleapis.com/css2?family=${police.requete}&display=swap`;
  document.head.appendChild(lien);
};
