import React from 'react';
import { useState, useEffect } from 'react';
import OngletProfil from './OngletProfil';
import OngletPlanning from './OngletPlanning';
import OngletHistorique from './OngletHistorique';
import OngletCollection from './OngletCollection';
import OngletStats from './OngletStats';
import OngletSocial from './OngletSocial';
import OngletProgression from './OngletProgression';
import OngletBoutique from './OngletBoutique';
import OngletParametres from './OngletParametres';

function ModalProfil({
  ouvert,
  fermer,
  ongletInitial = 'profil',
  pseudo,
  distanceTotale,
  historiqueJoursPomodoro,
  photoProfil,
  onEnregistrerPhotoProfil,
  enregistrementPhotoEnCours,
  erreurPhotoProfil,
  coins,
  musiqueAmbiance,
  imageFond,
  bio,
  setBio,
  titreSession,
  numeroSession,
  taches,
  sessionsSauvegardees,
  onConsulterSession,
  pointsPomodoro,
  activitesPomodoro
}) {
  const [ongletActif, setOngletActif] = useState(ongletInitial || 'profil');

  // Synchronise avec l'onglet demandé lors de l'ouverture
  useEffect(() => {
    if (ouvert) setOngletActif(ongletInitial || 'profil');
  }, [ouvert, ongletInitial]);

  if (!ouvert) return null;

  const ONGLETS_PROFIL = [
    { id: 'profil', label: 'Profil' },
    { id: 'planning', label: 'Planning' },
    { id: 'historique', label: 'Historique' },
    { id: 'stats', label: 'Stats' },
    { id: 'collection', label: 'Collection' },
    { id: 'social', label: 'Social' },
    { id: 'progression', label: 'Progression' },
    { id: 'boutique', label: 'Boutique' },
    { id: 'parametres', label: 'Paramètres' },
  ];

  return (
    <div className="modal_fond" onClick={fermer}>
      <div className="modal_fenetre profil_modal_fenetre" onClick={(e) => e.stopPropagation()}>
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>

        <div className="profil_onglets" role="tablist">
          {ONGLETS_PROFIL.map((onglet) => (
            <button
              key={onglet.id}
              type="button"
              role="tab"
              aria-selected={ongletActif === onglet.id}
              className={`profil_onglet_btn ${ongletActif === onglet.id ? 'profil_onglet_btn--actif' : ''}`}
              onClick={() => setOngletActif(onglet.id)}
            >
              {onglet.label}
            </button>
          ))}
        </div>

        <div className="profil_onglet_contenu">
          {ongletActif === 'profil' && (
            <OngletProfil
              pseudo={pseudo}
              distanceTotale={distanceTotale}
              historiqueJoursPomodoro={historiqueJoursPomodoro}
              photoProfil={photoProfil}
              musiqueAmbiance={musiqueAmbiance}
              bio={bio}
              titreSession={titreSession}
              numeroSession={numeroSession}
              taches={taches}
            />
          )}
          {ongletActif === 'planning' && (
            <OngletPlanning />
          )}
          {ongletActif === 'historique' && (
            <OngletHistorique sessionsSauvegardees={sessionsSauvegardees} onConsulter={onConsulterSession} />
          )}
          {ongletActif === 'stats' && (
            <OngletStats
              pseudo={pseudo}
              photoProfil={photoProfil}
              coins={coins}
              sessionsSauvegardees={sessionsSauvegardees}
              historiqueJoursPomodoro={historiqueJoursPomodoro}
              pointsPomodoro={pointsPomodoro}
              activitesPomodoro={activitesPomodoro}
              taches={taches}
              musiqueAmbiance={musiqueAmbiance}
              imageFond={imageFond}
            />
          )}
          {ongletActif === 'collection' && <OngletCollection />}
          {ongletActif === 'social' && <OngletSocial />}
          {ongletActif === 'parametres' && (
            <OngletParametres
              pseudo={pseudo}
              photoProfil={photoProfil}
              onEnregistrerPhotoProfil={onEnregistrerPhotoProfil}
              enregistrementPhotoEnCours={enregistrementPhotoEnCours}
              erreurPhotoProfil={erreurPhotoProfil}
              bio={bio}
              setBio={setBio}
            />
          )}
          {ongletActif === 'progression' && <OngletProgression distanceTotale={distanceTotale} />}
          {ongletActif === 'boutique' && <OngletBoutique coins={coins} />}
        </div>
      </div>
    </div>
  );
}

export default ModalProfil;
