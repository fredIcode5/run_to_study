// --- Voile de l'écran d'accueil : un voile gris (celui de la navbar) posé sur le
// fond d'écran choisi (preset, couleur ou image de l'application), dont
// l'utilisateur règle l'opacité. Valable pour tous les presets.
// Réglage indépendant des citations : le changer ne relance rien à l'écran.

export const VOILE_DEFAUT = 0.65;
export const BORNES_VOILE = { min: 0, max: 1 };
export const FOND_ACCUEIL_DEFAUT = { voile: VOILE_DEFAUT };

export const normaliserFondAccueil = (fond) => {
  const voile = Number(fond?.voile);
  return {
    voile: Number.isFinite(voile) ? Math.min(BORNES_VOILE.max, Math.max(BORNES_VOILE.min, voile)) : VOILE_DEFAUT,
  };
};

// Mode invité : réglage gardé dans ce navigateur
const CLE_LOCALE = 'fondAccueil';

export const ecrireFondAccueilLocal = (fond) => {
  try {
    localStorage.setItem(CLE_LOCALE, JSON.stringify(fond));
  } catch {
    // stockage indisponible : le réglage reste actif pour la session
  }
};

export const lireFondAccueilLocal = () => {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_LOCALE) || 'null');
    const fond = normaliserFondAccueil(brut);
    // Ancienne image propre à l'accueil (abandonnée) : on libère la place qu'elle occupait
    if (brut && 'image' in brut) ecrireFondAccueilLocal(fond);
    return fond;
  } catch {
    return FOND_ACCUEIL_DEFAUT;
  }
};
