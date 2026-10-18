import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PrereglageCarte from './PrereglageCarte';
import MiniatureMusique from '../ui/MiniatureMusique';

// Couleurs unies proposées en un clic pour le fond d'écran
const COULEURS_FOND_RAPIDES = [
  '#1e1f22', '#2b2d31', '#313338', '#0f172a', '#1e3a8a', '#5865f2',
  '#7c3aed', '#23a559', '#0f766e', '#f0b232', '#e2472a', '#f5f5f4',
];

// Convertit une couleur (#rgb, #rrggbb ou rgb(r, g, b)) en #rrggbb, sinon null
const versHex = (valeur) => {
  const texte = (valeur || '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(texte)) return texte;
  if (/^#[0-9a-f]{3}$/.test(texte)) return `#${texte.slice(1).split('').map((c) => c + c).join('')}`;
  const rgb = texte.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (rgb && rgb.slice(1).every((n) => Number(n) <= 255)) {
    return `#${rgb.slice(1).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
  }
  return null;
};

// Section "Préréglages" : Carrousel 3D/Peek + bouton d'application
// + Section de configuration dédiée du préréglage sélectionné
function SectionPrereglages({
  prereglages = [],
  onAppliquer,
  onOuvrirRenommage,
  onDemanderSuppression,
  onRemplacer,
  onMettreAJour,
  onOuvrirCreation,
  onOuvrirChoixMusique,
  musiqueActuelle
}) {
  const [indexActif, setIndexActif] = useState(0);
  const touchStartX = useRef(null);
  const prevCountRef = useRef(prereglages.length);

  // Valeurs locales d'édition du préréglage sélectionné
  const [draftDureeTravail, setDraftDureeTravail] = useState(25);
  const [draftDureePause, setDraftDureePause] = useState(5);
  const [draftMusique, setDraftMusique] = useState(null);
  const [draftImageFond, setDraftImageFond] = useState(null);
  // Fond du préréglage : image, ou couleur unie choisie au sélecteur
  const [modeFond, setModeFond] = useState('image');
  const [draftCouleurFond, setDraftCouleurFond] = useState('#1e1f22');
  const [saisieCouleur, setSaisieCouleur] = useState('#1e1f22');
  const [messageSucces, setMessageSucces] = useState('');

  // Préréglage actif (actuellement affiché et sélectionné)
  const presetSelectionne = prereglages[indexActif] || prereglages[0];

  // Synchronise les champs d'édition dès que le préréglage actif change
  useEffect(() => {
    if (presetSelectionne) {
      setDraftDureeTravail(presetSelectionne.reglages?.dureeTravail ?? 25);
      setDraftDureePause(presetSelectionne.reglages?.dureePause ?? 5);
      setDraftMusique(presetSelectionne.musiqueAmbiance ?? null);
      setDraftImageFond(presetSelectionne.imageFond ?? null);
      const couleur = versHex(presetSelectionne.couleurFondAppliquee);
      setModeFond(!presetSelectionne.imageFond && couleur ? 'couleur' : 'image');
      setDraftCouleurFond(couleur || '#1e1f22');
      setSaisieCouleur(couleur || '#1e1f22');
      setMessageSucces('');
    }
  }, [presetSelectionne, indexActif]);

  // Synchronise avec la musique choisie via la modale de musique
  const prevMusiqueRef = useRef(musiqueActuelle);
  useEffect(() => {
    if (musiqueActuelle !== prevMusiqueRef.current && musiqueActuelle) {
      setDraftMusique(musiqueActuelle);
    }
    prevMusiqueRef.current = musiqueActuelle;
  }, [musiqueActuelle]);

  // Si un nouveau préréglage a été créé/ajouté, on sélectionne immédiatement le plus récent (à l'index 0)
  useEffect(() => {
    if (prereglages.length > prevCountRef.current) {
      setIndexActif(0);
    } else if (indexActif >= prereglages.length && prereglages.length > 0) {
      setIndexActif(prereglages.length - 1);
    }
    prevCountRef.current = prereglages.length;
  }, [prereglages.length, indexActif]);

  const allerPrecedent = () => {
    if (prereglages.length <= 1) return;
    setIndexActif((prev) => (prev > 0 ? prev - 1 : prereglages.length - 1));
  };

  const allerSuivant = () => {
    if (prereglages.length <= 1) return;
    setIndexActif((prev) => (prev < prereglages.length - 1 ? prev + 1 : 0));
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    if (diffX > 40) {
      allerSuivant();
    } else if (diffX < -40) {
      allerPrecedent();
    }
    touchStartX.current = null;
  };

  // Gestion du fichier image/GIF de fond pour le preset
  const handleImageChange = (fichier) => {
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_TAILLE = 1920;
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
        canvas.width = Math.round(largeur);
        canvas.height = Math.round(hauteur);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setDraftImageFond(dataUrl);
      };
      img.src = e.target.result;
    };
    lecteur.readAsDataURL(fichier);
  };

  const choisirCouleurFond = (couleur) => {
    setDraftCouleurFond(couleur);
    setSaisieCouleur(couleur);
  };

  // Champ hexadécimal : appliqué dès qu'il contient une couleur valide
  const saisirCouleurFond = (texte) => {
    setSaisieCouleur(texte);
    const hex = versHex(texte.startsWith('#') || texte.startsWith('rgb') ? texte : `#${texte}`);
    if (hex) setDraftCouleurFond(hex);
  };

  // Fond enregistré dans le préréglage selon le mode choisi (l'image prime à l'application)
  const fondDuDraft = () => (modeFond === 'couleur'
    ? { imageFond: null, couleurFondAppliquee: draftCouleurFond }
    : { imageFond: draftImageFond, couleurFondAppliquee: null });

  // Enregistrer les modifications directement sur le préréglage sélectionné
  const handleEnregistrerModifications = () => {
    if (!presetSelectionne) return;
    if (presetSelectionne.isSessionEnLigne) {
      setMessageSucces('Impossible de modifier la session en ligne');
      setTimeout(() => setMessageSucces(''), 3000);
      return;
    }

    if (onMettreAJour) {
      onMettreAJour(presetSelectionne.id, {
        reglages: {
          ...(presetSelectionne.reglages || {}),
          dureeTravail: Number(draftDureeTravail),
          dureePause: Number(draftDureePause),
        },
        musiqueAmbiance: draftMusique,
        ...fondDuDraft(),
      });
    }

    setMessageSucces('Modifications enregistrées ✓');
    setTimeout(() => setMessageSucces(''), 3000);
  };

  // Créer un nouveau préréglage avec la configuration actuelle
  const handleCreerNouveauPrereglage = () => {
    const configPersonnalisee = {
      ...fondDuDraft(),
      reglages: {
        ...(presetSelectionne?.reglages || {}),
        dureeTravail: Number(draftDureeTravail),
        dureePause: Number(draftDureePause),
      },
      musiqueAmbiance: draftMusique,
    };
    if (onOuvrirCreation) {
      onOuvrirCreation(configPersonnalisee);
    }
  };

  return (
    <div className="param_section prereglages_section">
      <div className="prereglages_header">
        <div className="prereglages_header_titre_wrap">
          <h3 className="param_section_titre">Préréglages</h3>
          {prereglages.length > 0 && (
            <span className="prereglages_compteur">
              {indexActif + 1} / {prereglages.length}
            </span>
          )}
        </div>
      </div>

      {prereglages.length === 0 ? (
        <div className="prereglages_vide_box">
          <p className="prereglages_vide">
            Aucun préréglage pour l'instant. Configure l'application ci-dessous, puis clique sur
            « Créer un préréglage ».
          </p>
        </div>
      ) : (
        <>
          {/* ======================================================================
              Partie 1 : Carrousel 3D + bouton d'application du preset
             ====================================================================== */}
          <div className="prereglages_layout">
            {/* Carrousel 3D centré avec peek */}
            <div className="prereglages_colonne_gauche">
              <div className="prereglages_carousel_wrapper">
                {/* Flèche gauche */}
                {prereglages.length > 1 && (
                  <button
                    type="button"
                    className="prereglages_arrow_btn prereglages_arrow_btn--left"
                    onClick={allerPrecedent}
                    aria-label="Préréglage précédent"
                    title="Précédent"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}

                {/* Viewport du carrousel centré */}
                <div
                  className="prereglages_carousel_viewport"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  {prereglages.map((prereglage, index) => {
                    const total = prereglages.length;
                    let diff = index - indexActif;
                    if (total > 2) {
                      if (diff > total / 2) diff -= total;
                      if (diff < -total / 2) diff += total;
                    }

                    let posClass = 'prereglage_carte--hidden-right';
                    if (diff === 0) posClass = 'prereglage_carte--pos-0';
                    else if (diff === -1) posClass = 'prereglage_carte--pos-minus-1';
                    else if (diff === 1) posClass = 'prereglage_carte--pos-plus-1';
                    else if (diff < -1) posClass = 'prereglage_carte--hidden-left';

                    return (
                      <PrereglageCarte
                        key={prereglage.id}
                        prereglage={prereglage}
                        estActif={diff === 0}
                        posClass={posClass}
                        onSelectionner={() => setIndexActif(index)}
                        onAppliquer={() => onAppliquer(prereglage)}
                        onRenommer={() => onOuvrirRenommage(prereglage.id)}
                        onSupprimer={() => onDemanderSuppression(prereglage.id)}
                        onRemplacer={() => onRemplacer(prereglage.id)}
                      />
                    );
                  })}
                </div>

                {/* Flèche droite */}
                {prereglages.length > 1 && (
                  <button
                    type="button"
                    className="prereglages_arrow_btn prereglages_arrow_btn--right"
                    onClick={allerSuivant}
                    aria-label="Préréglage suivant"
                    title="Suivant"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>

              {/* Indicateurs de pagination (dots) */}
              {prereglages.length > 1 && (
                <div className="prereglages_dots">
                  {prereglages.map((p, idx) => (
                    <button
                      key={p.id || idx}
                      type="button"
                      className={`prereglages_dot ${idx === indexActif ? 'prereglages_dot--actif' : ''}`}
                      onClick={() => setIndexActif(idx)}
                      aria-label={`Aller au préréglage ${idx + 1} : ${p.nom}`}
                      title={p.nom}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {presetSelectionne && (
            <button
              type="button"
              className="prereglages_infos_btn_appliquer"
              onClick={() => onAppliquer(presetSelectionne)}
            >
              Appliquer ce preset ✓
            </button>
          )}

          {/* ======================================================================
              Partie 2 : Section dédiée à la configuration du préréglage sélectionné
             ====================================================================== */}
          {presetSelectionne && (
            <div
              className="preset_config_section"
              id="section-config-prereglage"
            >
              <div className="preset_config_header">
                <h4 className="preset_config_titre">
                  ⚙️ Configuration : <span className="preset_config_nom_actif">{presetSelectionne.nom}</span>
                </h4>
              </div>

              <div className="preset_config_grille">
                {/* --- Colonne GAUCHE : Minuteur Pomodoro & Musique d'ambiance --- */}
                <div className="preset_config_colonne preset_config_colonne_gauche">
                  {/* Minuteur Pomodoro (2 inputs l'un sous l'autre) */}
                  <div className="preset_config_bloc">
                    <span className="preset_config_sous_titre">Minuteur Pomodoro</span>

                    <div className="param_champ">
                      <label className="param_label" htmlFor="preset-duree-travail">
                        Temps de travail (minutes)
                      </label>
                      <input
                        id="preset-duree-travail"
                        type="number"
                        min="1"
                        max="180"
                        className="param_input"
                        value={draftDureeTravail}
                        onChange={(e) => setDraftDureeTravail(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      />
                    </div>

                    <div className="param_champ">
                      <label className="param_label" htmlFor="preset-duree-pause">
                        Temps de repos (minutes)
                      </label>
                      <input
                        id="preset-duree-pause"
                        type="number"
                        min="1"
                        max="180"
                        className="param_input"
                        value={draftDureePause}
                        onChange={(e) => setDraftDureePause(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      />
                    </div>
                  </div>

                  {/* Musique d'ambiance */}
                  <div className="preset_config_bloc">
                    <span className="preset_config_sous_titre">Musique d'ambiance</span>

                    <div className="param_musique_ligne">
                      <button
                        type="button"
                        className="param_btn_valider"
                        onClick={onOuvrirChoixMusique}
                      >
                        🎵 Choisir une musique
                      </button>

                      {draftMusique && (
                        <button
                          type="button"
                          className="param_btn_reinit"
                          onClick={() => setDraftMusique(null)}
                        >
                          Retirer la musique
                        </button>
                      )}
                    </div>

                    {draftMusique ? (
                      <div className="param_musique_carte preset_config_musique_carte">
                        <MiniatureMusique
                          className="param_musique_vignette"
                          iconeClassName="param_musique_vignette_icone"
                          type={draftMusique.type}
                          thumbnail={draftMusique.thumbnail}
                        />
                        <div className="param_musique_carte_details">
                          <span className="param_musique_carte_titre" title={draftMusique.titre}>
                            {draftMusique.titre}
                          </span>
                          <span className="param_musique_carte_artiste">
                            {draftMusique.artiste || 'Artiste inconnu'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="preset_config_vide_texte">
                        Aucune musique d'ambiance associée
                      </span>
                    )}
                  </div>
                </div>

                {/* --- Colonne DROITE : Sélection du fond d'écran --- */}
                <div className="preset_config_colonne preset_config_colonne_droite">
                  <div className="preset_config_bloc">
                    <span className="preset_config_sous_titre">Fond d'écran</span>

                    {/* Choix du type de fond : image ou couleur unie */}
                    <div className="preset_config_fond_modes" role="radiogroup" aria-label="Type de fond d'écran">
                      {[
                        { id: 'image', label: '🖼️ Image' },
                        { id: 'couleur', label: '🎨 Couleur unie' },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          role="radio"
                          aria-checked={modeFond === mode.id}
                          className={`preset_config_fond_mode${modeFond === mode.id ? ' preset_config_fond_mode--actif' : ''}`}
                          onClick={() => setModeFond(mode.id)}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>

                    {/* Aperçu carré du fond */}
                    <div className="preset_config_fond_preview_wrap">
                      {modeFond === 'couleur' ? (
                        <div
                          className="preset_config_fond_preview"
                          style={{ backgroundColor: draftCouleurFond, backgroundImage: 'none' }}
                          title={`Aperçu de la couleur de fond (${draftCouleurFond})`}
                        />
                      ) : draftImageFond ? (
                        <div
                          className="preset_config_fond_preview"
                          style={{ backgroundImage: `url(${draftImageFond})` }}
                          title="Aperçu du fond d'écran"
                        />
                      ) : (
                        <div className="preset_config_fond_preview preset_config_fond_preview--vide">
                          <span className="preset_config_fond_placeholder_icone">🖼️</span>
                          <span className="preset_config_fond_placeholder_texte">Aucun fond</span>
                        </div>
                      )}
                    </div>

                    {/* Couleur unie : sélecteur, code hexadécimal et couleurs rapides */}
                    {modeFond === 'couleur' && (
                      <div className="preset_config_fond_couleur">
                        <div className="preset_config_fond_couleur_ligne">
                          <label className="preset_config_fond_selecteur" title="Ouvrir le sélecteur de couleurs">
                            <input
                              type="color"
                              value={draftCouleurFond}
                              onChange={(e) => choisirCouleurFond(e.target.value)}
                              aria-label="Sélecteur de couleur du fond"
                            />
                            <span style={{ backgroundColor: draftCouleurFond }} aria-hidden="true" />
                          </label>
                          <input
                            type="text"
                            className={`param_input preset_config_fond_hex${versHex(saisieCouleur.startsWith('#') || saisieCouleur.startsWith('rgb') ? saisieCouleur : `#${saisieCouleur}`) ? '' : ' preset_config_fond_hex--invalide'}`}
                            value={saisieCouleur}
                            maxLength={18}
                            spellCheck={false}
                            onChange={(e) => saisirCouleurFond(e.target.value)}
                            onBlur={() => setSaisieCouleur(draftCouleurFond)}
                            aria-label="Code de la couleur (ex. #1e1f22)"
                          />
                        </div>
                        <div className="preset_config_fond_rapides" role="group" aria-label="Couleurs rapides">
                          {COULEURS_FOND_RAPIDES.map((couleur) => (
                            <button
                              key={couleur}
                              type="button"
                              className={`preset_config_fond_rapide${draftCouleurFond === couleur ? ' preset_config_fond_rapide--actif' : ''}`}
                              style={{ backgroundColor: couleur }}
                              onClick={() => choisirCouleurFond(couleur)}
                              aria-label={`Couleur ${couleur}`}
                              title={couleur}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bouton Parcourir et retirer l'image */}
                    {modeFond === 'image' && (
                    <div className="preset_config_fond_actions">
                      <label htmlFor="preset-image-fond-file" className="param_file_label">
                        📁 Parcourir...
                      </label>
                      <input
                        id="preset-image-fond-file"
                        type="file"
                        accept="image/*,.gif"
                        className="param_file_input"
                        onChange={(e) => handleImageChange(e.target.files?.[0])}
                      />

                      {draftImageFond && (
                        <button
                          type="button"
                          className="param_btn_reinit"
                          onClick={() => setDraftImageFond(null)}
                        >
                          Retirer l'image
                        </button>
                      )}
                    </div>
                    )}
                  </div>
                </div>
              </div>

              {/* --- Actions sur le préréglage --- */}
              <div className="preset_config_actions_bar">
                <button
                  type="button"
                  className="param_btn_valider preset_config_btn_sauvegarder"
                  onClick={handleEnregistrerModifications}
                  disabled={presetSelectionne.isSessionEnLigne}
                  title={
                    presetSelectionne.isSessionEnLigne
                      ? 'La session en ligne ne peut pas être modifiée'
                      : 'Enregistrer les modifications directement sur ce préréglage'
                  }
                >
                  💾 Enregistrer les modifications
                </button>

                <button
                  type="button"
                  className="param_btn_secondaire prereglage_btn_creer"
                  onClick={handleCreerNouveauPrereglage}
                >
                  + Créer un préréglage
                </button>

                {messageSucces && (
                  <span className="preset_config_succes_badge">
                    {messageSucces}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SectionPrereglages;
