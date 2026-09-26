import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Volume2, 
  Volume1, 
  VolumeX, 
  Music, 
  Headphones, 
  Bell
} from 'lucide-react';
import serviceAudio from '../../utils/audioService';
import './OngletAmbiance.css';

// Playlist par défaut pour le bouton "Musique suivante"
const PLAYLIST_DEFAUT = [
  {
    type: 'youtube',
    videoId: 'jfKfPfyJRdk',
    titre: 'Lofi Hip Hop Radio - Beats to Relax/Study',
    artiste: 'Lofi Girl',
    thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg'
  },
  {
    type: 'youtube',
    videoId: '5qap5aO4i9A',
    titre: 'Lofi Beats to Sleep / Chill to',
    artiste: 'Lofi Girl',
    thumbnail: 'https://img.youtube.com/vi/5qap5aO4i9A/hqdefault.jpg'
  },
  {
    type: 'youtube',
    videoId: '4xDzrJKXOOY',
    titre: 'Synthwave Radio - Chill synth / Retro',
    artiste: 'Lofi Girl - Synthwave',
    thumbnail: 'https://img.youtube.com/vi/4xDzrJKXOOY/hqdefault.jpg'
  },
  {
    type: 'youtube',
    videoId: 'DWcJFNfaw9c',
    titre: 'Peaceful Piano & Soft Instrumental Study',
    artiste: 'Relaxing Jazz & Piano',
    thumbnail: 'https://img.youtube.com/vi/DWcJFNfaw9c/hqdefault.jpg'
  },
  {
    type: 'youtube',
    videoId: '2atQnvunGCo',
    titre: 'Cozy Coffee Shop Ambience & Smooth Bossa',
    artiste: 'Coffee Jazz Music',
    thumbnail: 'https://img.youtube.com/vi/2atQnvunGCo/hqdefault.jpg'
  }
];

const LISTE_SONNERIES = [
  { id: 'cloche_zen', nom: '🔔 Cloche Zen & Bol Tibétain', desc: 'Sons harmoniques relaxants' },
  { id: 'marimba', nom: '🎶 Marimba Joyeux', desc: 'Arpège doux et entraînant' },
  { id: 'carillon_celeste', nom: '✨ Carillon Céleste', desc: 'Mélodie féerique et brillante' },
  { id: 'bip_digital', nom: '⏱️ Bip Digital Sport', desc: 'Double bip clair et net' },
  { id: 'gong_dore', nom: '🏯 Gong Doré', desc: 'Résonance profonde et apaisante' },
  { id: 'goutte_rosee', nom: '💧 Goutte de Rosée', desc: 'Son organique et pur' },
];

function OngletAmbiance({
  musiqueActuelle,
  onMettreAJourMusique,
  onOuvrirChoixMusique,
  onChangerMusique,
}) {
  // Volume de la musique
  const [volumeMusique, setVolumeMusique] = useState(() => Math.round(serviceAudio.volumeMusique * 100));

  // Sonneries configurées
  const [sonneries, setSonneries] = useState(() => ({ ...serviceAudio.sonneries }));
  const [sonnerieEnTest, setSonnerieEnTest] = useState(null);

  // Synchronisation volume musique
  const gererVolumeMusique = (e) => {
    const val = parseInt(e.target.value, 10);
    setVolumeMusique(val);
    serviceAudio.setVolumeMusique(val / 100);
  };

  // Lecture / Pause de la musique
  const basculerLectureMusique = () => {
    if (!musiqueActuelle) {
      onOuvrirChoixMusique?.();
      return;
    }
    const nouvelEtat = !musiqueActuelle.enLecture;
    onMettreAJourMusique?.({ enLecture: nouvelEtat });
  };

  // Passer à la musique suivante
  const passerMusiqueSuivante = () => {
    if (!musiqueActuelle || !musiqueActuelle.videoId) {
      // Si aucune musique, on démarre la 1ère de la playlist par défaut
      const premiere = PLAYLIST_DEFAUT[0];
      onChangerMusique?.({ ...premiere, enLecture: true });
      return;
    }

    const indexActuel = PLAYLIST_DEFAUT.findIndex(p => p.videoId === musiqueActuelle.videoId);
    const indexSuivant = (indexActuel + 1) % PLAYLIST_DEFAUT.length;
    const pisteSuivante = PLAYLIST_DEFAUT[indexSuivant];

    onChangerMusique?.({
      ...pisteSuivante,
      enLecture: true,
    });
  };

  // Changement de sonnerie
  const changerSonnerie = (type, idSonnerie) => {
    const maj = { ...sonneries, [type]: idSonnerie };
    setSonneries(maj);
    serviceAudio.setSonnerie(type, idSonnerie);
  };

  // Tester une sonnerie
  const testerSonnerie = (idSonnerie) => {
    setSonnerieEnTest(idSonnerie);
    serviceAudio.jouerSonnerie(idSonnerie, 0.75);
    setTimeout(() => {
      setSonnerieEnTest(null);
    }, 1500);
  };

  const enLecture = Boolean(musiqueActuelle?.enLecture);
  const coverImage = musiqueActuelle?.thumbnail || musiqueActuelle?.miniature || (musiqueActuelle?.videoId ? `https://img.youtube.com/vi/${musiqueActuelle.videoId}/hqdefault.jpg` : null);

  return (
    <div className="ambiance_conteneur">
      {/* ─── SECTION 1 : LECTEUR DE MUSIQUE ──────────────────────────────── */}
      <section className="ambiance_carte">
        <div className="ambiance_carte_entete">
          <div className="ambiance_carte_icone ambiance_carte_icone--musique">
            <Music size={18} />
          </div>
          <div>
            <h3 className="ambiance_carte_titre">Lecteur de musique</h3>
            <p className="ambiance_carte_soustitre">Contrôlez votre fond sonore de travail</p>
          </div>
        </div>

        <div className="ambiance_musique_bloc">
          {/* Pochette & Infos de lecture */}
          <div className="ambiance_piste_infos">
            <div className="ambiance_piste_cover_zone" onClick={onOuvrirChoixMusique}>
              {coverImage ? (
                <img src={coverImage} alt="" className="ambiance_piste_cover" />
              ) : (
                <div className="ambiance_piste_cover_vide">
                  <Headphones size={24} />
                </div>
              )}
              {enLecture && <div className="ambiance_pulse_badge" />}
            </div>

            <div className="ambiance_piste_texte">
              <span className="ambiance_piste_titre" title={musiqueActuelle?.titre || 'Aucune musique sélectionnée'}>
                {musiqueActuelle?.titre || 'Aucune musique sélectionnée'}
              </span>
              <span className="ambiance_piste_artiste">
                {musiqueActuelle?.artiste || 'Cliquez pour choisir un morceau'}
              </span>
            </div>
          </div>

          {/* Boutons de contrôle (Play/Pause, Suivant, Changer) */}
          <div className="ambiance_lecteur_actions">
            <button
              type="button"
              className={`ambiance_btn_play ${enLecture ? 'actif' : ''}`}
              onClick={basculerLectureMusique}
              title={enLecture ? 'Mettre en pause' : 'Lancer la lecture'}
            >
              {enLecture ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
            </button>

            <button
              type="button"
              className="ambiance_btn_suivant"
              onClick={passerMusiqueSuivante}
              title="Musique suivante"
            >
              <SkipForward size={17} />
              <span>Suivant</span>
            </button>

            <button
              type="button"
              className="ambiance_btn_choisir"
              onClick={onOuvrirChoixMusique}
            >
              Changer...
            </button>
          </div>

          {/* Slider Volume Musique */}
          <div className="ambiance_slider_ligne">
            <div className="ambiance_slider_label">
              <span className="ambiance_icone_vol">
                {volumeMusique === 0 ? <VolumeX size={16} /> : volumeMusique < 50 ? <Volume1 size={16} /> : <Volume2 size={16} />}
              </span>
              <span>Volume de la musique</span>
            </div>
            <div className="ambiance_slider_controle">
              <input
                type="range"
                min="0"
                max="100"
                value={volumeMusique}
                onChange={gererVolumeMusique}
                className="ambiance_range"
                style={{ '--val-pct': `${volumeMusique}%` }}
              />
              <span className="ambiance_valeur_pct">{volumeMusique}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2 : SONNERIES DU POMODORO ───────────────────────────── */}
      <section className="ambiance_carte">
        <div className="ambiance_carte_entete">
          <div className="ambiance_carte_icone ambiance_carte_icone--sonnerie">
            <Bell size={18} />
          </div>
          <div>
            <h3 className="ambiance_carte_titre">Sonneries du Pomodoro</h3>
            <p className="ambiance_carte_soustitre">Alertes sonores à chaque fin d'étape</p>
          </div>
        </div>

        <div className="ambiance_sonneries_liste">
          {/* 1. Fin de session de travail */}
          <div className="ambiance_sonnerie_item">
            <div className="ambiance_sonnerie_details">
              <span className="ambiance_sonnerie_label">Fin d'une session de travail</span>
              <span className="ambiance_sonnerie_desc">Son joué lorsque le temps de focus se termine</span>
            </div>
            <div className="ambiance_sonnerie_select_groupe">
              <select
                className="ambiance_select"
                value={sonneries.finTravail}
                onChange={(e) => changerSonnerie('finTravail', e.target.value)}
              >
                {LISTE_SONNERIES.map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
              <button
                type="button"
                className={`ambiance_btn_test ${sonnerieEnTest === sonneries.finTravail ? 'test-actif' : ''}`}
                onClick={() => testerSonnerie(sonneries.finTravail)}
                title="Écouter un aperçu"
              >
                {sonnerieEnTest === sonneries.finTravail ? <Volume2 size={15} /> : <Play size={14} />}
              </button>
            </div>
          </div>

          {/* 2. Début d'une pause */}
          <div className="ambiance_sonnerie_item">
            <div className="ambiance_sonnerie_details">
              <span className="ambiance_sonnerie_label">Début d'une pause</span>
              <span className="ambiance_sonnerie_desc">Signal pour vous inviter à vous détendre</span>
            </div>
            <div className="ambiance_sonnerie_select_groupe">
              <select
                className="ambiance_select"
                value={sonneries.debutPause}
                onChange={(e) => changerSonnerie('debutPause', e.target.value)}
              >
                {LISTE_SONNERIES.map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
              <button
                type="button"
                className={`ambiance_btn_test ${sonnerieEnTest === sonneries.debutPause ? 'test-actif' : ''}`}
                onClick={() => testerSonnerie(sonneries.debutPause)}
                title="Écouter un aperçu"
              >
                {sonnerieEnTest === sonneries.debutPause ? <Volume2 size={15} /> : <Play size={14} />}
              </button>
            </div>
          </div>

          {/* 3. Fin complète d'un cycle Pomodoro */}
          <div className="ambiance_sonnerie_item">
            <div className="ambiance_sonnerie_details">
              <span className="ambiance_sonnerie_label">Fin complète d'un cycle</span>
              <span className="ambiance_sonnerie_desc">Célébration à la fin de vos 4 sessions</span>
            </div>
            <div className="ambiance_sonnerie_select_groupe">
              <select
                className="ambiance_select"
                value={sonneries.finCycle}
                onChange={(e) => changerSonnerie('finCycle', e.target.value)}
              >
                {LISTE_SONNERIES.map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
              <button
                type="button"
                className={`ambiance_btn_test ${sonnerieEnTest === sonneries.finCycle ? 'test-actif' : ''}`}
                onClick={() => testerSonnerie(sonneries.finCycle)}
                title="Écouter un aperçu"
              >
                {sonnerieEnTest === sonneries.finCycle ? <Volume2 size={15} /> : <Play size={14} />}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default OngletAmbiance;
