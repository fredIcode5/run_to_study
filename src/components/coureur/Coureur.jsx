import React, { useState, useEffect, useMemo, useRef } from 'react';
import AnimationsCoureur from './AnimationsCoureur';
import PisteDeCourse from './PisteDeCourse';
import { assainirSvg, SVG_COURSE_DEFAUT, SVG_REPOS_DEFAUT, AFFICHAGE_COUREUR_DEFAUT } from './svgCoureur';
import { OPACITE_LIGNE_DEFAUT } from './lignePiste';
import './Coureur.css';

// Hauteur du coureur rapportée à celle du chronomètre
const RAPPORT_HAUTEUR = 0.1;

// --- Chronomètre accompagné de son coureur, placé à sa droite.
// La hauteur du chrono entouré sert de référence ; hauteurMin : plancher de
// lisibilité pour un chrono très plat (la barre de progression) ;
// affichage : décalage (x, y en px) et échelle réglés dans l'onglet « Coureur ».
// La phase (travail / pause), l'état marche / arrêt et la réinitialisation
// viennent du chronomètre existant : le coureur n'a aucune horloge à lui.
// joueurs : autres coureurs, posés sur la Piste de course à côté du sien ; ils
// reprennent ses animations, chacun avec ses propres couleurs.
// opaciteLigne : ligne de tirets qui défile sous les pieds des coureurs.
function PisteAvecCoureur({ children, phase, enMarche, resetKey, animations, affichage = AFFICHAGE_COUREUR_DEFAUT, couleurs = {}, hauteurMin = 0, className = '', joueurs = [], onDeplacerJoueur, opaciteLigne = OPACITE_LIGNE_DEFAUT }) {
  const zoneRef = useRef(null);
  const [hauteurChrono, setHauteurChrono] = useState(0);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return undefined;
    const observateur = new ResizeObserver(() => setHauteurChrono(zone.offsetHeight));
    observateur.observe(zone);
    return () => observateur.disconnect();
  }, []);

  const codeCourse = animations?.course || SVG_COURSE_DEFAUT;
  const codeRepos = animations?.repos || SVG_REPOS_DEFAUT;
  const ratioCourse = useMemo(() => assainirSvg(codeCourse).ratio, [codeCourse]);
  const ratioRepos = useMemo(() => assainirSvg(codeRepos).ratio, [codeRepos]);

  // Le coureur ne court que lorsque le chrono tourne en session de travail ;
  // chrono arrêté (mis en pause, réinitialisé, pas encore lancé) ou phase de
  // pause : il passe à l'animation de repos, qui continue de jouer
  const auRepos = phase === 'pause' || !enMarche;
  const hauteurBase = hauteurChrono > 0 ? Math.max(hauteurMin, hauteurChrono * RAPPORT_HAUTEUR) : 0;
  const hauteur = Math.round(hauteurBase * affichage.echelle);
  const largeur = Math.round(hauteur * (auRepos ? ratioRepos : ratioCourse));

  const styleCouleurs = useMemo(() => {
    const res = {};
    if (couleurs && typeof couleurs === 'object') {
      Object.entries(couleurs).forEach(([k, v]) => {
        if (typeof k === 'string' && k.startsWith('--') && v) {
          res[k] = v;
        }
      });
    }
    return res;
  }, [couleurs]);

  return (
    <div className={`piste_coureur_zone${className ? ` ${className}` : ''}`} ref={zoneRef}>
      {children}
      {hauteur > 0 && (
        <div
          className="coureur"
          style={{
            height: `${hauteur}px`,
            width: `${largeur}px`,
            '--coureur-dx': `${affichage.x}px`,
            '--coureur-dy': `${affichage.y}px`,
            ...styleCouleurs,
          }}
          data-phase={auRepos ? 'repos' : 'course'}
        >
          <AnimationsCoureur
            codeCourse={codeCourse}
            codeRepos={codeRepos}
            ratioCourse={ratioCourse}
            ratioRepos={ratioRepos}
            hauteur={hauteur}
            auRepos={auRepos}
            resetKey={resetKey}
            couleurs={couleurs}
            titreCourse="Coureur en course (session de travail)"
            titreRepos="Coureur au repos"
          />
        </div>
      )}
      {hauteur > 0 && (
        <PisteDeCourse
          joueurs={joueurs}
          hauteurCoureur={hauteur}
          codeCourse={codeCourse}
          codeRepos={codeRepos}
          ratioCourse={ratioCourse}
          ratioRepos={ratioRepos}
          auRepos={auRepos}
          resetKey={resetKey}
          onDeplacerJoueur={onDeplacerJoueur}
          opaciteLigne={opaciteLigne}
        />
      )}
    </div>
  );
}

export default PisteAvecCoureur;
