import React, { memo, useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import AnimationsCoureur from './AnimationsCoureur';

// Les autres coureurs ont exactement la taille du coureur principal et courent
// sur sa ligne : la piste a sa hauteur et commence juste à sa droite.
// Largeur de la piste en hauteurs de coureur ; en deçà de LARGEUR_MIN, elle se masque
const LARGEUR_MIN = 2;
const LARGEUR_MAX = 14;
// Éléments fixes que la piste ne doit pas recouvrir (menu latéral : poignée
// toujours, panneau entier lorsqu'il est ouvert ; titre et boutons de la
// session sous le chrono, sur petit écran)
const ELEMENTS_A_EVITER = [
  '.actions_bas_page', '.panel_poignee', '.panel:not(.panel--collapsed)', '.barre_joueur_musique_flottante',
  '.chrono_titre_session', '.chrono_emplacement_actions--dessous .chrono_actions_session',
];
const MARGE = 12;
const ECART = 10;
const PAS_CLAVIER = 0.05;

const borner = (valeur) => Math.min(1, Math.max(0, valeur));
const arrondir = (valeur) => Number(valeur.toFixed(3));

// --- Un coureur de la piste, déplaçable le long de la ligne au glisser-déposer
// (souris, tactile, stylet) ou aux flèches du clavier. Pendant le glissement, la
// position est locale ; elle n'est enregistrée qu'au lâcher.
// Profondeur : position.y fixe le plan (0 derrière, 1 devant) des coureurs qui
// se chevauchent.
const CoureurPiste = memo(function CoureurPiste({
  joueur, largeurPiste, hauteurCoureur, codeCourse, codeRepos, ratioCourse, ratioRepos, auRepos, resetKey, onDeplacer,
}) {
  const [xGlisse, setXGlisse] = useState(null);
  const glissementRef = useRef(null);

  const x = xGlisse ?? joueur.position.x;
  const largeur = Math.round(hauteurCoureur * (auRepos ? ratioRepos : ratioCourse));
  const libreX = Math.max(0, largeurPiste - largeur);

  const deplacer = (nouveauX) => onDeplacer(joueur.id, { ...joueur.position, x: arrondir(nouveauX) });

  const commencer = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    glissementRef.current = { pointeurX: e.clientX, depart: x, libreX, x };
    setXGlisse(x);
  };

  const glisser = (e) => {
    const g = glissementRef.current;
    if (!g) return;
    g.x = borner(g.depart + (e.clientX - g.pointeurX) / (g.libreX || 1));
    setXGlisse(g.x);
  };

  const lacher = () => {
    const g = glissementRef.current;
    if (!g) return;
    glissementRef.current = null;
    setXGlisse(null);
    deplacer(g.x);
  };

  const deplacerAuClavier = (e) => {
    const sens = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!sens) return;
    e.preventDefault();
    deplacer(borner(x + sens * PAS_CLAVIER));
  };

  return (
    <div
      className={`piste_coureur${xGlisse !== null ? ' piste_coureur--deplace' : ''}`}
      style={{
        left: `${Math.round(x * libreX)}px`,
        top: 0,
        width: `${largeur}px`,
        height: `${hauteurCoureur}px`,
        zIndex: 1 + Math.round(joueur.position.y * 100),
        '--piste-coureur-couleur': joueur.couleur,
      }}
      role="button"
      tabIndex={0}
      aria-label={`${joueur.nom} : à déplacer avec la souris, au doigt ou avec les flèches gauche et droite`}
      onPointerDown={commencer}
      onPointerMove={glisser}
      onPointerUp={lacher}
      onPointerCancel={lacher}
      onKeyDown={deplacerAuClavier}
    >
      <AnimationsCoureur
        codeCourse={codeCourse}
        codeRepos={codeRepos}
        ratioCourse={ratioCourse}
        ratioRepos={ratioRepos}
        hauteur={hauteurCoureur}
        auRepos={auRepos}
        resetKey={resetKey}
        couleurs={joueur.couleurs}
        titreCourse={`${joueur.nom} en course`}
        titreRepos={`${joueur.nom} au repos`}
      />
      <span className="piste_coureur_nom" aria-hidden="true">{joueur.nom}</span>
    </div>
  );
});

// Espace horizontal libre dans la bande [haut, haut + hauteur] de l'écran,
// entre gauche et droite, une fois écartés les éléments fixes qui la croisent ;
// aGauche : obstacles supplémentaires situés à gauche de la piste
const espaceLibre = (haut, hauteur, gauche, droite, aGauche = []) => {
  let g = Math.max(gauche, MARGE);
  let d = Math.min(droite, window.innerWidth - MARGE);
  const croise = (o) => o.width > 0 && o.bottom > haut && o.top < haut + hauteur;
  document.querySelectorAll(ELEMENTS_A_EVITER.join(',')).forEach((element) => {
    const o = element.getBoundingClientRect();
    if (!croise(o)) return;
    if (o.left + o.width / 2 > window.innerWidth / 2) d = Math.min(d, o.left - MARGE);
    else g = Math.max(g, o.right + MARGE);
  });
  aGauche.filter(croise).forEach((o) => { g = Math.max(g, o.right + MARGE); });
  return { g, d };
};

// --- Piste de course : ligne où courent les coureurs des autres joueurs, au
// niveau du coureur de l'utilisateur et à sa droite. Volontairement invisible
// (ni fond ni titre) : seuls les coureurs s'affichent, avec sous leurs pieds une
// ligne de tirets qui défile vers la gauche tant qu'ils courent.
// Le coureur de l'utilisateur, en tête, garde sa place réglée dans « Coureur » ;
// la piste se cale sur sa position réelle à l'écran.
function PisteDeCourse({
  joueurs, hauteurCoureur, codeCourse, codeRepos, ratioCourse, ratioRepos, auRepos, resetKey, onDeplacerJoueur, opaciteLigne,
}) {
  const ligneRef = useRef(null);
  const avecJoueurs = joueurs.length > 0;
  // Positions (relatives au chronomètre) et largeurs de la piste et de la ligne ;
  // masquées jusqu'à la première mesure
  const [cadre, setCadre] = useState({
    left: 0, top: 0, largeur: hauteurCoureur * LARGEUR_MIN, masquee: true, ligneLeft: 0, ligneLargeur: 0,
  });

  const mesurer = useCallback(() => {
    const zoneEl = ligneRef.current?.parentElement;
    const coureurEl = zoneEl?.querySelector(':scope > .coureur');
    if (!zoneEl || !coureurEl) return;
    const zone = zoneEl.getBoundingClientRect();
    const coureur = coureurEl.getBoundingClientRect();
    const largeurMin = hauteurCoureur * LARGEUR_MIN;
    const largeurMax = hauteurCoureur * LARGEUR_MAX;

    // Sur la ligne du coureur principal : à sa droite…
    const droite = espaceLibre(coureur.top, coureur.height, coureur.right + ECART, Infinity);
    let ecran;
    if (droite.d - droite.g >= largeurMin) {
      ecran = { left: droite.g, largeur: Math.min(droite.d - droite.g, largeurMax) };
    } else {
      // …ou à sa gauche faute de place (petits écrans, où il touche le bord
      // droit), sans recouvrir le chronomètre
      const gauche = espaceLibre(coureur.top, coureur.height, -Infinity, coureur.left - ECART, [zone]);
      const largeur = Math.min(gauche.d - gauche.g, largeurMax);
      ecran = { left: gauche.d - largeur, largeur };
    }
    const masquee = ecran.largeur < largeurMin;

    // Ligne : sous le coureur principal (un peu plus large que lui) et, s'il y en
    // a, sous toute la piste des autres coureurs
    const debord = Math.round(hauteurCoureur * 0.3);
    let ligneGauche = coureur.left - debord;
    let ligneDroite = coureur.right + debord;
    if (avecJoueurs && !masquee) {
      ligneGauche = Math.min(ligneGauche, ecran.left);
      ligneDroite = Math.max(ligneDroite, ecran.left + ecran.largeur);
    }

    const suivant = {
      left: Math.round(ecran.left - zone.left),
      top: Math.round(coureur.top - zone.top),
      largeur: Math.round(ecran.largeur),
      masquee,
      ligneLeft: Math.round(ligneGauche - zone.left),
      ligneLargeur: Math.round(ligneDroite - ligneGauche),
    };
    setCadre((actuel) => (Object.keys(suivant).every((k) => actuel[k] === suivant[k]) ? actuel : suivant));
  }, [hauteurCoureur, avecJoueurs]);
  useLayoutEffect(mesurer);
  useEffect(() => {
    window.addEventListener('resize', mesurer);
    return () => window.removeEventListener('resize', mesurer);
  }, [mesurer]);

  const largeurPiste = Math.max(0, cadre.largeur);
  // Tirets proportionnés à la taille des coureurs
  const tiret = Math.max(6, Math.round(hauteurCoureur * 0.4));
  const pas = tiret + Math.max(4, Math.round(hauteurCoureur * 0.3));

  return (
    <>
      <div
        ref={ligneRef}
        className={`piste_ligne${auRepos ? '' : ' piste_ligne--defile'}`}
        aria-hidden="true"
        style={{
          left: `${cadre.ligneLeft}px`,
          top: `${cadre.top + hauteurCoureur}px`,
          width: `${cadre.ligneLargeur}px`,
          opacity: opaciteLigne,
          '--ligne-tiret': `${tiret}px`,
          '--ligne-pas': `${pas}px`,
          '--ligne-epaisseur': `${Math.max(2, Math.round(hauteurCoureur / 12))}px`,
        }}
      />
      {avecJoueurs && (
        <div
          className="piste_course"
          role="group"
          aria-label="Piste de course"
          aria-hidden={cadre.masquee || undefined}
          style={{
            left: `${cadre.left}px`,
            top: `${cadre.top}px`,
            width: `${largeurPiste}px`,
            height: `${hauteurCoureur}px`,
            visibility: cadre.masquee ? 'hidden' : undefined,
          }}
        >
          {joueurs.map((joueur) => (
            <CoureurPiste
              key={joueur.id}
              joueur={joueur}
              largeurPiste={largeurPiste}
              hauteurCoureur={hauteurCoureur}
              codeCourse={codeCourse}
              codeRepos={codeRepos}
              ratioCourse={ratioCourse}
              ratioRepos={ratioRepos}
              auRepos={auRepos}
              resetKey={resetKey}
              onDeplacer={onDeplacerJoueur}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default PisteDeCourse;
