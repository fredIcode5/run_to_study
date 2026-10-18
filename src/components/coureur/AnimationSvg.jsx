import React, { useLayoutEffect, useEffect, useMemo, useRef } from 'react';
import { assainirSvg } from './svgCoureur';

// Styles internes du shadow DOM : le SVG remplit l'hôte, et ses propres
// <style> restent confinés (ils ne fuient pas dans l'application)
const STYLE_HOTE = ':host{display:block;width:100%;height:100%}svg{display:block;width:100%;height:100%;overflow:visible}';

// Met en pause / relance toutes les animations du SVG : SMIL et CSS
const appliquerLecture = (racine, enPause) => {
  const svg = racine.querySelector('svg');
  if (!svg) return;
  if (enPause) svg.pauseAnimations?.();
  else svg.unpauseAnimations?.();
  racine.getAnimations?.().forEach((animation) => (enPause ? animation.pause() : animation.play()));
};

const remettreAZero = (racine) => {
  racine.querySelector('svg')?.setCurrentTime?.(0);
  racine.getAnimations?.().forEach((animation) => { animation.currentTime = 0; });
};

// --- Rendu isolé d'un SVG animé : assaini, inséré dans un shadow DOM (sans
// re-analyse HTML), et piloté de l'extérieur. Le SVG n'est réinséré que si
// son code change : les mises à jour du chronomètre ne le rechargent jamais.
function AnimationSvg({ code, enPause = false, resetKey, className, style, titre }) {
  const hoteRef = useRef(null);
  const enPauseRef = useRef(enPause);
  enPauseRef.current = enPause;
  const resultat = useMemo(() => assainirSvg(code), [code]);

  useLayoutEffect(() => {
    const hote = hoteRef.current;
    const racine = hote.shadowRoot || hote.attachShadow({ mode: 'open' });
    racine.replaceChildren();
    const style = document.createElement('style');
    style.textContent = STYLE_HOTE;
    racine.appendChild(style);
    if (resultat.element) racine.appendChild(document.importNode(resultat.element, true));
    appliquerLecture(racine, enPauseRef.current);
  }, [resultat]);

  useEffect(() => {
    if (hoteRef.current?.shadowRoot) appliquerLecture(hoteRef.current.shadowRoot, enPause);
  }, [enPause]);

  // Réinitialisation du chronomètre : l'animation repart de son début
  const premierResetRef = useRef(true);
  useEffect(() => {
    if (premierResetRef.current) { premierResetRef.current = false; return; }
    if (hoteRef.current?.shadowRoot) remettreAZero(hoteRef.current.shadowRoot);
  }, [resetKey]);

  return (
    <div
      ref={hoteRef}
      className={className}
      style={style}
      role="img"
      aria-label={titre}
      data-ratio={resultat.ratio}
    />
  );
}

export default AnimationSvg;
