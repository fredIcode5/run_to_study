// --- Gestion des couleurs personnalisables du coureur SVG.
// Analyse dynamiquement le code SVG pour extraire les variables CSS de couleur,
// associe chaque variable à un libellé clair en français et assure la persistance.

export const CLE_COULEURS_LOCALES = 'couleursCoureur';

// Dictionnaire de correspondances entre variables SVG connues et libellés en français
export const LABELS_PARTIES_CORPS = {
  '--couleur-tete': { label: 'Tête', defaut: '#5865F2' },
  '--couleur-visage': { label: 'Visage et yeux', defaut: '#050505' },
  '--couleur-cheveux': { label: 'Cheveux', defaut: '#2563EB' },
  '--couleur-torse': { label: 'Haut du corps (Torse)', defaut: '#5865F2' },
  '--couleur-bras': { label: 'Bras', defaut: '#5865F2' },
  '--couleur-bras-gauche': { label: 'Bras gauche', defaut: '#5865F2' },
  '--couleur-bras-droit': { label: 'Bras droit', defaut: '#5865F2' },
  '--couleur-mains': { label: 'Mains & poignets', defaut: '#5865F2' },
  '--couleur-fessier': { label: 'Bassin / Short', defaut: '#E84C9D' },
  '--couleur-short': { label: 'Short ou pantalon', defaut: '#E84C9D' },
  '--couleur-jambes': { label: 'Jambes & cuisses', defaut: '#5865F2' },
  '--couleur-jambe-gauche': { label: 'Jambe gauche', defaut: '#5865F2' },
  '--couleur-jambe-droite': { label: 'Jambe droite', defaut: '#5865F2' },
  '--couleur-chaussure': { label: 'Chaussures (Base)', defaut: '#F4F6FB' },
  '--couleur-chaussure-blanc': { label: 'Chaussures (Semelle / Lacets)', defaut: '#FFFFFF' },
  '--couleur-chaussure-fonce': { label: 'Chaussures (Ombres / Détails)', defaut: '#FFFFFF' },
  '--couleur-accessoires': { label: 'Accessoires', defaut: '#5865F2' },
  '--couleur-corps': { label: 'Corps', defaut: '#5865F2' },
  '--couleur-sommeil': { label: 'Effet repos (Zzz)', defaut: '#949CF7' },
};

/**
 * Convertit une couleur CSS quelconque en hexadécimal #RRGGBB standard pour <input type="color">.
 */
export function normaliserHex(couleur, repli = '#5865f2') {
  if (!couleur || typeof couleur !== 'string') return repli;
  const c = couleur.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(c)) return c;
  if (/^#[0-9a-f]{3}$/.test(c)) {
    return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  }
  if (c === 'white') return '#ffffff';
  if (c === 'black') return '#000000';
  const matchRgb = c.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (matchRgb) {
    const toHex = (n) => Math.min(255, Math.max(0, parseInt(n, 10))).toString(16).padStart(2, '0');
    return `#${toHex(matchRgb[1])}${toHex(matchRgb[2])}${toHex(matchRgb[3])}`;
  }
  return repli;
}

/**
 * Vérifie si une chaîne ressemble à une valeur de couleur CSS exploitable.
 */
function estValeurCouleur(chaine) {
  if (!chaine || typeof chaine !== 'string') return false;
  const c = chaine.trim().toLowerCase();
  return (
    /^#[0-9a-f]{3,8}$/i.test(c) ||
    /^rgba?\(/i.test(c) ||
    /^hsla?\(/i.test(c) ||
    ['white', 'black', 'red', 'blue', 'green', 'yellow', 'cyan', 'magenta', 'gray', 'grey'].includes(c)
  );
}

/**
 * Génère un libellé clair en français pour un identifiant de variable CSS.
 */
export function obtenirLabelVariable(nomVariable) {
  if (LABELS_PARTIES_CORPS[nomVariable]?.label) {
    return LABELS_PARTIES_CORPS[nomVariable].label;
  }
  // Nettoie les préfixes habituels --couleur- ou --
  const sansPrefixe = nomVariable.replace(/^--(?:couleur-)?/, '');
  const avecEspaces = sansPrefixe.replace(/[-_]+/g, ' ');
  return avecEspaces.charAt(0).toUpperCase() + avecEspaces.slice(1);
}

/**
 * Extrait l'ensemble des variables de couleur CSS présentes dans un ou plusieurs codes SVG.
 * Inspecte les règles `:root`, les `<style>` et tous les usages `var(--...)`.
 *
 * @param {...string} codesSvg - Les codes SVG à analyser
 * @returns {Array<{ id: string, label: string, defaut: string }>}
 */
export function extraireVariablesSvg(...codesSvg) {
  const variablesMap = new Map();

  codesSvg.forEach((code) => {
    if (!code || typeof code !== 'string') return;

    // 1. Déclarations de variables dans :root ou <style> : --nom-variable: #hex;
    const declRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;}\n]+)/g;
    let match;
    while ((match = declRegex.exec(code)) !== null) {
      const nom = match[1].trim();
      const valeurBrute = match[2].trim();
      if (estValeurCouleur(valeurBrute)) {
        if (!variablesMap.has(nom)) {
          variablesMap.set(nom, {
            id: nom,
            defaut: normaliserHex(valeurBrute),
          });
        }
      }
    }

    // 2. Usages directs var(--nom-variable, fallback) ou var(--nom-variable)
    const varRegex = /var\(\s*(--[a-zA-Z0-9_-]+)(?:\s*,\s*([^)]+))?\s*\)/g;
    while ((match = varRegex.exec(code)) !== null) {
      const nom = match[1].trim();
      const fallback = (match[2] || '').trim();
      const defautConnu = LABELS_PARTIES_CORPS[nom]?.defaut || '#5865F2';
      const defautFinal = estValeurCouleur(fallback) ? normaliserHex(fallback) : defautConnu;

      if (!variablesMap.has(nom)) {
        variablesMap.set(nom, {
          id: nom,
          defaut: defautFinal,
        });
      }
    }
  });

  // Ordre logique anatomique pour l'affichage : Tête en haut, puis torse, bras, mains, fessier, jambes, chaussures
  const ordreAnatomique = [
    '--couleur-tete',
    '--couleur-visage',
    '--couleur-cheveux',
    '--couleur-torse',
    '--couleur-bras',
    '--couleur-bras-gauche',
    '--couleur-bras-droit',
    '--couleur-mains',
    '--couleur-fessier',
    '--couleur-short',
    '--couleur-corps',
    '--couleur-jambes',
    '--couleur-jambe-gauche',
    '--couleur-jambe-droite',
    '--couleur-chaussure',
    '--couleur-chaussure-blanc',
    '--couleur-chaussure-fonce',
    '--couleur-accessoires',
    '--couleur-sommeil',
  ];

  const liste = Array.from(variablesMap.values()).map((v) => ({
    id: v.id,
    label: obtenirLabelVariable(v.id),
    defaut: v.defaut,
  }));

  return liste.sort((a, b) => {
    const idxA = ordreAnatomique.indexOf(a.id);
    const idxB = ordreAnatomique.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.label.localeCompare(b.label, 'fr');
  });
}

/**
 * Nettoie et normalise la structure des couleurs personnalisées sauvegardées.
 */
export function normaliserCouleursCoureur(brut) {
  if (!brut || typeof brut !== 'object') return {};
  const propre = {};
  Object.entries(brut).forEach(([k, v]) => {
    if (typeof k === 'string' && k.startsWith('--') && typeof v === 'string') {
      propre[k] = normaliserHex(v);
    }
  });
  return propre;
}

/**
 * Lit les couleurs personnalisées enregistrées dans le localStorage.
 */
export function lireCouleursCoureurLocales() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_COULEURS_LOCALES) || '{}');
    return normaliserCouleursCoureur(brut);
  } catch {
    return {};
  }
}

/**
 * Enregistre les couleurs personnalisées dans le localStorage.
 */
export function ecrireCouleursCoureurLocales(couleurs) {
  try {
    const propre = normaliserCouleursCoureur(couleurs);
    if (Object.keys(propre).length === 0) {
      localStorage.removeItem(CLE_COULEURS_LOCALES);
    } else {
      localStorage.setItem(CLE_COULEURS_LOCALES, JSON.stringify(propre));
    }
  } catch {
    // stockage plein ou indisponible
  }
}
