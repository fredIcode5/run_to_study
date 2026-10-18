import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  Repeat,
  Volume2,
  Volume1,
  VolumeX,
  Music,
  Headphones,
  Bell,
  Radio,
  Ellipsis,
  ChevronDown,
} from 'lucide-react';
import serviceAudio from '../../utils/audioService';
import { formaterTempsPiste } from '../../utils/helpers';
import { envoyerCommandeMusique, miniatureYoutube, EVENEMENT_PROGRESSION_MUSIQUE } from './radios';
import SectionRadios from './SectionRadios';
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
  onSupprimerMusique,
  radios = [],
  onEnregistrerRadio,
  onSupprimerRadio,
  onLancerRadio,
}) {
  // Volume de la musique
  const [volumeMusique, setVolumeMusique] = useState(() => Math.round(serviceAudio.volumeMusique * 100));
  const [volumeOuvert, setVolumeOuvert] = useState(false);

  // Sonneries configurées
  const [sonneries, setSonneries] = useState(() => ({ ...serviceAudio.sonneries }));
  const [sonnerieEnTest, setSonnerieEnTest] = useState(null);

  // Progression de la piste, remontée par le lecteur unique (LecteurProfilMusique)
  const [progression, setProgression] = useState({ temps: 0, duree: 0 });
  // Position glissée sur la barre, appliquée au relâchement
  const [positionGlissee, setPositionGlissee] = useState(null);

  const [menuOuvert, setMenuOuvert] = useState(false);
  const [radiosOuvertes, setRadiosOuvertes] = useState(false);
  const [demandeCreationRadio, setDemandeCreationRadio] = useState(0);
  const menuRef = useRef(null);
  const conteneurRef = useRef(null);

  const radioActive = musiqueActuelle?.radio || null;

  useEffect(() => {
    const suivre = (e) => setProgression({ temps: e.detail?.temps || 0, duree: e.detail?.duree || 0 });
    window.addEventListener(EVENEMENT_PROGRESSION_MUSIQUE, suivre);
    return () => window.removeEventListener(EVENEMENT_PROGRESSION_MUSIQUE, suivre);
  }, []);

  // Menu « ••• » : fermeture au clic ailleurs ou avec Échap
  useEffect(() => {
    if (!menuOuvert) return undefined;
    const fermerAuClic = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOuvert(false); };
    const fermerAuClavier = (e) => { if (e.key === 'Escape') setMenuOuvert(false); };
    document.addEventListener('pointerdown', fermerAuClic);
    document.addEventListener('keydown', fermerAuClavier);
    return () => {
      document.removeEventListener('pointerdown', fermerAuClic);
      document.removeEventListener('keydown', fermerAuClavier);
    };
  }, [menuOuvert]);

  // Synchronisation volume musique
  const gererVolumeMusique = (e) => {
    const val = parseInt(e.target.value, 10);
    setVolumeMusique(val);
    serviceAudio.setVolumeMusique(val / 100);
  };

  // Lecture / Pause : commande envoyée au vrai lecteur (YouTube) plutôt qu'un
  // simple changement d'état affiché
  const basculerLectureMusique = () => {
    if (!musiqueActuelle) {
      onOuvrirChoixMusique?.();
      return;
    }
    envoyerCommandeMusique('basculer');
  };

  // Passer à la musique suivante
  const passerMusiqueSuivante = () => {
    if (radioActive) {
      envoyerCommandeMusique('suivant');
      return;
    }
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

  // Revenir au titre précédent (radio, playlist par défaut) ou au début du titre
  const revenirMusiquePrecedente = () => {
    if (!musiqueActuelle) return;
    const indexDefaut = PLAYLIST_DEFAUT.findIndex(p => p.videoId === musiqueActuelle.videoId);
    if (!radioActive && indexDefaut !== -1 && progression.temps <= 3) {
      const pistePrecedente = PLAYLIST_DEFAUT[(indexDefaut - 1 + PLAYLIST_DEFAUT.length) % PLAYLIST_DEFAUT.length];
      onChangerMusique?.({ ...pistePrecedente, enLecture: true });
      return;
    }
    envoyerCommandeMusique('precedent');
  };

  const basculerBoucle = () => {
    if (musiqueActuelle) onMettreAJourMusique?.({ boucle: !musiqueActuelle.boucle });
  };

  const validerPositionGlissee = () => {
    if (positionGlissee === null) return;
    envoyerCommandeMusique('aller', { temps: positionGlissee });
    setProgression((p) => ({ ...p, temps: positionGlissee }));
    setPositionGlissee(null);
  };

  const ouvrirCreationRadio = () => setDemandeCreationRadio((n) => n + 1);

  const allerAuxRadios = () => {
    conteneurRef.current?.querySelector('#ambiance-section-radios')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  const boucle = Boolean(musiqueActuelle?.boucle);
  const coverImage = musiqueActuelle?.thumbnail || musiqueActuelle?.miniature || miniatureYoutube(musiqueActuelle?.videoId);
  // Les miniatures YouTube (4:3) contiennent des bandes noires : on zoome sur l'image 16:9 avant le recadrage carré
  const coverYoutube = /img\.youtube\.com\/vi\/[^/]+\/(hq|sd)default/.test(coverImage || '');
  const titre = musiqueActuelle?.titre || 'Aucune musique sélectionnée';
  const artiste = musiqueActuelle
    ? (musiqueActuelle.artiste || (musiqueActuelle.type === 'spotify' ? 'Spotify' : 'YouTube'))
    : 'Choisis une musique ou une radio';
  const duree = progression.duree;
  const temps = positionGlissee ?? Math.min(progression.temps, duree || progression.temps);
  const enDirect = Boolean(musiqueActuelle) && musiqueActuelle.type === 'youtube' && enLecture && duree === 0;
  const progressionPct = duree > 0 ? Math.min(100, (temps / duree) * 100) : 0;
  const IconeVolume = volumeMusique === 0 ? VolumeX : volumeMusique < 50 ? Volume1 : Volume2;

  return (
    <div className="ambiance_conteneur" ref={conteneurRef}>
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

        <div className="lecteur_verre">
          {/* Pochette carrée : miniature YouTube ou pochette, sinon visuel de remplacement */}
          <button
            type="button"
            className={`lecteur_verre_pochette${coverYoutube ? ' lecteur_verre_pochette--youtube' : ''}`}
            onClick={onOuvrirChoixMusique}
            aria-label="Changer de musique"
            title="Changer de musique"
          >
            {coverImage ? (
              <img key={coverImage} src={coverImage} alt="" draggable={false} />
            ) : (
              <span className="lecteur_verre_pochette_vide">
                {musiqueActuelle?.type === 'spotify' ? <Headphones size={34} /> : <Music size={34} />}
              </span>
            )}
            {enLecture && <span className="ambiance_pulse_badge" aria-hidden="true" />}
          </button>

          <div className="lecteur_verre_entete">
            <div className="lecteur_verre_textes">
              {radioActive && (
                <span className="lecteur_verre_radio">
                  <Radio size={11} /> {radioActive.nom}
                </span>
              )}
              <span className="lecteur_verre_titre" title={titre}>{titre}</span>
              <span className="lecteur_verre_artiste" title={artiste}>{artiste}</span>
              {musiqueActuelle?.erreurLecture && (
                <span className="lecteur_verre_erreur" role="status">{musiqueActuelle.erreurLecture}</span>
              )}
            </div>

            <div className="lecteur_verre_menu_zone" ref={menuRef}>
              <button
                type="button"
                className="lecteur_verre_icone_btn"
                onClick={() => setMenuOuvert((o) => !o)}
                aria-label="Plus d'options"
                aria-haspopup="menu"
                aria-expanded={menuOuvert}
              >
                <Ellipsis size={20} />
              </button>
              {menuOuvert && (
                <div className="lecteur_verre_menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setMenuOuvert(false); onOuvrirChoixMusique?.(); }}>
                    Changer de musique…
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setMenuOuvert(false); setRadiosOuvertes(true); }}>
                    Écouter une radio
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setMenuOuvert(false); allerAuxRadios(); }}>
                    Gérer mes radios
                  </button>
                  {musiqueActuelle && onSupprimerMusique && (
                    <button type="button" role="menuitem" className="lecteur_verre_menu_danger" onClick={() => { setMenuOuvert(false); onSupprimerMusique(); }}>
                      Retirer la musique
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Progression : temps écoulé / durée, barre déplaçable */}
          <div className="lecteur_verre_progression">
            <div className="lecteur_verre_temps">
              <span>{formaterTempsPiste(temps)}</span>
              <span>{enDirect ? 'En direct' : formaterTempsPiste(duree)}</span>
            </div>
            <input
              type="range"
              className="lecteur_verre_barre"
              min="0"
              max={duree || 1}
              step="1"
              value={duree ? temps : 0}
              disabled={!musiqueActuelle || !duree}
              onChange={(e) => setPositionGlissee(Number(e.target.value))}
              onPointerUp={validerPositionGlissee}
              onKeyUp={validerPositionGlissee}
              onBlur={validerPositionGlissee}
              style={{ '--val-pct': `${progressionPct}%` }}
              aria-label="Position dans le titre"
              aria-valuetext={`${formaterTempsPiste(temps)} sur ${formaterTempsPiste(duree)}`}
            />
          </div>

          {/* Commandes : boucle · précédent · lecture · suivant · volume */}
          <div className="lecteur_verre_controles">
            <button
              type="button"
              className={`lecteur_verre_icone_btn${boucle ? ' lecteur_verre_icone_btn--actif' : ''}`}
              onClick={basculerBoucle}
              disabled={!musiqueActuelle}
              aria-pressed={boucle}
              title={boucle ? 'Désactiver la boucle' : 'Lire en boucle'}
              aria-label={boucle ? 'Désactiver la boucle' : 'Lire en boucle'}
            >
              <Repeat size={18} />
            </button>
            <button
              type="button"
              className="lecteur_verre_icone_btn lecteur_verre_saut"
              onClick={revenirMusiquePrecedente}
              disabled={!musiqueActuelle}
              title="Titre précédent"
              aria-label="Titre précédent"
            >
              <Rewind size={24} fill="currentColor" />
            </button>
            <button
              type="button"
              className="lecteur_verre_play"
              onClick={basculerLectureMusique}
              title={!musiqueActuelle ? 'Choisir une musique' : enLecture ? 'Mettre en pause' : 'Lancer la lecture'}
              aria-label={!musiqueActuelle ? 'Choisir une musique' : enLecture ? 'Mettre en pause' : 'Lancer la lecture'}
            >
              {enLecture ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" />}
            </button>
            <button
              type="button"
              className="lecteur_verre_icone_btn lecteur_verre_saut"
              onClick={passerMusiqueSuivante}
              title="Titre suivant"
              aria-label="Titre suivant"
            >
              <FastForward size={24} fill="currentColor" />
            </button>
            <button
              type="button"
              className={`lecteur_verre_icone_btn${volumeOuvert ? ' lecteur_verre_icone_btn--actif' : ''}`}
              onClick={() => setVolumeOuvert((o) => !o)}
              aria-expanded={volumeOuvert}
              title="Volume de la musique"
              aria-label="Volume de la musique"
            >
              <IconeVolume size={20} />
            </button>
          </div>

          {volumeOuvert && (
            <div className="ambiance_slider_controle lecteur_verre_volume">
              <input
                type="range"
                min="0"
                max="100"
                value={volumeMusique}
                onChange={gererVolumeMusique}
                className="ambiance_range"
                style={{ '--val-pct': `${volumeMusique}%` }}
                aria-label="Volume de la musique"
              />
              <span className="ambiance_valeur_pct">{volumeMusique}%</span>
            </div>
          )}
        </div>

        {/* Bouton « Radio » : choisir et lancer une de ses radios */}
        <button
          type="button"
          className={`lecteur_btn_radio${radiosOuvertes ? ' lecteur_btn_radio--ouvert' : ''}`}
          onClick={() => setRadiosOuvertes((o) => !o)}
          aria-expanded={radiosOuvertes}
        >
          <Radio size={16} />
          <span>Radio</span>
          <ChevronDown size={16} className="lecteur_btn_radio_chevron" />
        </button>

        {radiosOuvertes && (
          <div className="lecteur_radios">
            {radios.length === 0 ? (
              <div className="lecteur_radios_vide">
                <p>Aucune radio pour l'instant.</p>
                <button type="button" className="ambiance_btn_secondaire" onClick={ouvrirCreationRadio}>
                  Créer une radio
                </button>
              </div>
            ) : (
              <>
                <ul className="lecteur_radios_liste">
                  {radios.map((radio) => {
                    const active = radioActive?.id === radio.id;
                    return (
                      <li key={radio.id}>
                        <button
                          type="button"
                          className={`lecteur_radio_ligne${active ? ' lecteur_radio_ligne--active' : ''}`}
                          onClick={() => (active && enLecture ? envoyerCommandeMusique('pause') : onLancerRadio?.(radio))}
                          aria-label={active && enLecture ? `Mettre ${radio.nom} en pause` : `Écouter ${radio.nom}`}
                        >
                          <span className="lecteur_radio_icone">
                            {active && enLecture ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                          </span>
                          <span className="lecteur_radio_textes">
                            <span className="lecteur_radio_nom">{radio.nom}</span>
                            <span className="lecteur_radio_meta">
                              {radio.elements.length} source{radio.elements.length > 1 ? 's' : ''}
                              {active ? ' · en cours' : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button type="button" className="lecteur_radios_gerer" onClick={allerAuxRadios}>
                  Gérer mes radios
                </button>
              </>
            )}
          </div>
        )}
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

      {/* ─── SECTION 3 : RADIOS ─────────────────────────────────────────── */}
      <div id="ambiance-section-radios">
        <SectionRadios
          radios={radios}
          radioActiveId={radioActive?.id || null}
          onEnregistrer={onEnregistrerRadio}
          onSupprimer={onSupprimerRadio}
          onLancer={onLancerRadio}
          demandeCreation={demandeCreationRadio}
        />
      </div>
    </div>
  );
}

export default OngletAmbiance;
