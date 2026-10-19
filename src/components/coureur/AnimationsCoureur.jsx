import React from 'react';
import AnimationSvg from './AnimationSvg';

// --- Les deux animations d'un coureur (course / repos), superposées. Elles
// restent montées ; seule la visibilité bascule, si bien qu'un changement de
// phase ne recharge ni ne redémarre aucun SVG.
function AnimationsCoureur({ codeCourse, codeRepos, ratioCourse, ratioRepos, hauteur, auRepos, resetKey, couleurs, titreCourse, titreRepos }) {
  return (
    <>
      <AnimationSvg
        code={codeCourse}
        couleurs={couleurs}
        className={`coureur_animation${auRepos ? '' : ' coureur_animation--active'}`}
        style={{ width: `${Math.round(hauteur * ratioCourse)}px` }}
        enPause={auRepos}
        resetKey={resetKey}
        titre={titreCourse}
      />
      <AnimationSvg
        code={codeRepos}
        couleurs={couleurs}
        className={`coureur_animation${auRepos ? ' coureur_animation--active' : ''}`}
        style={{ width: `${Math.round(hauteur * ratioRepos)}px` }}
        enPause={!auRepos}
        resetKey={resetKey}
        titre={titreRepos}
      />
    </>
  );
}

export default AnimationsCoureur;
