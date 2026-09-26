import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, Infinity as InfinityIcon, Timer, SlidersHorizontal } from 'lucide-react';
import serviceAudio from '../../utils/audioService';
import ChronoBarreProgression from './ChronoBarreProgression';

// Ordre de navigation entre les 3 vues : Vue 1 -> Vue 2 -> Vue 3 -> Vue 1
const ORDRE_STYLES = ['classique', 'loop', 'barre'];

const getProchainStyle = (styleActuel) => {
  if (styleActuel === 'classique') return 'loop';
  if (styleActuel === 'loop') return 'barre';
  return 'classique';
};

// --- Chrono : gère le cycle "travail" / "pause" dont les durées sont
// pilotées par les réglages (props dureeTravailMinutes / dureePauseMinutes).
function Chrono({
  enMarche,
  setEnMarche,
  onSessionTerminee,
  dureeTravailMinutes,
  dureePauseMinutes,
  modeLecture,
  onPhaseChange,
  onReset,
  hideTimeDisplay,
  renderLoop,
  styleChrono,
  onToggleStyle,
  photoProfil,
}) {
  // 'travail' = session Pomodoro classique, 'pause' = pause qui suit
  const [phase, setPhase] = useState('travail');
  const [compteurSessions, setCompteurSessions] = useState(0);

  const dureeTravail = dureeTravailMinutes * 60;
  const dureePause = dureePauseMinutes * 60;
  const dureeActuelle = phase === 'travail' ? dureeTravail : dureePause;

  const [secondesRestantes, setSecondesRestantes] = useState(dureeActuelle);
  const intervalRef = useRef(null);

  // Style interne si la prop styleChrono n'est pas fournie
  const [styleInterne, setStyleInterne] = useState(() => {
    const saved = localStorage.getItem('styleChrono');
    if (saved && ORDRE_STYLES.includes(saved)) return saved;
    return hideTimeDisplay ? 'loop' : 'loop';
  });

  const styleActuel = styleChrono !== undefined
    ? styleChrono
    : (hideTimeDisplay !== undefined ? (hideTimeDisplay ? 'loop' : 'classique') : styleInterne);

  const basculerStyle = () => {
    const nouveauStyle = getProchainStyle(styleActuel);
    if (onToggleStyle) {
      onToggleStyle(nouveauStyle);
    } else {
      setStyleInterne(nouveauStyle);
      localStorage.setItem('styleChrono', nouveauStyle);
      localStorage.setItem('hideRunner', nouveauStyle === 'loop' ? 'true' : 'false');
      window.dispatchEvent(new Event('runnerVisibilityChanged'));
    }
  };

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
              // Fin d'une session de travail
              const nouveauTotal = compteurSessions + 1;
              setCompteurSessions(nouveauTotal);

              // Si cycle complet de 4 sessions terminé
              if (nouveauTotal % 4 === 0) {
                serviceAudio.jouerSonnerie(serviceAudio.sonneries.finCycle || 'carillon_celeste');
              } else {
                serviceAudio.jouerSonnerie(serviceAudio.sonneries.finTravail || 'cloche_zen');
              }

              onSessionTerminee?.(Math.floor(dureeTravail / 5));
              setPhase('pause');
              return dureePause;
            } else {
              // Début d'une nouvelle session de travail (fin de pause)
              serviceAudio.jouerSonnerie(serviceAudio.sonneries.debutPause || 'marimba');
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
  }, [enMarche, phase, dureeTravail, dureePause, compteurSessions]);

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
    <>
      {/* ─── VUE 3 : Barre de progression compacte (Flottante en haut au centre de l'écran) ─── */}
      {styleActuel === 'barre' && createPortal(
        <ChronoBarreProgression
          phase={phase}
          secondesRestantes={secondesRestantes}
          dureeTravail={dureeTravail}
          dureePause={dureePause}
          enMarche={enMarche}
          onTogglePlay={basculer}
          onToggleStyle={basculerStyle}
          onReset={() => { signalerLectureSeule(); reset(); }}
          onSauterPause={sauterPause}
          formaterTemps={formaterTemps}
          photoProfil={photoProfil}
        />,
        document.body
      )}

      {/* ─── VUES 1 & 2 : Affichées uniquement si le mode actuel est 'classique' ou 'loop' ─── */}
      {(styleActuel === 'classique' || styleActuel === 'loop') && (
        <div className={`chrono ${styleActuel === 'loop' ? 'chrono--mode-loop' : 'chrono--mode-classique'}`}>
          {/* VUE 1 : Chronomètre classique (00:00) */}
          {styleActuel === 'classique' && (
            <>
              <span className={`chrono_phase chrono_phase--${phase}`}>
                {phase === 'travail' ? '🎯 Session de travail' : '☕ Pause'}
              </span>
              <div className="chrono_affichage">{formaterTemps(secondesRestantes)}</div>
            </>
          )}

          {/* VUE 2 : Chronomètre Boucle Infinie */}
          {styleActuel === 'loop' && renderLoop && renderLoop(secondesRestantes)}

          <div className="chrono_controles">
            <button
              className="btn_primaire"
              onClick={basculer}
              disabled={secondesRestantes === 0}
              title={enMarche ? 'Mettre en pause' : secondesRestantes === dureeActuelle ? 'Démarrer' : 'Reprendre'}
              aria-label={enMarche ? 'Mettre en pause' : secondesRestantes === dureeActuelle ? 'Démarrer' : 'Reprendre'}
            >
              {libelleBouton}
            </button>

            <button
              type="button"
              className="btn_style_toggle"
              onClick={basculerStyle}
              title={
                styleActuel === 'classique'
                  ? 'Changer de style : Passer à la boucle infinie (Vue 2/3)'
                  : 'Changer de style : Passer à la barre de progression (Vue 3/3)'
              }
              aria-label={
                styleActuel === 'classique'
                  ? 'Changer de style : Passer à la boucle infinie (Vue 2/3)'
                  : 'Changer de style : Passer à la barre de progression (Vue 3/3)'
              }
            >
              {styleActuel === 'classique' ? (
                <InfinityIcon size={20} strokeWidth={2.2} className="btn_style_icon" />
              ) : (
                <SlidersHorizontal size={20} strokeWidth={2.2} className="btn_style_icon" />
              )}
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
        </div>
      )}

      {/* Distance compteur toujours accessible */}
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
    </>
  );
}

export default Chrono;
