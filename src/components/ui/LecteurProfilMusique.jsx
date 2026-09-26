import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Music, Headphones, Repeat } from 'lucide-react';

function LecteurProfilMusique({ musique, onMettreAJour, onOuvrirChoixMusique }) {
  const [tempsActuel, setTempsActuel] = useState(0);
  const [duree, setDuree] = useState(musique?.duree || 0);

  const lecteurYoutubeRef = useRef(null);
  const conteneurYoutubeRef = useRef(null);
  const intervalProgressionRef = useRef(null);
  const intervalSimulationRef = useRef(null);
  const boucleRef = useRef(Boolean(musique?.boucle));
  const onMettreAJourRef = useRef(onMettreAJour);

  const enLecture = Boolean(musique?.enLecture);
  const boucle = Boolean(musique?.boucle);

  useEffect(() => { onMettreAJourRef.current = onMettreAJour; });
  useEffect(() => { boucleRef.current = boucle; }, [boucle]);

  // Initialisation du lecteur YouTube caché pour la lecture audio réelle
  useEffect(() => {
    if (!musique || musique.type !== 'youtube') return undefined;
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
            try {
              const savedVol = localStorage.getItem('pomodoro_volume_musique');
              const volPct = savedVol ? Math.round(parseFloat(savedVol) * 100) : 80;
              e.target.setVolume?.(volPct);
            } catch {
              // Ignorer
            }
            onMettreAJourRef.current?.({ duree: d });

            // Récupère automatiquement le vrai titre / artiste (nom de la chaîne) de la vidéo YouTube
            try {
              const infos = e.target.getVideoData?.();
              if (infos?.title) {
                onMettreAJourRef.current?.({
                  titre: infos.title,
                  artiste: infos.author || '',
                });
              }
            } catch {
              // Méthode interne indisponible : conserve le titre actuel
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
  }, [musique?.videoId, musique?.type]);

  // Écoute du changement de volume en temps réel
  useEffect(() => {
    const handleVolume = (e) => {
      const vol = e.detail?.volume;
      if (typeof vol === 'number') {
        try {
          lecteurYoutubeRef.current?.setVolume?.(Math.round(vol * 100));
        } catch {
          // Ignorer
        }
      }
    };
    window.addEventListener('pomodoroVolumeMusiqueChange', handleVolume);
    return () => window.removeEventListener('pomodoroVolumeMusiqueChange', handleVolume);
  }, []);

  // Suivi de la progression pendant la lecture YouTube
  useEffect(() => {
    if (!musique || musique.type !== 'youtube') return undefined;
    if (enLecture) {
      intervalProgressionRef.current = setInterval(() => {
        const t = lecteurYoutubeRef.current?.getCurrentTime?.();
        if (typeof t === 'number') setTempsActuel(t);
      }, 500);
    }
    return () => clearInterval(intervalProgressionRef.current);
  }, [enLecture, musique?.type]);

  // Simulation de lecture pour Spotify
  useEffect(() => {
    if (!musique || musique.type !== 'spotify') return undefined;
    if (enLecture) {
      intervalSimulationRef.current = setInterval(() => {
        setTempsActuel((prev) => {
          if (prev + 1 >= (duree || 180)) {
            if (boucleRef.current) return 0;
            clearInterval(intervalSimulationRef.current);
            onMettreAJourRef.current?.({ enLecture: false });
            return duree || 180;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalSimulationRef.current);
  }, [enLecture, musique?.type, duree]);

  const basculerLecture = (e) => {
    e?.stopPropagation();
    if (!musique) {
      onOuvrirChoixMusique?.();
      return;
    }
    if (musique.type === 'youtube') {
      if (enLecture) {
        lecteurYoutubeRef.current?.pauseVideo?.();
      } else {
        lecteurYoutubeRef.current?.playVideo?.();
      }
    } else {
      onMettreAJour?.({ enLecture: !enLecture });
    }
  };

  const basculerBoucle = (e) => {
    e?.stopPropagation();
    onMettreAJour?.({ boucle: !boucle });
  };

  const imageCover = musique
    ? (musique.thumbnail || musique.miniature || (musique.videoId ? `https://img.youtube.com/vi/${musique.videoId}/hqdefault.jpg` : null))
    : null;

  const titreMusique = musique
    ? (musique.titre || musique.title || (musique.type === 'youtube' ? 'Vidéo YouTube' : 'Piste d\'ambiance'))
    : 'Aucune musique';

  const artisteMusique = musique
    ? (musique.artiste || (musique.type === 'spotify' ? 'Spotify' : 'YouTube Audio'))
    : 'Clique pour choisir';

  return (
    <div className="lecteur_profil_musique" title={musique ? `${titreMusique} — ${artisteMusique}` : 'Choisir une musique d\'ambiance'}>
      {/* Conteneur Iframe YouTube invisible */}
      <div
        ref={conteneurYoutubeRef}
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: 'none',
          overflow: 'hidden'
        }}
      />

      {/* Miniature / Pochette */}
      <div
        className="lecteur_profil_cover"
        onClick={onOuvrirChoixMusique}
        role="button"
        tabIndex={0}
        aria-label="Changer de musique"
      >
        {imageCover ? (
          <img src={imageCover} alt="" className="lecteur_profil_cover_img" draggable={false} />
        ) : (
          <div className="lecteur_profil_cover_fallback">
            {musique?.type === 'spotify' ? <Headphones size={18} /> : <Music size={18} />}
          </div>
        )}
        {enLecture && <div className="lecteur_profil_pulse_dot" />}
      </div>

      {/* Informations de la piste avec défilement horizontal du titre */}
      <div
        className="lecteur_profil_details"
        onClick={onOuvrirChoixMusique}
        role="button"
        tabIndex={0}
        aria-label="Changer de musique"
      >
        <div className="lecteur_profil_titre_conteneur">
          <div className="lecteur_profil_titre_track">
            <span className="lecteur_profil_titre">{titreMusique}</span>
            <span className="lecteur_profil_titre_sep">•</span>
            <span className="lecteur_profil_titre">{titreMusique}</span>
          </div>
        </div>
        <span className="lecteur_profil_artiste" title={artisteMusique}>
          {artisteMusique}
        </span>
      </div>

      {/* Boutons de contrôle : Boucle au-dessus de Play */}
      <div className="lecteur_profil_controles">
        <button
          type="button"
          className={`lecteur_profil_btn_boucle ${boucle ? 'actif' : ''}`}
          onClick={basculerBoucle}
          title={boucle ? 'Désactiver la boucle' : 'Activer la boucle'}
          aria-label={boucle ? 'Désactiver la boucle' : 'Activer la boucle'}
        >
          <Repeat size={12} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          className={`lecteur_profil_btn_play ${enLecture ? 'actif' : ''}`}
          onClick={basculerLecture}
          title={!musique ? 'Choisir une musique' : enLecture ? 'Mettre en pause' : 'Lancer la lecture'}
          aria-label={!musique ? 'Choisir une musique' : enLecture ? 'Mettre en pause' : 'Lancer la lecture'}
        >
          {enLecture ? (
            <Pause size={13} strokeWidth={2.5} fill="currentColor" />
          ) : (
            <Play size={13} strokeWidth={2.5} fill="currentColor" style={{ marginLeft: '1px' }} />
          )}
        </button>
      </div>
    </div>
  );
}

export default LecteurProfilMusique;
