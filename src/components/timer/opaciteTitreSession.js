// --- Opacité de la barre du titre de la session, sous le chrono, réglée dans
// « Mon Pomodoro ». Minimum 10 % : la barre reste repérable pour y écrire.

export const OPACITE_TITRE_DEFAUT = 1;
export const BORNES_OPACITE_TITRE = { min: 0.1, max: 1 };

export const normaliserOpaciteTitre = (valeur) => (
  typeof valeur === 'number' && Number.isFinite(valeur)
    ? Math.min(BORNES_OPACITE_TITRE.max, Math.max(BORNES_OPACITE_TITRE.min, valeur))
    : OPACITE_TITRE_DEFAUT
);

// Mode invité : le réglage est gardé dans ce navigateur
const CLE_LOCALE = 'opaciteTitreSession';

export const lireOpaciteTitreLocale = () => {
  try {
    return normaliserOpaciteTitre(JSON.parse(localStorage.getItem(CLE_LOCALE) || 'null'));
  } catch {
    return OPACITE_TITRE_DEFAUT;
  }
};

export const ecrireOpaciteTitreLocale = (opacite) => {
  try {
    localStorage.setItem(CLE_LOCALE, JSON.stringify(opacite));
  } catch {
    // stockage indisponible : le réglage reste actif pour la session
  }
};
