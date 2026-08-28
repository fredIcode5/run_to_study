import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause } from 'lucide-react';

// --- Chrono : gère le cycle "travail" / "pause" dont les durées sont
// pilotées par les réglages (props dureeTravailMinutes / dureePauseMinutes).
// Les couleurs (chrono, boutons) sont appliquées globalement via des
// variables CSS (voir App > useEffect couleurs), pas via des props ici.
function Chrono({ enMarche, setEnMarche, onSessionTerminee, dureeTravailMinutes, dureePauseMinutes, modeLecture, onPhaseChange, onReset, hideTimeDisplay, renderLoop }) {
  // 'travail' = session Pomodoro classique, 'pause' = pause qui suit
  const [phase, setPhase] = useState('travail');

  const dureeTravail = dureeTravailMinutes * 60;
  const dureePause = dureePauseMinutes * 60;
  const dureeActuelle = phase === 'travail' ? dureeTravail : dureePause;

  const [secondesRestantes, setSecondesRestantes] = useState(dureeActuelle);
  const intervalRef = useRef(null);

  // Avertissement affiché quand on manipule le chrono pendant qu'on
  // consulte une ancienne session (onglet Notes en lecture seule) :
  // le temps de travail ne sera pas comptabilisé dans cette session-là.
  const [avertissementLectureSeule, setAvertissementLectureSeule] = useState(false);
  const timeoutAvertissementRef = useRef(null);

  const signalerLectureSeule = () => {
    if (!modeLecture) return;
    setAvertissementLectureSeule(true);
    clearTimeout(timeoutAvertissementRef.current);
    timeoutAvertissementRef.current = setTimeout(() => {
      setAvertissementLectureSeule(false);
    }, 3000);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutAvertissementRef.current);
  }, []);

  // Application "temps réel" des réglages de durée :
  // si le chrono est à l'arrêt, toute modification de durée dans les
  // Réglages met immédiatement à jour l'affichage. Si le chrono tourne,
  // la nouvelle durée sera prise en compte à la prochaine phase.
  useEffect(() => {
    if (!enMarche) {
      setSecondesRestantes(phase === 'travail' ? dureeTravail : dureePause);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dureeTravailMinutes, dureePauseMinutes, phase]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  useEffect(() => {
    if (enMarche) {
      intervalRef.current = setInterval(() => {
        setSecondesRestantes((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setEnMarche(false);

            if (phase === 'travail') {
              // Fin d'une session de travail : on comptabilise la distance
              // puis on bascule automatiquement sur la pause
              onSessionTerminee?.(Math.floor(dureeTravail / 5));
              setPhase('pause');
              return dureePause;
            } else {
              // Fin de la pause : retour à une nouvelle session de travail
              setPhase('travail');
              return dureeTravail;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [enMarche, phase, dureeTravail, dureePause]);

  const formaterTemps = (s) => {
    const minutes = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  };

  const start = () => {
    if (secondesRestantes > 0) setEnMarche(true);
  };

  const pause = () => {
    setEnMarche(false);
  };

  const reset = () => {
    setEnMarche(false);
    setSecondesRestantes(dureeActuelle);
    if (onReset) onReset();
  };

  const basculer = () => {
    signalerLectureSeule();
    if (enMarche) pause();
    else start();
  };

  // Passe directement de la pause à une nouvelle session de travail,
  // sans attendre la fin du décompte. N'a de sens qu'en phase "pause".
  const sauterPause = () => {
    if (phase !== 'pause') return;
    clearInterval(intervalRef.current);
    setEnMarche(false);
    setPhase('travail');
    setSecondesRestantes(dureeTravail);
  };

  const libelleBouton = enMarche
    ? <Pause size={20} />
    : secondesRestantes === dureeActuelle
      ? <Play size={20} />
      : secondesRestantes === 0
        ? 'Terminé'
        : 'Reprendre';

  // Distance simulée de la session en cours : 5 secondes écoulées = 1 mètre
  const secondesEcoulees = dureeActuelle - secondesRestantes;
  const distanceSession = Math.floor(secondesEcoulees / 5);

  return (
    <div className='chrono'>
      {!hideTimeDisplay && (
        <span className={`chrono_phase chrono_phase--${phase}`}>
          {phase === 'travail' ? '🎯 Session de travail' : '☕ Pause'}
        </span>
      )}

      {!hideTimeDisplay && (
        <div className="chrono_affichage">{formaterTemps(secondesRestantes)}</div>
      )}

      {renderLoop && renderLoop(secondesRestantes)}

      <div className="chrono_controles">
        <button className="btn_primaire" onClick={basculer} disabled={secondesRestantes === 0}>
          {libelleBouton}
        </button>
        <button
          className="btn_secondaire"
          onClick={() => { signalerLectureSeule(); reset(); }}
        >
          Recommencer
        </button>
        {phase === 'pause' && (
          <button className="btn_secondaire" onClick={sauterPause}>
            Sauter la pause
          </button>
        )}
      </div>

      {avertissementLectureSeule && (
        <p className="chrono_avertissement_lecture" role="status">
          Le temps de travail ne sera pas ajouté à la session, vous êtes en lecture seule.
        </p>
      )}

      {createPortal(
        <div className="chrono_distance" style={{ position: 'fixed', bottom: '30px', left: '30px', zIndex: 100 }}>
          <span className="chrono_distance_valeur">{distanceSession} m</span>
          <span className="chrono_distance_label">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
              <path d="M152,88a32,32,0,1,0-32-32A32,32,0,0,0,152,88Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,152,40Zm67.31,100.68c-.61.28-7.49,3.28-19.67,3.28-13.85,0-34.55-3.88-60.69-20a169.31,169.31,0,0,1-15.41,32.34,104.29,104.29,0,0,1,31.31,15.81C173.92,186.65,184,207.35,184,232a8,8,0,0,1-16,0c0-41.7-34.69-56.71-54.14-61.85-.55.7-1.12,1.41-1.69,2.1-19.64,23.8-44.25,36.18-71.63,36.18A92.29,92.29,0,0,1,31.2,208,8,8,0,0,1,32.8,192c25.92,2.58,48.47-7.49,67-30,12.49-15.14,21-33.61,25.25-47C86.13,92.35,61.27,111.63,61,111.84A8,8,0,1,1,51,99.36c1.5-1.2,37.22-29,89.51,6.57,45.47,30.91,71.93,20.31,72.18,20.19a8,8,0,1,1,6.63,14.56Z"></path>
            </svg>
          </span>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Chrono;
