import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { positionParDefautLecteur, formaterTempsPiste } from '../../utils/helpers';
import MiniatureMusique from './MiniatureMusique';
import NoteEpinglee from '../tasks/NoteEpinglee';

// --- Lecteur "vinyle" : widget flottant, DÉPLAÇABLE LIBREMENT par glisser-
// déposer (comme une note épinglée), affichant la miniature (YouTube) ou la
// pochette (Spotify) de la piste en cours, en carré aux coins arrondis.
// Deux modes de lecture :
// - YouTube : lecture audio réelle via l'API IFrame YouTube (vidéo cachée)
// - Spotify : la connexion est simulée (comme dans les salons), donc la
//   progression de la piste est elle aussi simulée par un minuteur
//
// L'état de lecture (enLecture / boucle / durée / titre / artiste / position)
// vit dans le composant App (dans l'objet `musique`) afin que le panneau
// Réglages puisse afficher les informations détaillées de la piste en cours.
// Seule la progression courante (tempsActuel) reste locale, car elle change
// trop souvent pour être remontée à chaque tick sans impacter les perfs.
//
// Astuce : ce composant est monté avec une `key` unique par piste (voir App),
// ce qui garantit une réinitialisation propre de son état local à chaque
// changement de musique, sans avoir à gérer manuellement la resynchronisation.
function LecteurVinyle({ musique, fermer, onMettreAJour, modeTiroir }) {
  const [tempsActuel, setTempsActuel] = useState(0);
  const [duree, setDuree] = useState(musique.duree || 0);
  const [position, setPosition] = useState(musique.position || positionParDefautLecteur());
  const [glisseActif, setGlisseActif] = useState(false);

  const positionRef = useRef(position);
  const conteneurRef = useRef(null);
  const decalageRef = useRef({ x: 0, y: 0 });
  const enTrainDeGlisser = useRef(false);

  const lecteurYoutubeRef = useRef(null);
  const conteneurYoutubeRef = useRef(null);
  const intervalProgressionRef = useRef(null);
  const intervalSimulationRef = useRef(null);
  const boucleRef = useRef(Boolean(musique.boucle));
  const onMettreAJourRef = useRef(onMettreAJour);

  const enLecture = Boolean(musique.enLecture);
  const boucle = Boolean(musique.boucle);

  useEffect(() => { onMettreAJourRef.current = onMettreAJour; });
  useEffect(() => { boucleRef.current = boucle; }, [boucle]);

  // --- Glisser-déposer : mêmes principes que NoteEpinglee. La position n'est
  // remontée au composant App (pour persistance) qu'une fois le glissement
  // terminé, afin de garder l'animation fluide pendant le déplacement.
  useEffect(() => {
    const gererDeplacement = (e) => {
      if (!enTrainDeGlisser.current) return;
      const marge = 8;
      const largeur = conteneurRef.current?.offsetWidth || 168;
      const hauteur = conteneurRef.current?.offsetHeight || 220;

      let x = e.clientX - decalageRef.current.x;
      let y = e.clientY - decalageRef.current.y;

      x = Math.min(Math.max(x, marge), window.innerWidth - largeur - marge);
      y = Math.min(Math.max(y, marge), window.innerHeight - hauteur - marge);

      positionRef.current = { x, y };
      setPosition({ x, y });
    };

    const terminerDrag = () => {
      if (!enTrainDeGlisser.current) return;
      enTrainDeGlisser.current = false;
      setGlisseActif(false);
      onMettreAJourRef.current?.({ position: positionRef.current });
    };

    document.addEventListener('pointermove', gererDeplacement);
    document.addEventListener('pointerup', terminerDrag);
    return () => {
      document.removeEventListener('pointermove', gererDeplacement);
      document.removeEventListener('pointerup', terminerDrag);
    };
  }, []);

  const demarrerDrag = (e) => {
    e.preventDefault();
    enTrainDeGlisser.current = true;
    setGlisseActif(true);
    decalageRef.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y,
    };
  };

  // Mise en place du lecteur YouTube caché (audio réel). Grâce à la `key`
  // posée sur ce composant dans App, un changement de piste remonte un tout
  // nouveau LecteurVinyle : cet effet ne s'exécute donc qu'une seule fois
  // par piste, il n'a pas besoin de dépendre de `musique`.
  useEffect(() => {
    if (musique.type !== 'youtube') return undefined;
    let annule = false;

    const creerLecteur = () => {
      if (annule || !conteneurYoutubeRef.current) return;
      lecteurYoutubeRef.current = new window.YT.Player(conteneurYoutubeRef.current, {
        videoId: musique.videoId,
        playerVars: { controls: 0, disablekb: 1 },
        events: {
          onReady: (e) => {
            const d = e.target.getDuration();
            setDuree(d);
            onMettreAJourRef.current?.({ duree: d });

            // Récupère le vrai titre / artiste (nom de la chaîne) de la vidéo
            try {
              const infos = e.target.getVideoData?.();
              if (infos?.title) {
                onMettreAJourRef.current?.({
                  titre: infos.title,
                  artiste: infos.author || '',
                });
              }
            } catch {
              // Méthode interne indisponible : on conserve le titre par défaut
            }
          },
          onStateChange: (e) => {
            const enCours = e.data === window.YT.PlayerState.PLAYING;
            onMettreAJourRef.current?.({ enLecture: enCours });

            if (e.data === window.YT.PlayerState.ENDED) {
              if (boucleRef.current) {
                lecteurYoutubeRef.current?.seekTo?.(0, true);
                lecteurYoutubeRef.current?.playVideo?.();
              } else {
                onMettreAJourRef.current?.({ enLecture: false });
              }
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      creerLecteur();
    } else {
      if (!document.getElementById('youtube-iframe-api')) {
        const script = document.createElement('script');
        script.id = 'youtube-iframe-api';
        script.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(script);
      }
      const precedent = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        precedent?.();
        creerLecteur();
      };
    }

    return () => {
      annule = true;
      lecteurYoutubeRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suivi de la progression pendant la lecture YouTube (l'API ne notifie pas le temps courant en continu)
  useEffect(() => {
    if (musique.type !== 'youtube') return undefined;
    if (enLecture) {
      intervalProgressionRef.current = setInterval(() => {
        const t = lecteurYoutubeRef.current?.getCurrentTime?.();
        if (typeof t === 'number') setTempsActuel(t);
      }, 500);
    }
    return () => clearInterval(intervalProgressionRef.current);
  }, [enLecture, musique.type]);

  // Simulation de lecture pour Spotify : aucune API de lecture réelle n'est disponible ici
  useEffect(() => {
    if (musique.type !== 'spotify') return undefined;
    if (enLecture) {
      intervalSimulationRef.current = setInterval(() => {
        setTempsActuel((prev) => {
          if (prev + 1 >= duree) {
            if (boucleRef.current) {
              return 0;
            }
            clearInterval(intervalSimulationRef.current);
            onMettreAJourRef.current?.({ enLecture: false });
            return duree;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalSimulationRef.current);
  }, [enLecture, musique.type, duree]);

  const basculerLecture = () => {
    if (musique.type === 'youtube') {
      if (enLecture) lecteurYoutubeRef.current?.pauseVideo?.();
      else lecteurYoutubeRef.current?.playVideo?.();
    } else {
      onMettreAJour?.({ enLecture: !enLecture });
    }
  };

  // Bouton "Retour au début" : remet la piste à 0:00 sans changer l'état de lecture
  const retourDebut = () => {
    setTempsActuel(0);
    if (musique.type === 'youtube') {
      lecteurYoutubeRef.current?.seekTo?.(0, true);
    }
  };

  // Bouton "Lecture en boucle" : active/désactive la répétition automatique
  const toggleBoucle = () => {
    onMettreAJour?.({ boucle: !boucle });
  };

  // Permet de cliquer n'importe où sur la barre de progression pour s'y déplacer
  const gererClicProgression = (e) => {
    if (duree <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const nouveauTemps = ratio * duree;
    setTempsActuel(nouveauTemps);
    if (musique.type === 'youtube') lecteurYoutubeRef.current?.seekTo?.(nouveauTemps, true);
  };

  const progression = duree > 0 ? Math.min((tempsActuel / duree) * 100, 100) : 0;

  return (
    <div
      ref={conteneurRef}
      className={`lecteur_vinyle ${glisseActif ? 'lecteur_vinyle--glisse' : ''} ${modeTiroir ? 'lecteur_vinyle--tiroir' : ''}`}
      style={modeTiroir ? {} : { left: `${position.x}px`, top: `${position.y}px` }}
    >
      {!modeTiroir && (
        <div className="lecteur_vinyle_entete">
          <span
            className="lecteur_vinyle_poignee"
            onPointerDown={demarrerDrag}
            title="Déplacer le lecteur"
            aria-hidden="true"
          >
            ⠿⠿
          </span>

          <button
            type="button"
            className="lecteur_vinyle_fermer"
            onClick={fermer}
            aria-label="Fermer le lecteur de musique"
            title="Fermer le lecteur"
          >
            ×
          </button>
        </div>
      )}

      <MiniatureMusique
        className={`vinyle_miniature ${enLecture ? 'vinyle_miniature--lecture' : ''}`}
        iconeClassName="vinyle_miniature_icone"
        type={musique.type}
        thumbnail={musique.thumbnail}
      />

      <span className="lecteur_vinyle_titre" title={musique.titre}>{musique.titre}</span>

      <div className="lecteur_vinyle_controles">
        <button
          type="button"
          className="lecteur_vinyle_bouton_secondaire"
          onClick={retourDebut}
          aria-label="Retour au début"
          title="Retour au début"
        >
          ⏮
        </button>

        <button
          type="button"
          className="lecteur_vinyle_bouton"
          onClick={basculerLecture}
          aria-label={enLecture ? 'Mettre la musique en pause' : 'Lire la musique'}
        >
          {enLecture ? '⏸' : '▶'}
        </button>

        <button
          type="button"
          className={`lecteur_vinyle_bouton_secondaire ${boucle ? 'actif' : ''}`}
          onClick={toggleBoucle}
          aria-label={boucle ? 'Désactiver la lecture en boucle' : 'Activer la lecture en boucle'}
          title="Lecture en boucle"
        >
          🔁
        </button>
      </div>

      <div
        className="lecteur_vinyle_progression"
        onClick={gererClicProgression}
        role="slider"
        aria-label="Progression de la piste"
        aria-valuemin={0}
        aria-valuemax={duree}
        aria-valuenow={tempsActuel}
      >
        <div className="lecteur_vinyle_progression_remplie" style={{ width: `${progression}%` }}></div>
      </div>

      <div className="lecteur_vinyle_temps">
        <span>{formaterTempsPiste(tempsActuel)}</span>
        <span>{formaterTempsPiste(duree)}</span>
      </div>

      {/* Conteneur invisible utilisé uniquement par l'API YouTube pour la lecture audio */}
      {musique.type === 'youtube' && (
        <div ref={conteneurYoutubeRef} className="lecteur_vinyle_youtube_cache"></div>
      )}
    </div>
  );
}

export default LecteurVinyle;
