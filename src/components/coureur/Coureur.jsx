import React, { useState, useEffect, useMemo, useRef } from 'react';
import AnimationSvg from './AnimationSvg';
import { assainirSvg, SVG_COURSE_DEFAUT, SVG_REPOS_DEFAUT, AFFICHAGE_COUREUR_DEFAUT } from './svgCoureur';
import './Coureur.css';

// Hauteur du coureur rapportée à celle du chronomètre
const RAPPORT_HAUTEUR = 0.1;

// --- Chronomètre accompagné de son coureur, placé à sa droite.
// La hauteur du chrono entouré sert de référence ; hauteurMin : plancher de
// lisibilité pour un chrono très plat (la barre de progression) ;
// affichage : décalage (x, y en px) et échelle réglés dans l'onglet « Coureur ».
// La phase (travail / pause), l'état marche / arrêt et la réinitialisation
// viennent du chronomètre existant : le coureur n'a aucune horloge à lui.
// Les deux animations restent montées ; seule la visibilité bascule, si bien
// qu'un changement de phase ne recharge ni ne redémarre aucun SVG.
function PisteAvecCoureur({ children, phase, enMarche, resetKey, animations, affichage = AFFICHAGE_COUREUR_DEFAUT, hauteurMin = 0, className = '' }) {
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
          }}
          data-phase={auRepos ? 'repos' : 'course'}
        >
          <AnimationSvg
            code={codeCourse}
            className={`coureur_animation${auRepos ? '' : ' coureur_animation--active'}`}
            style={{ width: `${Math.round(hauteur * ratioCourse)}px` }}
            enPause={auRepos}
            resetKey={resetKey}
            titre="Coureur en course (session de travail)"
          />
          <AnimationSvg
            code={codeRepos}
            className={`coureur_animation${auRepos ? ' coureur_animation--active' : ''}`}
            style={{ width: `${Math.round(hauteur * ratioRepos)}px` }}
            enPause={!auRepos}
            resetKey={resetKey}
            titre="Coureur au repos"
          />
        </div>
      )}
    </div>
  );
}

export default PisteAvecCoureur;
