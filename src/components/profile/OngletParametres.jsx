import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';


function OngletParametres({ pseudo, photoProfil, onEnregistrerPhotoProfil, enregistrementPhotoEnCours, erreurPhotoProfil, bio, setBio }) {
  const { deconnexion, connecte } = useAuth();

  const [photoDataUrl, setPhotoDataUrl] = useState(photoProfil?.dataUrl ?? null);
  const [positionPhoto, setPositionPhoto] = useState(photoProfil?.position ?? { x: 50, y: 50 });

  useEffect(() => {
    setPhotoDataUrl(photoProfil?.dataUrl ?? null);
    setPositionPhoto(photoProfil?.position ?? { x: 50, y: 50 });
  }, [photoProfil]);

  const [email, setEmail] = useState('');
  const [motDePasseActuel, setMotDePasseActuel] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');

  const [dateNaissance, setDateNaissance] = useState('');
  const [sexe, setSexe] = useState('');

  const [suppressionCompteOuverte, setSuppressionCompteOuverte] = useState(false);

  // --- Bio local state ---
  const [bioTemp, setBioTemp] = useState(bio || '');
  const [bioErreur, setBioErreur] = useState('');

  useEffect(() => {
    setBioTemp(bio || '');
  }, [bio]);

  const zonePhotoRef = useRef(null);
  const glissementRef = useRef(null);

  const gererChoixPhoto = (evenement) => {
    const fichier = evenement.target.files?.[0];
    if (!fichier) return;

    if (fichier.size > 5 * 1024 * 1024) {
      alert("L'image est trop volumineuse (max 5 Mo).");
      return;
    }

    const lecteur = new FileReader();
    lecteur.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_TAILLE = 400;
        let largeur = img.width;
        let hauteur = img.height;

        if (largeur > hauteur && largeur > MAX_TAILLE) {
          hauteur *= MAX_TAILLE / largeur;
          largeur = MAX_TAILLE;
        } else if (hauteur > MAX_TAILLE) {
          largeur *= MAX_TAILLE / hauteur;
          hauteur = MAX_TAILLE;
        }

        const canvas = document.createElement('canvas');
        canvas.width = largeur;
        canvas.height = hauteur;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, largeur, hauteur);

        const dataUrlCompresser = canvas.toDataURL('image/jpeg', 0.8);

        setPhotoDataUrl(dataUrlCompresser);
        setPositionPhoto({ x: 50, y: 50 });
      };
      img.src = e.target.result;
    };
    lecteur.readAsDataURL(fichier);
  };

  const gererGlissement = (evenement) => {
    if (!glissementRef.current || !zonePhotoRef.current) return;
    const rect = zonePhotoRef.current.getBoundingClientRect();

    const deltaXPourcent = ((evenement.clientX - glissementRef.current.startX) / rect.width) * 100;
    const deltaYPourcent = ((evenement.clientY - glissementRef.current.startY) / rect.height) * 100;

    setPositionPhoto({
      x: Math.min(100, Math.max(0, glissementRef.current.startPosX - deltaXPourcent)),
      y: Math.min(100, Math.max(0, glissementRef.current.startPosY - deltaYPourcent)),
    });
  };

  const arreterGlissement = () => {
    glissementRef.current = null;
    window.removeEventListener('mousemove', gererGlissement);
    window.removeEventListener('mouseup', arreterGlissement);
  };

  const demarrerGlissement = (evenement) => {
    if (!photoDataUrl) return;
    glissementRef.current = {
      startX: evenement.clientX,
      startY: evenement.clientY,
      startPosX: positionPhoto.x,
      startPosY: positionPhoto.y,
    };
    window.addEventListener('mousemove', gererGlissement);
    window.addEventListener('mouseup', arreterGlissement);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', gererGlissement);
      window.removeEventListener('mouseup', arreterGlissement);
    };
  }, []);

  const enregistrerModifications = async () => {
    if (bioTemp.length > 350) {
      setBioErreur('Votre bio ne peut pas dépasser 350 caractères.');
      return;
    }
    setBioErreur('');

    if (connecte) {
      await onEnregistrerPhotoProfil({ dataUrl: photoDataUrl, position: positionPhoto });
      if (typeof setBio === 'function') {
        setBio(bioTemp);
      }
    }
    console.log('Modifications des paramètres (placeholder) :', {
      email,
      dateNaissance,
      sexe,
    });
  };

  return (
    <div className="profil_onglet_panneau profil_onglet_panneau--parametres">

      <div className="parametres_section">
        <div className="parametres_section_entete">
          <h4 className="profil_section_titre">Profil Public</h4>
          <button
            type="button"
            className="btn_primaire parametres_btn_enregistrer"
            onClick={enregistrerModifications}
            disabled={enregistrementPhotoEnCours}
          >
            {enregistrementPhotoEnCours ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginTop: '16px' }}>
          {/* Section Photo */}
          <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <h5 style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', alignSelf: 'flex-start' }}>Photo de profil</h5>
            {connecte ? (
              <>
                <div
                  className="parametres_photo_zone"
                  ref={zonePhotoRef}
                  onMouseDown={demarrerGlissement}
                >
                  {photoDataUrl ? (
                    <img
                      src={photoDataUrl}
                      alt={`Photo de profil de ${pseudo}`}
                      className="parametres_photo_apercu"
                      style={{ objectPosition: `${positionPhoto.x}% ${positionPhoto.y}%` }}
                      draggable={false}
                    />
                  ) : (
                    <span className="parametres_photo_icone_defaut">👤</span>
                  )}
                </div>

                {photoDataUrl && (
                  <p className="parametres_photo_aide" style={{ margin: 0, fontSize: '0.8rem' }}>Glissez pour recentrer</p>
                )}

                <label className="btn_secondaire parametres_photo_btn_choisir" style={{ margin: 0 }}>
                  Choisir une photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={gererChoixPhoto}
                    className="parametres_photo_input_fichier"
                  />
                </label>

                {erreurPhotoProfil && (
                  <p className="parametres_photo_erreur" style={{ margin: 0 }}>{erreurPhotoProfil}</p>
                )}
              </>
            ) : (
              <p className="parametres_photo_aide" style={{ maxWidth: '200px', textAlign: 'center' }}>
                Connecte-toi avec un compte pour choisir une photo.
              </p>
            )}
          </div>

          {/* Section Bio */}
          <div style={{ flex: '0 1 70%', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
            <h5 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--dc-text-primary, #F2F3F5)', fontWeight: '600', fontFamily: "'Inter', 'gg sans', sans-serif" }}>Bio</h5>
            <textarea
              className="param_input parametres_bio_textarea"
              rows={5}
              style={{
                resize: 'vertical',
                background: 'var(--dc-bg-tertiary, #1E1F22)',
                border: bioTemp.length > 350 ? '1px solid var(--dc-error, #F23F43)' : '1px solid var(--dc-border-strong, #383A40)',
                borderRadius: '8px',
                padding: '12px',
                color: 'var(--dc-text-primary, #F2F3F5)',
                width: '100%',
                flex: 1,
                fontFamily: "'Inter', 'gg sans', sans-serif",
                fontSize: '0.95rem',
                lineHeight: '1.5',
                boxShadow: 'none',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
              placeholder="Présentez-vous..."
              value={bioTemp}
              onChange={(e) => {
                setBioTemp(e.target.value);
                setBioErreur('');
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginTop: '8px'
            }}>
              <span style={{
                fontSize: '0.8rem',
                color: bioTemp.length > 350 ? 'var(--dc-error, #F23F43)' : 'var(--dc-text-muted, #80848E)',
                fontWeight: '500',
                fontFamily: "'Inter', 'gg sans', sans-serif"
              }}>
                {bioTemp.length} / 350
              </span>
            </div>
            {bioErreur && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                backgroundColor: 'rgba(242, 63, 67, 0.1)',
                color: 'var(--dc-error, #F23F43)',
                border: '1px solid rgba(242, 63, 67, 0.25)',
                fontFamily: "'Inter', 'gg sans', sans-serif"
              }}>
                {bioErreur}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Compte : e-mail et mot de passe --- */}
      <div className="parametres_section">
        <h4 className="profil_section_titre">Compte</h4>

        <label className="parametres_champ_label">
          Adresse e-mail associée
          <input
            type="email"
            className="parametres_champ_input"
            placeholder="votre@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="parametres_champ_label">
          Mot de passe actuel
          <input
            type="password"
            className="parametres_champ_input"
            value={motDePasseActuel}
            onChange={(e) => setMotDePasseActuel(e.target.value)}
          />
        </label>

        <label className="parametres_champ_label">
          Nouveau mot de passe
          <input
            type="password"
            className="parametres_champ_input"
            value={nouveauMotDePasse}
            onChange={(e) => setNouveauMotDePasse(e.target.value)}
          />
        </label>

        <label className="parametres_champ_label">
          Confirmer le nouveau mot de passe
          <input
            type="password"
            className="parametres_champ_input"
            value={confirmationMotDePasse}
            onChange={(e) => setConfirmationMotDePasse(e.target.value)}
          />
        </label>
      </div>

      {/* --- Informations personnelles --- */}
      <div className="parametres_section">
        <h4 className="profil_section_titre">Informations personnelles</h4>

        <label className="parametres_champ_label">
          Date de naissance
          <input
            type="date"
            className="parametres_champ_input"
            value={dateNaissance}
            onChange={(e) => setDateNaissance(e.target.value)}
          />
        </label>

        <label className="parametres_champ_label">
          Sexe
          <select
            className="parametres_champ_input"
            value={sexe}
            onChange={(e) => setSexe(e.target.value)}
          >
            <option value="">Non précisé</option>
            <option value="femme">Femme</option>
            <option value="homme">Homme</option>
            <option value="autre">Autre</option>
          </select>
        </label>
      </div>

      {/* --- Comptes liés --- */}
      <div className="parametres_section">
        <h4 className="profil_section_titre">Comptes liés</h4>
        <button type="button" className="btn_secondaire parametres_btn_lier_google">
          Lier avec Google
        </button>
      </div>

      {/* --- Zone de danger : suppression du compte --- */}
      <div className="parametres_section parametres_section_danger">
        <h4 className="profil_section_titre">Zone de danger</h4>

        {!suppressionCompteOuverte ? (
          <button
            type="button"
            className="btn_danger parametres_btn_supprimer_compte"
            onClick={() => setSuppressionCompteOuverte(true)}
          >
            Supprimer le compte
          </button>
        ) : (
          <div className="parametres_confirmation_suppression">
            <p className="parametres_confirmation_suppression_texte">
              Êtes-vous sûr de vouloir supprimer définitivement votre compte ?
            </p>
            <div className="parametres_confirmation_suppression_actions">
              <button
                type="button"
                className="btn_secondaire"
                onClick={() => setSuppressionCompteOuverte(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn_danger"
                onClick={() => {
                  // Emplacement réservé : aucune suppression réelle pour l'instant
                  setSuppressionCompteOuverte(false);
                }}
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- Déconnexion --- */}
      <div className="parametres_section">
        <button
          type="button"
          className="btn_secondaire parametres_btn_deconnexion"
          onClick={deconnexion}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

export default OngletParametres;
