// --- Couleurs de remplissage de la barre du chronomètre (travail / pause),
// choisies dans « Mon Pomodoro ». Indépendantes des préréglages : appliquer un
// préréglage ne les modifie pas.

export const COULEURS_CHRONO_DEFAUT = { travail: '#5865f2', pause: '#23a559' };

// Fond de la piste vide de la barre, tel qu'il apparaît à l'écran
const FOND_PISTE = '#101113';

const estHex = (valeur) => typeof valeur === 'string' && /^#[0-9a-f]{6}$/i.test(valeur);

export const normaliserCouleursChrono = (couleurs) => ({
  travail: estHex(couleurs?.travail) ? couleurs.travail.toLowerCase() : COULEURS_CHRONO_DEFAUT.travail,
  pause: estHex(couleurs?.pause) ? couleurs.pause.toLowerCase() : COULEURS_CHRONO_DEFAUT.pause,
});

const versRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Luminance relative et rapport de contraste (définitions WCAG)
const luminance = (hex) => {
  const [r, g, b] = versRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const rapportContraste = (a, b) => {
  const [claire, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (claire + 0.05) / (sombre + 0.05);
};

// Écart perçu entre deux couleurs (CIE76, espace Lab)
const versLab = (hex) => {
  const [r, g, b] = versRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const xyz = [
    (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047,
    (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1,
    (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883,
  ].map((t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116));
  return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])];
};

export const ecartCouleurs = (a, b) => {
  const [l1, a1, b1] = versLab(a);
  const [l2, a2, b2] = versLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

// Avertissements de lisibilité affichés sous les sélecteurs
export const verifierCouleursChrono = ({ travail, pause }) => {
  const avertissements = [];
  if (rapportContraste(travail, FOND_PISTE) < 2) avertissements.push('La couleur du travail est peu visible sur la barre sombre.');
  if (rapportContraste(pause, FOND_PISTE) < 2) avertissements.push('La couleur de la pause est peu visible sur la barre sombre.');
  if (ecartCouleurs(travail, pause) < 25) avertissements.push('Les deux couleurs se ressemblent trop : le passage à la pause sera difficile à distinguer.');
  return avertissements;
};

// Mode invité : les couleurs sont gardées dans ce navigateur
const CLE_LOCALE = 'couleursChrono';

export const lireCouleursChronoLocales = () => {
  try {
    return normaliserCouleursChrono(JSON.parse(localStorage.getItem(CLE_LOCALE) || 'null'));
  } catch {
    return COULEURS_CHRONO_DEFAUT;
  }
};

export const ecrireCouleursChronoLocales = (couleurs) => {
  try {
    localStorage.setItem(CLE_LOCALE, JSON.stringify(couleurs));
  } catch {
    // stockage indisponible : les couleurs restent actives pour la session
  }
};
