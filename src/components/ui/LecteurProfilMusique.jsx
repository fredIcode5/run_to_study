import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Music, Headphones, Repeat } from 'lucide-react';
import { EVENEMENT_COMMANDE_MUSIQUE, EVENEMENT_PROGRESSION_MUSIQUE, miniatureYoutube } from '../ambiance/radios';

// --- Lecteur de musique d'ambiance : c'est le seul lecteur réel de l'application
// (iframe YouTube cachée). L'onglet Ambiance le pilote par événements
// (EVENEMENT_COMMANDE_MUSIQUE) et suit sa progression (EVENEMENT_PROGRESSION_MUSIQUE),
// sans jamais créer de seconde instance.
// Radio (musique.radio) : ses éléments — playlists ou vidéos YouTube — sont lus
// dans l'ordre, dans le même lecteur ; titre et pochette suivent la piste en cours.
function LecteurProfilMusique({ musique, onMettreAJour, onOuvrirChoixMusique }) {
  const [tempsActuel, setTempsActuel] = useState(0);
  const [duree, setDuree] = useState(musique?.duree || 0);

  const lecteurYoutubeRef = useRef(null);
  const conteneurYoutubeRef = useRef(null);
  const intervalProgressionRef = useRef(null);
  const intervalSimulationRef = useRef(null);
  const boucleRef = useRef(Boolean(musique?.boucle));
  const onMettreAJourRef = useRef(onMettreAJour);
  const musiqueRef = useRef(musique);
  musiqueRef.current = musique;
  const indexElementRef = useRef(musique?.radio?.indexElement ?? 0);
  const derniereVideoRef = useRef(null);
  const derniereInfoRef = useRef(null);
  // Erreurs YouTube successives (sources indisponibles), pour ne pas boucler indéfiniment
  const erreursSuccessivesRef = useRef(0);
  const dureeRef = useRef(duree);
  dureeRef.current = duree;

  const enLecture = Boolean(musique?.enLecture);
  const boucle = Boolean(musique?.boucle);
  // Source chargée dans le lecteur : une radio garde le même lecteur d'une piste à l'autre
  const cleSource = musique?.radio ? `radio-${musique.radio.id}` : musique?.videoId;

  useEffect(() => { onMettreAJourRef.current = onMettreAJour; });
  useEffect(() => { boucleRef.current = boucle; }, [boucle]);

  // Titre, artiste (et pour une radio : vidéo + pochette) de la piste réellement chargée
  const signalerPiste = (lecteur) => {
    let infos;
    try {
      infos = lecteur.getVideoData?.();
    } catch {
      return; // méthode interne indisponible : conserve les informations actuelles
    }
    const cle = `${infos?.video_id}|${infos?.title}|${infos?.author || ''}`;
    if (!infos?.title || cle === derniereInfoRef.current) return;
    const nouvelleVideo = infos.video_id !== derniereVideoRef.current;
    derniereInfoRef.current = cle;
    derniereVideoRef.current = infos.video_id;
    const champs = { titre: infos.title, artiste: infos.author || '' };
    if (musiqueRef.current?.radio && infos.video_id && nouvelleVideo) {
      champs.videoId = infos.video_id;
      champs.thumbnail = miniatureYoutube(infos.video_id);
      setTempsActuel(0);
    }
    onMettreAJourRef.current?.(champs);
  };

  const signalerDuree = (lecteur) => {
    const d = lecteur.getDuration?.();
    if (d && Math.round(d) !== Math.round(dureeRef.current)) {
      setDuree(d);
      onMettreAJourRef.current?.({ duree: d });
    }
  };

  // --- Radio : chargement d'un élément, piste suivante / précédente
  const chargerElementRadio = (index, lecture = true) => {
    const lecteur = lecteurYoutubeRef.current;
    const radio = musiqueRef.current?.radio;
    if (!lecteur?.loadVideoById || !radio?.elements?.length) return;
    const total = radio.elements.length;
    const i = ((index % total) + total) % total;
    const element = radio.elements[i];
    indexElementRef.current = i;
    if (element.type === 'playlist') {
      const options = { list: element.youtubeId, listType: 'playlist', index: 0 };
      if (lecture) lecteur.loadPlaylist(options);
      else lecteur.cuePlaylist(options);
    } else if (lecture) {
      lecteur.loadVideoById(element.youtubeId);
    } else {
      lecteur.cueVideoById(element.youtubeId);
    }
    derniereInfoRef.current = null;
    derniereVideoRef.current = null;
    setTempsActuel(0);
    setDuree(0);
    onMettreAJourRef.current?.({
      radio: { ...radio, indexElement: i },
      titre: element.type === 'playlist' ? 'Chargement de la playlist…' : 'Chargement…',
      artiste: radio.nom,
      videoId: element.type === 'video' ? element.youtubeId : null,
      thumbnail: element.type === 'video' ? miniatureYoutube(element.youtubeId) : null,
      duree: 0,
    });
  };

  // Position dans la playlist YouTube en cours (null si l'élément est une vidéo seule)
  const positionPlaylist = (lecteur) => {
    const radio = musiqueRef.current?.radio;
    if (radio?.elements[indexElementRef.current]?.type !== 'playlist') return null;
    const liste = lecteur.getPlaylist?.();
    return Array.isArray(liste) && liste.length ? { index: lecteur.getPlaylistIndex?.() ?? 0, total: liste.length } : null;
  };

  // automatique : fin de piste (YouTube avance déjà seul à l'intérieur d'une playlist)
  const radioSuivant = (automatique = false) => {
    const lecteur = lecteurYoutubeRef.current;
    const radio = musiqueRef.current?.radio;
    if (!lecteur || !radio) return;
    const position = positionPlaylist(lecteur);
    if (position && position.index < position.total - 1) {
      if (!automatique) lecteur.nextVideo();
      return;
    }
    const dernierElement = indexElementRef.current >= radio.elements.length - 1;
    if (automatique && dernierElement && !boucleRef.current) {
      onMettreAJourRef.current?.({ enLecture: false });
      return;
    }
    chargerElementRadio(indexElementRef.current + 1);
  };

  const radioPrecedent = () => {
    const lecteur = lecteurYoutubeRef.current;
    if (!lecteur) return;
    // Comme sur tout lecteur : au-delà de 3 s, « précédent » revient au début du titre
    if ((lecteur.getCurrentTime?.() || 0) > 3) {
      lecteur.seekTo(0, true);
      return;
    }
    const position = positionPlaylist(lecteur);
    if (position && position.index > 0) {
      lecteur.previousVideo();
      return;
    }
    if (indexElementRef.current > 0) chargerElementRadio(indexElementRef.current - 1);
    else lecteur.seekTo(0, true);
  };

  const MESSAGES_ERREUR_YOUTUBE = {
    2: 'Lien YouTube invalide.',
    5: 'Cette vidéo ne peut pas être lue dans le navigateur.',
    100: 'Vidéo ou playlist introuvable, supprimée ou privée.',
    101: 'Le propriétaire n\'autorise pas la lecture de cette vidéo hors de YouTube.',
    150: 'Le propriétaire n\'autorise pas la lecture de cette vidéo hors de YouTube.',
  };

  const gererErreurYoutube = (lecteur, code) => {
    const message = MESSAGES_ERREUR_YOUTUBE[code] || 'Lecture YouTube impossible.';
    const radio = musiqueRef.current?.radio;
    erreursSuccessivesRef.current += 1;
    if (!radio || erreursSuccessivesRef.current > radio.elements.length + 1) {
      onMettreAJourRef.current?.({ enLecture: false, erreurLecture: message });
      return;
    }
    onMettreAJourRef.current?.({ erreurLecture: `${message} Passage à la source suivante…` });
    const position = positionPlaylist(lecteur);
    if (position && position.index < position.total - 1) lecteur.nextVideo();
    else if (indexElementRef.current < radio.elements.length - 1 || boucleRef.current) chargerElementRadio(indexElementRef.current + 1);
    else onMettreAJourRef.current?.({ enLecture: false, erreurLecture: message });
  };

  // Initialisation du lecteur YouTube caché pour la lecture audio réelle
  useEffect(() => {
    if (!musique || musique.type !== 'youtube') return undefined;
    let annule = false;

    const creerLecteur = () => {
      if (annule || !conteneurYoutubeRef.current) return;
      const m = musiqueRef.current;
      const playerVars = { controls: 0, disablekb: 1 };
      let source = { videoId: m.videoId };
      if (m.radio) {
        const element = m.radio.elements[indexElementRef.current] || m.radio.elements[0];
        playerVars.autoplay = m.enLecture ? 1 : 0;
        source = element?.type === 'playlist'
          ? { playerVars: { ...playerVars, listType: 'playlist', list: element.youtubeId } }
          : { videoId: element?.youtubeId };
      }
      lecteurYoutubeRef.current = new window.YT.Player(conteneurYoutubeRef.current, {
        playerVars,
        ...source,
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
            signalerPiste(e.target);
          },
          onStateChange: (e) => {
            const etats = window.YT.PlayerState;
            const enCours = e.data === etats.PLAYING;
            onMettreAJourRef.current?.({ enLecture: enCours });

            if (enCours || e.data === etats.CUED || e.data === etats.BUFFERING) {
              signalerPiste(e.target);
              signalerDuree(e.target);
            }
            if (enCours) {
              erreursSuccessivesRef.current = 0;
              if (musiqueRef.current?.erreurLecture) onMettreAJourRef.current?.({ erreurLecture: null });
            }

            if (e.data === etats.ENDED) {
              if (musiqueRef.current?.radio) {
                radioSuivant(true);
              } else if (boucleRef.current) {
                lecteurYoutubeRef.current?.seekTo?.(0, true);
                lecteurYoutubeRef.current?.playVideo?.();
              } else {
                onMettreAJourRef.current?.({ enLecture: false });
              }
            }
          },
          onError: (e) => gererErreurYoutube(e.target, e.data),
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
      lecteurYoutubeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleSource, musique?.type]);

  // Commandes envoyées par les autres interfaces (onglet Ambiance)
  useEffect(() => {
    const gererCommande = (e) => {
      const { action, temps } = e.detail || {};
      const m = musiqueRef.current;
      if (!m) return;
      const lecteur = lecteurYoutubeRef.current;

      if (m.type === 'youtube') {
        if (!lecteur?.playVideo) return; // lecteur pas encore prêt
        const joue = lecteur.getPlayerState?.() === window.YT?.PlayerState?.PLAYING;
        if (action === 'lecture' || (action === 'basculer' && !joue)) lecteur.playVideo();
        else if (action === 'pause' || (action === 'basculer' && joue)) lecteur.pauseVideo();
        else if (action === 'suivant' && m.radio) radioSuivant();
        else if (action === 'precedent') {
          if (m.radio) radioPrecedent();
          else lecteur.seekTo(0, true);
        } else if (action === 'aller' && typeof temps === 'number') {
          lecteur.seekTo(temps, true);
          setTempsActuel(temps);
        }
        return;
      }

      // Piste Spotify simulée (aucune lecture réelle disponible) : seul l'état change
      if (action === 'lecture') onMettreAJourRef.current?.({ enLecture: true });
      else if (action === 'pause') onMettreAJourRef.current?.({ enLecture: false });
      else if (action === 'basculer') onMettreAJourRef.current?.({ enLecture: !m.enLecture });
      else if (action === 'aller' && typeof temps === 'number') setTempsActuel(temps);
      else if (action === 'precedent') setTempsActuel(0);
    };
    window.addEventListener(EVENEMENT_COMMANDE_MUSIQUE, gererCommande);
    return () => window.removeEventListener(EVENEMENT_COMMANDE_MUSIQUE, gererCommande);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Progression diffusée pour la barre de l'onglet Ambiance
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(EVENEMENT_PROGRESSION_MUSIQUE, { detail: { temps: tempsActuel, duree } }));
  }, [tempsActuel, duree]);

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
