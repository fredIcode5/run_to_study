// --- Animations SVG du coureur : validation et assainissement.
// Le code SVG fourni par l'utilisateur est conservé tel quel (c'est lui qui est
// enregistré) ; seul le rendu passe par assainirSvg(), qui retire tout ce qui
// pourrait exécuter du code ou charger une ressource externe, tout en gardant
// les animations SMIL (<animate>, <animateTransform>…) et les animations CSS.

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

export const TAILLE_MAX_SVG = 200 * 1024;

// Éléments jamais rendus (exécution de code, contenu HTML, documents imbriqués)
const ELEMENTS_INTERDITS = new Set([
  'script', 'foreignobject', 'iframe', 'embed', 'object', 'audio', 'video',
  'canvas', 'handler', 'listener',
]);
const ELEMENTS_ANIMATION = new Set(['animate', 'set', 'animatemotion', 'animatetransform']);

// Seules les références internes (#id) et les images matricielles en data: sont permises
const referenceAutorisee = (valeur) => {
  const v = (valeur || '').trim();
  return v.startsWith('#') || /^data:image\/(png|jpe?g|gif|webp);/i.test(v);
};

// url(...) externes retirées des styles (seules les url(#id) restent)
const nettoyerCss = (css) => css
  .replace(/@import[^;]*;?/gi, '')
  .replace(/url\(\s*(['"]?)(?!#)[^)]*\1\s*\)/gi, 'none')
  .replace(/expression\s*\(/gi, '')
  .replace(/javascript\s*:/gi, '');

const nombre = (valeur) => {
  const n = parseFloat(String(valeur || '').replace(/px$/i, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Valide et assainit un code SVG.
 * @returns {{ element: SVGSVGElement|null, ratio: number, retraits: string[], erreur: string|null }}
 *   element : racine <svg> assainie (à cloner avec importNode avant insertion)
 *   ratio   : largeur / hauteur d'après le viewBox
 *   retraits: ce qui a été retiré au rendu (pour l'afficher dans l'éditeur)
 */
export function assainirSvg(code) {
  const echec = (erreur) => ({ element: null, ratio: 1, retraits: [], erreur });
  const texte = (code || '').trim();
  if (!texte) return echec('Le code est vide.');
  if (texte.length > TAILLE_MAX_SVG) return echec(`Le SVG est trop lourd (${Math.round(texte.length / 1024)} Ko, maximum ${TAILLE_MAX_SVG / 1024} Ko).`);

  const doc = new DOMParser().parseFromString(texte, 'image/svg+xml');
  const erreurAnalyse = doc.querySelector('parsererror');
  if (erreurAnalyse) {
    // Ne garde que la position et la cause : « line 3 at column 12: … »
    const detail = (erreurAnalyse.textContent || '').match(/line (\d+) at column (\d+):\s*([^\n]*?)(?:Below is|$)/i);
    return echec(detail
      ? `Code SVG invalide (ligne ${detail[1]}, colonne ${detail[2]}) : ${detail[3].trim().replace(/\{[^}]*\}/g, '')}`
      : 'Code SVG invalide : une balise est mal fermée ou un caractère est interdit.');
  }
  const racine = doc.documentElement;
  if (racine.namespaceURI !== SVG_NS || racine.localName !== 'svg') {
    return echec('Le code doit commencer par une balise <svg xmlns="http://www.w3.org/2000/svg">.');
  }

  const retraits = new Set();

  const parcourir = (el) => {
    Array.from(el.children).forEach((enfant) => {
      const nom = enfant.localName.toLowerCase();

      if (enfant.namespaceURI !== SVG_NS || ELEMENTS_INTERDITS.has(nom)) {
        retraits.add(`<${enfant.localName}>`);
        enfant.remove();
        return;
      }

      // Un lien <a> est remplacé par son contenu (pas de navigation possible)
      if (nom === 'a') {
        retraits.add('<a> (lien)');
        while (enfant.firstChild) el.insertBefore(enfant.firstChild, enfant);
        enfant.remove();
        return;
      }

      // Animation qui viserait un attribut sensible (href, on…) ou injecterait javascript:
      if (ELEMENTS_ANIMATION.has(nom)) {
        const cible = (enfant.getAttribute('attributeName') || '').toLowerCase();
        const valeurs = ['values', 'to', 'from', 'by'].map((a) => enfant.getAttribute(a) || '').join(' ');
        if (/^(on|href|xlink:href)/.test(cible) || /javascript\s*:/i.test(valeurs)) {
          retraits.add(`<${enfant.localName} attributeName="${cible}">`);
          enfant.remove();
          return;
        }
      }

      Array.from(enfant.attributes).forEach((attr) => {
        const nomAttr = attr.name.toLowerCase();
        if (nomAttr.startsWith('on')) {
          retraits.add(`attribut ${attr.name}`);
          enfant.removeAttributeNode(attr);
        } else if ((nomAttr === 'href' || nomAttr === 'xlink:href') && !referenceAutorisee(attr.value)) {
          retraits.add('référence externe (href)');
          enfant.removeAttributeNode(attr);
        } else if (/javascript\s*:/i.test(attr.value)) {
          retraits.add(`attribut ${attr.name}`);
          enfant.removeAttributeNode(attr);
        } else if (nomAttr === 'style') {
          enfant.setAttribute('style', nettoyerCss(attr.value));
        } else if (/url\(/i.test(attr.value) && !/^\s*url\(\s*['"]?#/i.test(attr.value)) {
          retraits.add('ressource externe url()');
          enfant.removeAttributeNode(attr);
        }
      });
      // href dans l'espace de noms xlink
      const xlinkHref = enfant.getAttributeNS(XLINK_NS, 'href');
      if (xlinkHref && !referenceAutorisee(xlinkHref)) {
        retraits.add('référence externe (href)');
        enfant.removeAttributeNS(XLINK_NS, 'href');
      }

      if (nom === 'style') enfant.textContent = nettoyerCss(enfant.textContent || '');

      parcourir(enfant);
    });
  };

  Array.from(racine.attributes).forEach((attr) => {
    if (attr.name.toLowerCase().startsWith('on')) {
      retraits.add(`attribut ${attr.name}`);
      racine.removeAttributeNode(attr);
    }
  });
  parcourir(racine);

  // Le coureur est dimensionné par sa hauteur : il faut un viewBox pour garder les proportions
  let viewBox = (racine.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (viewBox.length !== 4 || viewBox.some((n) => !Number.isFinite(n)) || viewBox[2] <= 0 || viewBox[3] <= 0) {
    const largeur = nombre(racine.getAttribute('width'));
    const hauteur = nombre(racine.getAttribute('height'));
    if (!largeur || !hauteur) {
      return echec('Le SVG doit avoir un attribut viewBox (ou des attributs width et height numériques) pour garder ses proportions.');
    }
    viewBox = [0, 0, largeur, hauteur];
    racine.setAttribute('viewBox', viewBox.join(' '));
  }
  racine.removeAttribute('width');
  racine.removeAttribute('height');

  return { element: racine, ratio: viewBox[2] / viewBox[3], retraits: Array.from(retraits), erreur: null };
}

// --- Animations par défaut, utilisées tant que l'utilisateur n'a rien enregistré
export const SVG_COURSE_DEFAUT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120">
  <style>
    :root {
      --couleur-tete: #5865F2;
      --couleur-torse: #5865F2;
      --couleur-bras: #5865F2;
      --couleur-jambes: #5865F2;
    }
    .corps { animation: rebond 0.5s ease-in-out infinite; transform-origin: 50px 60px; }
    .membre { stroke-width: 7; stroke-linecap: round; fill: none; }
    .membre-torse { stroke: var(--couleur-torse, #5865F2); }
    .membre-bras { stroke: var(--couleur-bras, #5865F2); }
    .membre-jambe { stroke: var(--couleur-jambes, #5865F2); }
    .tete { fill: var(--couleur-tete, #5865F2); }
    .jambe-a { animation: balance 0.5s ease-in-out infinite alternate; transform-origin: 50px 66px; }
    .jambe-b { animation: balance 0.5s ease-in-out infinite alternate-reverse; transform-origin: 50px 66px; }
    .bras-a { animation: balance 0.5s ease-in-out infinite alternate-reverse; transform-origin: 52px 40px; }
    .bras-b { animation: balance 0.5s ease-in-out infinite alternate; transform-origin: 52px 40px; }
    @keyframes balance { from { transform: rotate(-38deg); } to { transform: rotate(38deg); } }
    @keyframes rebond { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  </style>
  <g class="corps">
    <path class="membre membre-bras bras-b" d="M52 40 L44 58 L52 70" opacity="0.6"/>
    <path class="membre membre-jambe jambe-b" d="M50 66 L44 90 L48 112" opacity="0.6"/>
    <path class="membre membre-torse" d="M50 66 L54 36"/>
    <path class="membre membre-jambe jambe-a" d="M50 66 L44 90 L48 112"/>
    <path class="membre membre-bras bras-a" d="M52 40 L44 58 L52 70"/>
    <circle class="tete" cx="57" cy="22" r="11"/>
  </g>
</svg>`;

export const SVG_REPOS_DEFAUT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120">
  <style>
    :root {
      --couleur-tete: #23A559;
      --couleur-torse: #23A559;
      --couleur-bras: #23A559;
      --couleur-jambes: #23A559;
      --couleur-sommeil: #949CF7;
    }
    .membre { stroke-width: 7; stroke-linecap: round; fill: none; }
    .membre-jambe { stroke: var(--couleur-jambes, #23A559); }
    .membre-torse { stroke: var(--couleur-torse, #23A559); }
    .membre-bras { stroke: var(--couleur-bras, #23A559); }
    .tete { fill: var(--couleur-tete, #23A559); }
    .souffle { animation: souffle 3s ease-in-out infinite; transform-origin: 50px 112px; }
    .z { font: bold 14px sans-serif; fill: var(--couleur-sommeil, #949CF7); animation: flotte 3s ease-in-out infinite; }
    .z2 { animation-delay: 1.5s; }
    @keyframes souffle { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.03); } }
    @keyframes flotte {
      0% { transform: translate(0, 0); opacity: 0; }
      30% { opacity: 1; }
      100% { transform: translate(10px, -22px); opacity: 0; }
    }
  </style>
  <g class="souffle">
    <path class="membre membre-jambe" d="M50 70 L46 92 L46 112"/>
    <path class="membre membre-jambe" d="M50 70 L56 92 L58 112"/>
    <path class="membre membre-torse" d="M50 70 L50 40"/>
    <path class="membre membre-bras" d="M50 44 L40 62 L42 72"/>
    <path class="membre membre-bras" d="M50 44 L60 62 L58 72"/>
    <circle class="tete" cx="50" cy="26" r="11"/>
  </g>
  <text class="z" x="64" y="20">z</text>
  <text class="z z2" x="70" y="14">z</text>
</svg>`;

export {
  extraireVariablesSvg,
  normaliserCouleursCoureur,
  lireCouleursCoureurLocales,
  ecrireCouleursCoureurLocales,
  LABELS_PARTIES_CORPS,
} from './couleursCoureur';

export const ANIMATIONS_COUREUR_VIDES = { course: null, repos: null };

// Mode invité : les animations sont gardées dans ce navigateur
const CLE_LOCALE = 'animationsCoureur';

export const lireAnimationsLocales = () => {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_LOCALE) || 'null');
    return {
      course: typeof brut?.course === 'string' ? brut.course : null,
      repos: typeof brut?.repos === 'string' ? brut.repos : null,
    };
  } catch {
    return ANIMATIONS_COUREUR_VIDES;
  }
};

export const ecrireAnimationsLocales = (animations) => {
  try {
    localStorage.setItem(CLE_LOCALE, JSON.stringify(animations));
  } catch {
    // stockage plein ou indisponible : l'animation reste active pour la session
  }
};

// --- Position et taille du coureur, réglables dans l'onglet « Coureur ».
// x / y : décalage en pixels depuis sa place par défaut (à droite du chrono) ;
// echelle : multiplicateur de sa hauteur par défaut (10 % du chronomètre).
export const BORNES_AFFICHAGE_COUREUR = {
  x: { min: -400, max: 400, pas: 1 },
  y: { min: -250, max: 250, pas: 1 },
  echelle: { min: 0.5, max: 6, pas: 0.05 },
};

export const AFFICHAGE_COUREUR_DEFAUT = { x: 0, y: 0, echelle: 1 };

const borner = (valeur, { min, max }, defaut) => {
  const n = Number(valeur);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut;
};

export const normaliserAffichageCoureur = (affichage) => ({
  x: borner(affichage?.x, BORNES_AFFICHAGE_COUREUR.x, 0),
  y: borner(affichage?.y, BORNES_AFFICHAGE_COUREUR.y, 0),
  echelle: borner(affichage?.echelle, BORNES_AFFICHAGE_COUREUR.echelle, 1),
});

const CLE_AFFICHAGE_LOCAL = 'affichageCoureur';

export const lireAffichageLocal = () => {
  try {
    return normaliserAffichageCoureur(JSON.parse(localStorage.getItem(CLE_AFFICHAGE_LOCAL) || 'null'));
  } catch {
    return AFFICHAGE_COUREUR_DEFAUT;
  }
};

export const ecrireAffichageLocal = (affichage) => {
  try {
    localStorage.setItem(CLE_AFFICHAGE_LOCAL, JSON.stringify(affichage));
  } catch {
    // stockage indisponible : le réglage reste actif pour la session
  }
};
