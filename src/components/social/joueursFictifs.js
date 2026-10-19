// --- Joueurs de la Piste de course (version de test).
// Un joueur affiché à côté du coureur de l'utilisateur :
//   { id, nom, couleur, couleurs, position: { x, y }, origine, fictif }
//   - couleurs : variables CSS appliquées à son coureur SVG (même système que
//     la personnalisation du coureur principal)
//   - position : x = fraction (0 → 1) de la longueur libre de la piste, si bien
//     qu'un coureur reste dans ses limites quelle que soit sa taille ;
//     y = plan (0 derrière → 1 devant) quand des coureurs se chevauchent
//   - origine : bouton qui l'a ajouté ('ami' | 'rejoindre' | 'marathon')
//   - fictif : true pour les données de test ; les futurs joueurs connectés
//     auront fictif: false et un id issu du serveur

export const ORIGINES_JOUEUR = {
  ami: 'Ami',
  rejoindre: 'Rejoindre',
  marathon: 'Marathon',
};

// Couleurs distinctes et lisibles sur fond sombre comme sur une image ; le
// bleu (course) et le vert (repos) par défaut du coureur principal en sont exclus
export const PALETTE_JOUEURS = [
  '#F23F43', '#FF7A1A', '#F0B232', '#C9E265', '#1ABC9C', '#00A8FC', '#A970FF',
  '#E84C9D', '#FF9FC6', '#B5651D', '#F4F6FB', '#8E9297', '#D4AC6E',
];

// Liste d'amis de TEST : même forme que les amis renvoyés par getAmis()
// (amiId, pseudo), pour être remplacée telle quelle par la vraie liste
export const AMIS_TEST = [
  { amiId: 'test_camille', pseudo: 'Camille', couleur: '#E84C9D' },
  { amiId: 'test_hugo', pseudo: 'Hugo', couleur: '#1ABC9C' },
  { amiId: 'test_ines', pseudo: 'Inès', couleur: '#F0B232' },
  { amiId: 'test_malo', pseudo: 'Malo', couleur: '#00A8FC' },
  { amiId: 'test_zoe', pseudo: 'Zoé', couleur: '#A970FF' },
  { amiId: 'test_yanis', pseudo: 'Yanis', couleur: '#FF7A1A' },
];

// Identités des joueurs aléatoires : « animal + qualificatif » accordé
const ANIMAUX_MASCULINS = ['Guépard', 'Lièvre', 'Faucon', 'Renard', 'Loup', 'Zèbre', 'Lynx', 'Mustang', 'Puma', 'Koala', 'Chamois'];
const ANIMAUX_FEMININS = ['Gazelle', 'Panthère', 'Antilope', 'Hirondelle'];
const QUALIFICATIFS = [
  ['agile', 'agile'], ['rapide', 'rapide'], ['zen', 'zen'], ['tenace', 'tenace'], ['lunaire', 'lunaire'],
  ['solaire', 'solaire'], ['filant', 'filante'], ['discret', 'discrète'], ['fougueux', 'fougueuse'],
  ['léger', 'légère'], ['matinal', 'matinale'], ['nocturne', 'nocturne'],
];
const NOMS_FICTIFS = [
  ...ANIMAUX_MASCULINS.flatMap((a) => QUALIFICATIFS.map(([m]) => `${a} ${m}`)),
  ...ANIMAUX_FEMININS.flatMap((a) => QUALIFICATIFS.map(([, f]) => `${a} ${f}`)),
];

// Parties du coureur teintes à la couleur du joueur ; visage, cheveux,
// chaussures et effet de repos gardent les couleurs du dessin
const VARIABLES_TENUE = [
  '--couleur-tete', '--couleur-torse', '--couleur-corps', '--couleur-bras', '--couleur-bras-gauche',
  '--couleur-bras-droit', '--couleur-mains', '--couleur-jambes', '--couleur-jambe-gauche',
  '--couleur-jambe-droite', '--couleur-accessoires',
];
const VARIABLES_SHORT = ['--couleur-short', '--couleur-fessier'];

const assombrir = (hex, taux) => `#${[1, 3, 5]
  .map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - taux)).toString(16).padStart(2, '0'))
  .join('')}`;

const couleursCoureur = (couleur) => {
  const short = assombrir(couleur, 0.35);
  return Object.fromEntries([
    ...VARIABLES_TENUE.map((v) => [v, couleur]),
    ...VARIABLES_SHORT.map((v) => [v, short]),
  ]);
};

const auHasard = (liste) => liste[Math.floor(Math.random() * liste.length)];

// Couleur la moins portée par les joueurs déjà présents (au hasard entre ex æquo)
const choisirCouleur = (joueurs) => {
  const compte = new Map(PALETTE_JOUEURS.map((c) => [c, 0]));
  joueurs.forEach((j) => compte.has(j.couleur) && compte.set(j.couleur, compte.get(j.couleur) + 1));
  const minimum = Math.min(...compte.values());
  return auHasard(PALETTE_JOUEURS.filter((c) => compte.get(c) === minimum));
};

// Nom absent de la piste ; une fois toutes les combinaisons prises, numéroté
const choisirNom = (joueurs) => {
  const pris = new Set(joueurs.map((j) => j.nom));
  const libres = NOMS_FICTIFS.filter((n) => !pris.has(n));
  if (libres.length > 0) return auHasard(libres);
  const base = auHasard(NOMS_FICTIFS);
  let numero = 2;
  while (pris.has(`${base} ${numero}`)) numero += 1;
  return `${base} ${numero}`;
};

// Le peloton reste groupé : sa longueur grandit avec le nombre de coureurs.
// Parmi quelques places tirées au hasard sur la ligne, on garde la plus
// éloignée des autres coureurs : chevauchements partiels, sans silhouettes
// empilées. Le plan est tiré au hasard.
const CANDIDATS = 6;

const choisirPosition = (joueurs) => {
  const etendue = Math.min(1, 0.25 + joueurs.length * 0.06);
  let meilleurX = 0;
  let meilleurEcart = -1;
  for (let i = 0; i < CANDIDATS; i += 1) {
    const x = Math.random() * etendue;
    const ecart = joueurs.reduce((min, j) => Math.min(min, Math.abs(j.position.x - x)), Infinity);
    if (ecart > meilleurEcart) {
      meilleurX = x;
      meilleurEcart = ecart;
    }
  }
  return { x: Number(meilleurX.toFixed(3)), y: Number(Math.random().toFixed(3)) };
};

let compteurIds = 0;
const nouvelId = () => {
  compteurIds += 1;
  return `fictif_${Date.now().toString(36)}_${compteurIds}`;
};

const creerJoueur = ({ id, nom, couleur, origine }, joueurs) => ({
  id,
  nom,
  couleur,
  couleurs: couleursCoureur(couleur),
  position: choisirPosition(joueurs),
  origine,
  fictif: true,
});

export const idJoueurAmi = (ami) => `fictif_ami_${ami.amiId}`;

export const creerJoueurAmi = (ami, joueurs) => creerJoueur({
  id: idJoueurAmi(ami),
  nom: ami.pseudo,
  couleur: ami.couleur || choisirCouleur(joueurs),
  origine: 'ami',
}, joueurs);

// Crée exactement `nombre` joueurs aléatoires, distincts entre eux et de ceux
// déjà présents (identifiant, nom et, autant que possible, couleur)
export const genererJoueursFictifs = (nombre, joueurs, origine) => {
  const nouveaux = [];
  for (let i = 0; i < nombre; i += 1) {
    const tous = [...joueurs, ...nouveaux];
    nouveaux.push(creerJoueur({ id: nouvelId(), nom: choisirNom(tous), couleur: choisirCouleur(tous), origine }, tous));
  }
  return nouveaux;
};
