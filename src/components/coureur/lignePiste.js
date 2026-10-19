// --- Ligne de tirets blancs qui défile sous les pieds des coureurs de la
// Piste de course. Son opacité (0 → 1) se règle dans le Salon de course.

export const OPACITE_LIGNE_DEFAUT = 0.6;

export const normaliserOpaciteLigne = (valeur) => (
  typeof valeur === 'number' && Number.isFinite(valeur)
    ? Math.min(1, Math.max(0, valeur))
    : OPACITE_LIGNE_DEFAUT
);

// Mode invité : l'opacité est gardée dans ce navigateur
const CLE_LOCALE = 'opaciteLignePiste';

export const lireOpaciteLigneLocale = () => {
  try {
    return normaliserOpaciteLigne(JSON.parse(localStorage.getItem(CLE_LOCALE) || 'null'));
  } catch {
    return OPACITE_LIGNE_DEFAUT;
  }
};

export const ecrireOpaciteLigneLocale = (opacite) => {
  try {
    localStorage.setItem(CLE_LOCALE, JSON.stringify(opacite));
  } catch {
    // stockage indisponible : le réglage reste actif pour la session
  }
};
