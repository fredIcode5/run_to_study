import React from 'react';
import { Play, Pause, RotateCcw, SkipForward, Timer } from 'lucide-react';

function ChronoBarreProgression({
  phase,
  secondesRestantes,
  dureeTravail,
  dureePause,
  enMarche,
  onTogglePlay,
  onToggleStyle,
  onReset,
  onSauterPause,
  formaterTemps,
  photoProfil
}) {
  const dureeTotale = dureeTravail + dureePause;
  const ratioTravail = dureeTotale > 0 ? dureeTravail / dureeTotale : 0.8;
  const ratioPause = dureeTotale > 0 ? dureePause / dureeTotale : 0.2;

  // Calcul du remplissage
  let largeurTravailPct = 0;
  let largeurPausePct = 0;
  let curseurPositionPct = 0;

  if (phase === 'travail') {
    const secondesPassees = Math.max(0, dureeTravail - secondesRestantes);
    const progressionTravail = dureeTravail > 0 ? secondesPassees / dureeTravail : 0;
    largeurTravailPct = progressionTravail * ratioTravail * 100;
    largeurPausePct = 0;
    curseurPositionPct = largeurTravailPct;
  } else {
    // Phase pause : le travail est complet à 100% de sa portion
    largeurTravailPct = ratioTravail * 100;
    const secondesPasseesPause = Math.max(0, dureePause - secondesRestantes);
    const progressionPause = dureePause > 0 ? secondesPasseesPause / dureePause : 0;
    largeurPausePct = progressionPause * ratioPause * 100;
    curseurPositionPct = largeurTravailPct + largeurPausePct;
  }

  // Bornage entre 0 et 100%
  curseurPositionPct = Math.min(100, Math.max(0, curseurPositionPct));

  const tempsAffiche = formaterTemps
    ? formaterTemps(secondesRestantes)
    : `${Math.floor(secondesRestantes / 60).toString().padStart(2, '0')}:${(secondesRestantes % 60).toString().padStart(2, '0')}`;

  return (
    <div className="barre_chrono_flottante_haut_centre" role="region" aria-label="Chronomètre barre de progression">
      <div className="barre_chrono_widget">
        {/* Bouton Play/Pause */}
        <button
          type="button"
          className="chrono_barre_btn_action chrono_barre_btn_play"
          onClick={onTogglePlay}
          title={enMarche ? 'Mettre en pause' : 'Démarrer / Reprendre'}
          aria-label={enMarche ? 'Mettre en pause' : 'Démarrer / Reprendre'}
        >
          {enMarche ? <Pause size={16} /> : <Play size={16} />}
        </button>

        {/* Badge de phase & Décompte temps */}
        <div className="chrono_barre_info">
          <span className={`chrono_barre_badge chrono_barre_badge--${phase}`}>
            {phase === 'travail' ? '🎯 Travail' : '☕ Pause'}
          </span>
          <span className="chrono_barre_temps">
            {tempsAffiche}
          </span>
        </div>

        {/* Conteneur de la barre de progression horizontale */}
        <div className="chrono_barre_piste_wrap">
          <div className="chrono_barre_piste">
            {/* Remplissage Travail (Couleur 1 : Blurple / Indigo vibrant) */}
            <div
              className="chrono_barre_segment chrono_barre_segment--travail"
              style={{ width: `${largeurTravailPct}%` }}
              title={`Travail : ${Math.round((largeurTravailPct / (ratioTravail * 100 || 1)) * 100)}%`}
            />

            {/* Remplissage Pause (Couleur 2 : Vert Émeraude vibrant) */}
            <div
              className="chrono_barre_segment chrono_barre_segment--pause"
              style={{
                left: `${ratioTravail * 100}%`,
                width: `${largeurPausePct}%`,
              }}
              title={`Pause : ${Math.round((largeurPausePct / (ratioPause * 100 || 1)) * 100)}%`}
            />

            {/* Marqueur de transition Travail -> Pause */}
            <div
              className="chrono_barre_marqueur_pause"
              style={{ left: `${ratioTravail * 100}%` }}
              title="Transition Travail / Pause"
            />

            {/* Curseur de progression (point lumineux / avatar) */}
            <div
              className={`chrono_barre_curseur ${enMarche ? 'chrono_barre_curseur--anime' : ''}`}
              style={{ left: `${curseurPositionPct}%` }}
            >
              {photoProfil?.dataUrl ? (
                <img src={photoProfil.dataUrl} alt="Joueur" className="chrono_barre_curseur_avatar" />
              ) : (
                <div className="chrono_barre_curseur_point" />
              )}
            </div>
          </div>

          {/* Drapeau d'arrivée à l'extrémité de la barre */}
          <div className="chrono_barre_drapeau" title="Ligne d'arrivée (Fin du cycle Pomodoro)">
            <span className="chrono_barre_drapeau_icone" aria-hidden="true">
              🏁
            </span>
          </div>
        </div>

        {/* Boutons d'actions supplémentaires */}
        <div className="chrono_barre_actions">
          {/* Toggle Style Chrono : Bascule vers le Chrono Classique (Vue 1/3) */}
          <button
            type="button"
            className="chrono_barre_btn_action chrono_barre_btn_toggle"
            onClick={onToggleStyle}
            title="Changer de style : Passer au chrono classique (00:00) (Vue 1/3)"
            aria-label="Changer de style : Passer au chrono classique (00:00) (Vue 1/3)"
          >
            <Timer size={16} />
          </button>

          {/* Bouton Recommencer */}
          <button
            type="button"
            className="chrono_barre_btn_action chrono_barre_btn_reset"
            onClick={onReset}
            title="Recommencer la session"
            aria-label="Recommencer la session"
          >
            <RotateCcw size={15} />
          </button>

          {/* Bouton Sauter Pause (si en pause) */}
          {phase === 'pause' && (
            <button
              type="button"
              className="chrono_barre_btn_action chrono_barre_btn_skip"
              onClick={onSauterPause}
              title="Sauter la pause"
              aria-label="Sauter la pause"
            >
              <SkipForward size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChronoBarreProgression;
