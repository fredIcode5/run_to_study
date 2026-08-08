import React, { useEffect, useRef, useState } from "react";

// Le même chemin (path) que ton SVG, utilisé à la fois pour le tracé
// et comme trajectoire des points animés.
const LOOP_PATH =
  "M 400,200 C 540,360 750,360 750,200 C 750,40 540,40 400,200 C 260,360 50,360 50,200 C 50,40 260,40 400,200 Z";

// Transformation appliquée au groupe <g> (doit matcher le SVG)
const CX = 400;
const CY = 200;
const SCALE_Y = 0.42;
const ROTATE_DEG = -2;

// Applique la même transform que le <g> à un point (x,y) exprimé
// dans le repère du path d'origine, pour obtenir sa position réelle à l'écran.
function applyGroupTransform(x, y) {
  let px = x - CX;
  let py = y - CY;
  const rad = (ROTATE_DEG * Math.PI) / 180;
  const rx = px * Math.cos(rad) - py * Math.sin(rad);
  const ry = px * Math.sin(rad) + py * Math.cos(rad);
  const sx = rx * 1;
  const sy = ry * SCALE_Y;
  return { x: sx + CX, y: sy + CY };
}

const DURATION = 22000; // durée d'un tour complet (en millisecondes) - augmenté pour réduire la vitesse
const PERP_LENGTH = 70; // longueur de la ligne perpendiculaire
const AVATAR_RADIUS = 24;

// Configuration des 6 points : couleur, décalage de phase sur la boucle (0-1).
// Le trait est toujours vertical (comme un piquet) : il ne suit plus la
// tangente de la courbe, donc il ne "balance" jamais de gauche à droite.
const POINTS = [
  { id: "p0", color: "#FFFFFF", phase: 0, isPlayer: true },
  { id: "p1", color: "#22c55e", phase: 0.25, isPlayer: false },
  { id: "p2", color: "#3b82f6", phase: 0.5, isPlayer: false },
  { id: "p3", color: "#eab308", phase: 0.75, isPlayer: false },
];

export default function InfiniteLoopAnimation({ enMarche, photoProfil, dureeTotale = 1500, phase = 'travail', resetKey = 0, secondesRestantes = 0 }) {
  const pathRef = useRef(null);
  const [animState, setAnimState] = useState({ pointsState: null, progress: 0, totalLength: 0 });
  const accumulatedTimeRef = useRef(0);
  const lastTimestampRef = useRef(null);
  const enMarcheRef = useRef(enMarche);

  useEffect(() => {
    enMarcheRef.current = enMarche;
  }, [enMarche]);

  useEffect(() => {
    accumulatedTimeRef.current = 0;
  }, [phase, resetKey]);

  useEffect(() => {
    const pathEl = pathRef.current;
    if (!pathEl) return;
    const totalLength = pathEl.getTotalLength();
    let rafId;

    const tick = (timestamp) => {
      if (lastTimestampRef.current === null) lastTimestampRef.current = timestamp;
      const delta = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      if (enMarcheRef.current) {
        accumulatedTimeRef.current += delta;
      }

      const safeDuree = dureeTotale > 0 ? dureeTotale : 1;
      const fillProgress = Math.min(accumulatedTimeRef.current / (safeDuree * 1000), 1);

      const results = POINTS.map((cfg) => {
        const pointProgress = (((accumulatedTimeRef.current / DURATION) + cfg.phase) % 1 + 1) % 1;
        const dist = pointProgress * totalLength;

        const p1 = pathEl.getPointAtLength(dist);

        // Position du point converti en coordonnées écran (après transform du <g>)
        const pointScreen = applyGroupTransform(p1.x, p1.y);

        // Le "piquet" : toujours vertical, toujours vers le bas, en
        // coordonnées écran directement -> ne suit plus la tangente de la
        // courbe, donc aucune oscillation gauche/droite, toujours parallèle.
        const perpEndScreen = {
          x: pointScreen.x,
          y: pointScreen.y - PERP_LENGTH,
        };

        return {
          id: cfg.id,
          color: cfg.color,
          isPlayer: cfg.isPlayer,
          point: pointScreen,
          perpEnd: perpEndScreen,
        };
      });

      setAnimState({ pointsState: results, progress: fillProgress, totalLength });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="flex items-center justify-center pointer-events-auto">
      <svg
        width="680"
        viewBox="0 0 800 400"
        xmlns="http://www.w3.org/2000/svg"
        style={{ marginBottom: '-30px', marginTop: '-10px' }}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="avatarClip">
            <circle cx="0" cy="0" r={AVATAR_RADIUS} />
          </clipPath>
        </defs>

        <g transform={`translate(${CX}, ${CY}) scale(1, ${SCALE_Y}) rotate(${ROTATE_DEG}) translate(${-CX}, ${-CY})`}>
          {/* Piste violette */}
          <path
            d={LOOP_PATH}
            fill="none"
            stroke="#0000001e"
            strokeWidth="36"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Ligne blanche centrale — sert aussi de trajectoire (ref) */}
          <path
            ref={pathRef}
            d={LOOP_PATH}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />
          {/* Ligne de progression colorée */}
          {animState.totalLength > 0 && (
            <path
              d={LOOP_PATH}
              fill="none"
              stroke={phase === 'travail' ? '#22c55e' : '#3b82f6'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={animState.totalLength}
              strokeDashoffset={animState.totalLength * (1 - animState.progress)}
              filter="url(#glow)"
            />
          )}
        </g>

        {/* Textes intégrés aux boucles */}
        {/* Boucle gauche : Phase (Travail / Pause) */}
        <foreignObject x="125" y="170" width="200" height="60">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', height: '100%', color: '#FFFFFF', fontSize: '24px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 'bold', opacity: 0.9 }}>
            {phase === 'travail' ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M152,88a32,32,0,1,0-32-32A32,32,0,0,0,152,88Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,152,40Zm67.31,100.68c-.61.28-7.49,3.28-19.67,3.28-13.85,0-34.55-3.88-60.69-20a169.31,169.31,0,0,1-15.41,32.34,104.29,104.29,0,0,1,31.31,15.81C173.92,186.65,184,207.35,184,232a8,8,0,0,1-16,0c0-41.7-34.69-56.71-54.14-61.85-.55.7-1.12,1.41-1.69,2.1-19.64,23.8-44.25,36.18-71.63,36.18A92.29,92.29,0,0,1,31.2,208,8,8,0,0,1,32.8,192c25.92,2.58,48.47-7.49,67-30,12.49-15.14,21-33.61,25.25-47C86.13,92.35,61.27,111.63,61,111.84A8,8,0,1,1,51,99.36c1.5-1.2,37.22-29,89.51,6.57,45.47,30.91,71.93,20.31,72.18,20.19a8,8,0,1,1,6.63,14.56Z"></path>
                </svg>
                Travail
              </>
            ) : (
              '☕ Pause'
            )}
          </div>
        </foreignObject>

        {/* Boucle droite : Chronomètre (secondesRestantes) */}
        <text 
          x="575" 
          y="200" 
          fill="#FFFFFF" 
          fontSize="36" 
          fontFamily="'Space Grotesk', sans-serif" 
          fontWeight="bold" 
          textAnchor="middle" 
          dominantBaseline="middle"
          opacity="0.9"
        >
          {Math.floor(secondesRestantes / 60).toString().padStart(2, '0')}:{(secondesRestantes % 60).toString().padStart(2, '0')}
        </text>

        {/* Points, lignes perpendiculaires et avatars — dessinés hors du <g>
            car les coordonnées écran sont déjà calculées via applyGroupTransform */}
        {animState.pointsState &&
          animState.pointsState.map((pt) => (
            <g key={pt.id}>
              {/* Ligne perpendiculaire */}
              <line
                x1={pt.point.x}
                y1={pt.point.y}
                x2={pt.perpEnd.x}
                y2={pt.perpEnd.y}
                stroke={pt.color}
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.8"
              />

              {/* Point sur la ligne blanche */}
              <circle
                cx={pt.point.x}
                cy={pt.point.y}
                r={pt.isPlayer ? "7" : "5"}
                fill={pt.color}
                filter="url(#glow)"
              />

              {/* Rond avatar au bout de la perpendiculaire */}
              <g transform={`translate(${pt.perpEnd.x}, ${pt.perpEnd.y})`}>
                <circle
                  r={AVATAR_RADIUS + 3}
                  fill="#1a1a2e"
                  stroke={pt.color}
                  strokeWidth="2"
                />
                <g clipPath="url(#avatarClip)">
                  <circle r={AVATAR_RADIUS} fill="#3a3a4a" />
                  {pt.isPlayer && photoProfil?.dataUrl ? (
                    <foreignObject x={-AVATAR_RADIUS} y={-AVATAR_RADIUS} width={AVATAR_RADIUS * 2} height={AVATAR_RADIUS * 2}>
                      <img
                        src={photoProfil.dataUrl}
                        alt="Avatar"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: `${photoProfil.position?.x ?? 50}% ${photoProfil.position?.y ?? 50}%`,
                          borderRadius: '50%'
                        }}
                      />
                    </foreignObject>
                  ) : (
                    <>
                      {/* Icône silhouette placeholder */}
                      <circle cx="0" cy="-5" r="7" fill="#8a8a9a" />
                      <path
                        d={`M ${-AVATAR_RADIUS},${AVATAR_RADIUS + 9}
                            C ${-AVATAR_RADIUS},${7} ${-9},${5} 0,${5}
                            C ${9},${5} ${AVATAR_RADIUS},${7} ${AVATAR_RADIUS},${AVATAR_RADIUS + 9} Z`}
                        fill="#8a8a9a"
                      />
                    </>
                  )}
                </g>
              </g>
            </g>
          ))}
      </svg>
    </div>
  );
}