import React from 'react';
import { useState, useEffect } from 'react';
import { chargerProfil } from '../../lib/firebaseDataService';

function ParticipantRow({ participant, estMoi, musiqueCourante, nbTours }) {
  const [photoChargee, setPhotoChargee] = useState(null);
  const [toursProfil, setToursProfil] = useState(null);

  // Charger la photo de profil et les statistiques depuis Firebase pour chaque participant
  useEffect(() => {
    if (!participant.uid) return;
    chargerProfil(participant.uid).then(profil => {
      if (profil?.photo_profil?.dataUrl) {
        setPhotoChargee(profil.photo_profil.dataUrl);
      }
      if (profil?.points_pomodoro?.length !== undefined) {
        setToursProfil(profil.points_pomodoro.length);
      } else if (profil?.nbTours !== undefined) {
        setToursProfil(profil.nbTours);
      }
    }).catch(console.error);
  }, [participant.uid]);

  // Priorité : photo Firebase > photo session (dataUrl ou string) > emoji
  const photoSrc = photoChargee || participant.photo?.dataUrl || (typeof participant.photo === 'string' && participant.photo.startsWith('data:') ? participant.photo : null);
  // Musique : priorité à la prop temps réel, sinon donnée stockée dans le participant
  const titreMusique = musiqueCourante?.titre || participant.musique || null;
  // Nombre de tours réalisés
  const toursTotal = nbTours !== undefined ? nbTours : (toursProfil ?? participant.nbTours ?? participant.tours ?? 0);

  return (
    <div className="participant_row">
      <div className="participant_avatar">
        {photoSrc ? (
          <img src={photoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : '🧑'}
      </div>

      <div className="participant_info_nom">
        <span className="participant_pseudo">{estMoi ? 'Moi' : participant.pseudo}</span>
        <span className="participant_tours">
          {toursTotal} tour{toursTotal > 1 ? 's' : ''}
        </span>
      </div>

      {titreMusique ? (
        <span className="participant_ecoute">
          écoute <span className="participant_ecoute_titre">{titreMusique}</span>
        </span>
      ) : (
        <span className="participant_ecoute" style={{ color: 'var(--dc-text-muted, #80848e)' }}>—</span>
      )}
      <button className="participant_btn_desk" type="button">Desk</button>
      <span className="participant_statut">{participant.enSession ? 'En ligne' : ''}</span>
    </div>
  );
}

export default ParticipantRow;
