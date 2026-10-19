import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import serviceAudio from '../../utils/audioService';
import ChronoBarreProgression from './ChronoBarreProgression';
import { COULEURS_CHRONO_DEFAUT } from './couleursChrono';

// Fréquence de rafraîchissement de l'affichage (le temps lui-même est calculé
// à partir de l'heure de fin prévue : aucune dérive ni accumulation d'erreur)
const INTERVALLE_RAFRAICHISSEMENT_MS = 200;
// Délai minimal entre deux changements de phase manuels (anti double-clic)
const DELAI_ANTI_REBOND_MS = 400;

// --- Chrono : gère le cycle "travail" / "pause" dont les durées sont
// pilotées par les réglages (props dureeTravailMinutes / dureePauseMinutes).
// Il s'affiche sous la forme d'une barre de progression flottante.
function Chrono({
  enMarche,
  setEnMarche,
  onSessionTerminee,
  dureeTravailMinutes,
  dureePauseMinutes,
  modeLecture,
  onPhaseChange,
  onReset,
  couleurs = COULEURS_CHRONO_DEFAUT,
  renderCoureur,
}) {
  // 'travail' = session Pomodoro classique, 'pause' = pause qui suit
  const [phase, setPhase] = useState('travail');
  const [compteurSessions, setCompteurSessions] = useState(0);

  const dureeTravail = dureeTravailMinutes * 60;
  const dureePause = dureePauseMinutes * 60;
  const dureeActuelle = phase === 'travail' ? dureeTravail : dureePause;

  // Temps restant en millisecondes ; l'affichage MM:SS en dérive (arrondi supérieur)
  const [msRestants, setMsRestants] = useState(dureeActuelle * 1000);
  const msRestantsRef = useRef(msRestants);
  msRestantsRef.current = msRestants;
  const secondesRestantes = Math.ceil(msRestants / 1000);
  // Heure (Date.now) à laquelle la phase en cours se termine, tant que le chrono tourne
  const finPrevueRef = useRef(null);
  // Pause entièrement écoulée : la barre reste pleine (travail + pause) jusqu'à la relance
  const [cycleTermine, setCycleTermine] = useState(false);
  const derniereBasculeRef = useRef(0);
  const transitionEnCoursRef = useRef(false);

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
      setMsRestants((phase === 'travail' ? dureeTravail : dureePause) * 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dureeTravailMinutes, dureePauseMinutes, phase]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  // Décompte : le temps restant est recalculé depuis l'heure de fin prévue
  // (fiable même si le navigateur ralentit les minuteries d'un onglet en arrière-plan)
  useEffect(() => {
    if (!enMarche) {
      finPrevueRef.current = null;
      return undefined;
    }
    if (finPrevueRef.current === null) finPrevueRef.current = Date.now() + msRestantsRef.current;
    const rafraichir = () => {
      if (finPrevueRef.current === null) return; // phase changée entre-temps
      setMsRestants(Math.max(0, finPrevueRef.current - Date.now()));
    };
    rafraichir();
    const intervalle = setInterval(rafraichir, INTERVALLE_RAFRAICHISSEMENT_MS);
    return () => clearInterval(intervalle);
  }, [enMarche, phase]);

  // Fin de phase : traitée une seule fois, en dehors de tout calcul d'état
  useEffect(() => {
    if (!enMarche || msRestants > 0 || transitionEnCoursRef.current) return;
    transitionEnCoursRef.current = true;
    finPrevueRef.current = null;

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
      setMsRestants(dureePause * 1000);
    } else {
      // Début d'une nouvelle session de travail (fin de pause)
      serviceAudio.jouerSonnerie(serviceAudio.sonneries.debutPause || 'marimba');
      setPhase('travail');
      setMsRestants(dureeTravail * 1000);
      setCycleTermine(true);
    }
    setEnMarche(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enMarche, msRestants]);

  // Le verrou de transition est levé dès que la nouvelle phase est en place
  useEffect(() => {
    transitionEnCoursRef.current = false;
  }, [phase]);

  const formaterTemps = (s) => {
    const minutes = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  };

  // Pause / reprise : la reprise repart exactement du temps restant
  const basculer = () => {
    signalerLectureSeule();
    if (enMarche) {
      setEnMarche(false);
    } else if (msRestants > 0) {
      setCycleTermine(false);
      setEnMarche(true);
    }
  };

  // Phase suivante : travail → pause, pause → travail, sans attendre la fin du
  // décompte. Seule la progression de la nouvelle phase repart de zéro ; le chrono
  // garde son état (s'il tournait, il continue dans la nouvelle phase).
  const passerPhaseSuivante = () => {
    const maintenant = Date.now();
    if (maintenant - derniereBasculeRef.current < DELAI_ANTI_REBOND_MS || transitionEnCoursRef.current) return;
    derniereBasculeRef.current = maintenant;
    signalerLectureSeule();
    const prochaine = phase === 'travail' ? 'pause' : 'travail';
    finPrevueRef.current = null;
    setCycleTermine(false);
    setPhase(prochaine);
    setMsRestants((prochaine === 'travail' ? dureeTravail : dureePause) * 1000);
  };

  // Recommencer : la phase en cours repart de sa durée configurée
  const reset = () => {
    signalerLectureSeule();
    setEnMarche(false);
    finPrevueRef.current = null;
    setCycleTermine(false);
    setMsRestants(dureeActuelle * 1000);
    if (onReset) onReset();
  };

  // Avancement de chaque couche de la barre (0 → 1), calculé indépendamment
  // à partir de la durée de sa propre phase
  const avancementPhase = dureeActuelle > 0 ? Math.min(1, Math.max(0, 1 - msRestants / (dureeActuelle * 1000))) : 0;
  const avancementTravail = phase === 'pause' || cycleTermine ? 1 : avancementPhase;
  const avancementPause = cycleTermine ? 1 : phase === 'pause' ? avancementPhase : 0;

  // Distance simulée de la session en cours : 5 secondes écoulées = 1 mètre
  const secondesEcoulees = dureeActuelle - secondesRestantes;
  const distanceSession = Math.floor(secondesEcoulees / 5);

  return (
    <>
      {/* Barre de progression compacte, flottante en haut au centre de l'écran */}
      {createPortal(
        <ChronoBarreProgression
          phase={phase}
          tempsAffiche={formaterTemps(secondesRestantes)}
          avancementTravail={avancementTravail}
          avancementPause={avancementPause}
          couleurs={couleurs}
          enMarche={enMarche}
          peutDemarrer={msRestants > 0}
          onTogglePlay={basculer}
          onPhaseSuivante={passerPhaseSuivante}
          onReset={reset}
          avertissement={avertissementLectureSeule
            ? 'Le temps de travail ne sera pas ajouté à la session, vous êtes en lecture seule.'
            : null}
          entourerAvecCoureur={renderCoureur
            ? (contenu) => renderCoureur(contenu, { hauteurMin: 24, className: 'piste_coureur_zone--barre' })
            : null}
        />,
        document.body
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
