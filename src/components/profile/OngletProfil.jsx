import React from 'react';
import MiniatureMusique from '../ui/MiniatureMusique';
import HeatmapPomodoro from './HeatmapPomodoro';

// --- Onglet "Profil" : identité, médailles (emplacement réservé) et
// heatmap mensuelle des jours avec au moins un Pomodoro terminé.
function OngletProfil({ pseudo, distanceTotale, historiqueJoursPomodoro, photoProfil, musiqueAmbiance, bio, titreSession, numeroSession, taches }) {
  const aUneSessionActive = taches && taches.length > 0;
  const nomSession = titreSession && titreSession.trim() !== '' ? titreSession.trim() : `Session ${numeroSession}`;
  const affichageSession = aUneSessionActive ? nomSession : 'Aucune session active';

  return (
    <div className="profil_onglet_panneau profil_onglet_panneau--profil">
      <div className="profil_layout">
        <div className="profil_colonne_infos">
          <div className="profil_entete">
            <div className="profil_photo">
              {photoProfil?.dataUrl ? (
                <img
                  src={photoProfil.dataUrl}
                  alt={`Photo de profil de ${pseudo}`}
                  className="profil_photo_img"
                  style={{ objectPosition: `${photoProfil.position?.x ?? 50}% ${photoProfil.position?.y ?? 50}%` }}
                  draggable={false}
                />
              ) : (
                <span className="profil_photo_icone">👤</span>
              )}
            </div>
            <span className="profil_pseudo">{pseudo}</span>
          </div>

          <p className="modal_distance_totale">
            Distance totale parcourue : <strong>{distanceTotale} m</strong>
          </p>

          <div className="profil_section">
            <h4 className="profil_section_titre">Présentation</h4>
            <div className="profil_bio_carte" style={{ padding: '16px', background: 'var(--dc-bg-tertiary, #1e1f22)', borderRadius: '12px', color: 'var(--dc-text-primary, #f2f3f5)', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', width: '100%', maxWidth: '400px', minHeight: '100px', border: '1px solid var(--dc-border-strong, #383a40)' }}>
              {bio ? bio : "Présentez-vous..."}
            </div>
          </div>

          <div className="profil_section">
            <h4 className="profil_section_titre">Médailles</h4>
            <div className="profil_medailles_grille">
              {/* Emplacement visuel réservé : aucune médaille pour l'instant */}
            </div>
          </div>

          <div className="profil_section">
            <h4 className="profil_section_titre">Activité Pomodoro</h4>
            <HeatmapPomodoro historique={historiqueJoursPomodoro} />
          </div>
        </div>

        <div className="profil_colonne_activite">
          <div className="profil_activite_carte_unique" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--dc-bg-tertiary, #1e1f22)', borderRadius: '14px', border: '1px solid var(--dc-border-strong, #383a40)', padding: '24px', gap: '16px' }}>

            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '10px', textAlign: 'center', width: '100%' }}>
              <span className="badge_activite" style={{ fontSize: '0.8rem', padding: '4px 10px', background: 'var(--dc-blurple, #5865f2)', color: '#ffffff', borderRadius: '6px', fontWeight: 600 }}>
                {aUneSessionActive ? 'En cours' : 'Activité'}
              </span>
              <span className="titre_session" style={{ fontWeight: aUneSessionActive ? '600' : 'normal', fontSize: '1rem', color: 'var(--dc-text-primary, #f2f3f5)' }}>
                {affichageSession}
              </span>
            </div>

            {musiqueAmbiance ? (
              <>
                <div style={{ width: '70%', aspectRatio: '1 / 1', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 6px 16px rgba(0,0,0,0.5)', marginTop: '8px', border: '1px solid var(--dc-border-strong, #383a40)' }}>
                  <MiniatureMusique
                    className="musique_cover_profil"
                    iconeClassName="musique_cover_profil_icone"
                    type={musiqueAmbiance.type}
                    thumbnail={musiqueAmbiance.thumbnail}
                  />
                </div>
                <span style={{ textAlign: 'center', fontWeight: '500', fontSize: '1.05rem', color: 'var(--dc-text-primary, #f2f3f5)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {musiqueAmbiance.titre || musiqueAmbiance.title || 'Musique en cours'}
                </span>
              </>
            ) : (
              <span style={{ color: 'var(--dc-text-muted, #80848e)', fontStyle: 'italic', marginTop: '20px' }}>
                Aucune musique en lecture
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OngletProfil;
