import React, { useEffect, useRef, useState } from 'react';
import './EcranChargement.css';

const LOOP_PATH =
  "M 400,200 C 540,360 750,360 750,200 C 750,40 540,40 400,200 C 260,360 50,360 50,200 C 50,40 260,40 400,200 Z";

const CX = 400;
const CY = 200;
const SCALE_Y = 0.42;
const ROTATE_DEG = -2;

function applyGroupTransform(x, y) {
  const px = x - CX;
  const py = y - CY;
  const rad = (ROTATE_DEG * Math.PI) / 180;
  const rx = px * Math.cos(rad) - py * Math.sin(rad);
  const ry = px * Math.sin(rad) + py * Math.cos(rad);
  const sx = rx * 1;
  const sy = ry * SCALE_Y;
  return { x: sx + CX, y: sy + CY };
}

const POINTS_CHARGEMENT = [
  { id: "p1", color: "#22c55e", phase: 0.0 },
  { id: "p2", color: "#3b82f6", phase: 0.25 },
  { id: "p3", color: "#eab308", phase: 0.5 },
  { id: "p4", color: "#ec4899", phase: 0.75 },
];

const DUREE_CHARGEMENT_MS = 3000; // 3 secondes
const DUREE_FADEOUT_MS = 700; // 0.7s de transition

export default function EcranChargement({ onTermine, pseudo }) {
  const pathRef = useRef(null);
  const [totalLength, setTotalLength] = useState(0);
  const [progression, setProgression] = useState(0);
  const [disparition, setDisparition] = useState(false);
  const [pointsPositions, setPointsPositions] = useState([]);
  
  const startTimeRef = useRef(null);
  const animationFrameRef = useRef(null);
  const termineRef = useRef(false);

  useEffect(() => {
    const pathEl = pathRef.current;
    if (!pathEl) return;
    const len = pathEl.getTotalLength();
    setTotalLength(len);

    const animer = (timestamp) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const ecoule = timestamp - startTimeRef.current;
      const prog = Math.min(ecoule / DUREE_CHARGEMENT_MS, 1);
      setProgression(prog);

      // Calcul des points lumineux le long de la boucle
      if (len > 0) {
        const positions = POINTS_CHARGEMENT.map((pt) => {
          const ptProg = (((ecoule / 3500) + pt.phase) % 1 + 1) % 1;
          const dist = ptProg * len;
          const coord = pathEl.getPointAtLength(dist);
          const screenCoord = applyGroupTransform(coord.x, coord.y);
          return {
            id: pt.id,
            color: pt.color,
            x: screenCoord.x,
            y: screenCoord.y,
          };
        });
        setPointsPositions(positions);
      }

      if (prog < 1) {
        animationFrameRef.current = requestAnimationFrame(animer);
      } else {
        setDisparition(true);
        setTimeout(() => {
          if (!termineRef.current) {
            termineRef.current = true;
            onTermine?.();
          }
        }, DUREE_FADEOUT_MS);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animer);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onTermine]);

  const pourcentage = Math.round(progression * 100);

  return (
    <div className={`ecran_chargement_overlay ${disparition ? 'ecran_chargement_overlay--fadeout' : ''}`}>
      <div className="ecran_chargement_contenu">
        <img 
          src="/logop.svg" 
          alt="Logo" 
          className="ecran_chargement_logo" 
        />

        <div className="ecran_chargement_titre_container">
          <h2 className="ecran_chargement_titre">
            {pseudo && pseudo !== 'Invité' && pseudo !== 'Pseudo' 
              ? `Bienvenue, ${pseudo}` 
              : 'Préparation de votre espace'}
          </h2>
          <p className="ecran_chargement_sous_titre">
            Chargement de vos réglages et de vos données...
          </p>
        </div>

        <div className="ecran_chargement_svg_container">
          <svg
            width="640"
            viewBox="0 0 800 400"
            xmlns="http://www.w3.org/2000/svg"
            className="ecran_chargement_svg"
          >
            <defs>
              <filter id="glow-loading" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g transform={`translate(${CX}, ${CY}) scale(1, ${SCALE_Y}) rotate(${ROTATE_DEG}) translate(${-CX}, ${-CY})`}>
              {/* Piste de fond sombre */}
              <path
                d={LOOP_PATH}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="38"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Ligne directrice centrale */}
              <path
                ref={pathRef}
                d={LOOP_PATH}
                fill="none"
                stroke="rgba(255, 255, 255, 0.25)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Ligne de progression verte qui se remplit */}
              {totalLength > 0 && (
                <path
                  d={LOOP_PATH}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={totalLength}
                  strokeDashoffset={totalLength * (1 - progression)}
                  filter="url(#glow-loading)"
                />
              )}
            </g>

            {/* Points animés lumineux */}
            {pointsPositions.map((pt) => (
              <circle
                key={pt.id}
                cx={pt.x}
                cy={pt.y}
                r="6"
                fill={pt.color}
                filter="url(#glow-loading)"
              />
            ))}

            {/* Pourcentage au centre */}
            <text
              x="400"
              y="205"
              fill="#FFFFFF"
              fontSize="34"
              fontFamily="'Space Grotesk', 'DM Sans', sans-serif"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
              className="ecran_chargement_pourcentage"
            >
              {pourcentage}%
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
