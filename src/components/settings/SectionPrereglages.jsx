import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PrereglageCarte from './PrereglageCarte';
import MiniatureMusique from '../ui/MiniatureMusique';

// Section "Préréglages" : Carrousel 3D/Peek à gauche + Panneau Détails à droite
// + Section de configuration dédiée du préréglage sélectionné en 2 colonnes
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
  const configSectionRef = useRef(null);

  // Valeurs locales d'édition du préréglage sélectionné
  const [draftDureeTravail, setDraftDureeTravail] = useState(25);
  const [draftDureePause, setDraftDureePause] = useState(5);
  const [draftMusique, setDraftMusique] = useState(null);
  const [draftImageFond, setDraftImageFond] = useState(null);
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

  // Clic sur le bouton crayon dans les détails : scroll fluide vers la section de configuration
  const handleCrayonClick = (e) => {
    if (e) e.stopPropagation();
    if (configSectionRef.current) {
      configSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const premierInput = configSectionRef.current.querySelector('#preset-duree-travail');
      if (premierInput) {
        setTimeout(() => premierInput.focus(), 300);
      }
    }
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
        imageFond: draftImageFond,
      });
    }

    setMessageSucces('Modifications enregistrées ✓');
    setTimeout(() => setMessageSucces(''), 3000);
  };

  // Créer un nouveau préréglage avec la configuration actuelle
  const handleCreerNouveauPrereglage = () => {
    const configPersonnalisee = {
      couleurFondAppliquee: presetSelectionne?.couleurFondAppliquee || null,
      imageFond: draftImageFond,
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

  // Calculs pour les détails du preset
  const tempsTravail = presetSelectionne?.reglages?.dureeTravail ?? 25;
  const tempsPause = presetSelectionne?.reglages?.dureePause ?? 5;
  const totalTemps = tempsTravail + tempsPause;
  const pctTravail = totalTemps > 0 ? Math.round((tempsTravail / totalTemps) * 100) : 80;

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
              Partie 1 : Carrousel 3D (gauche) + Détails du preset (droite)
             ====================================================================== */}
          <div className="prereglages_layout">
            {/* Colonne GAUCHE : Carrousel 3D centré avec peek */}
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

            {/* Colonne DROITE : Affichage des détails (temps de travail et repos) */}
            {presetSelectionne && (
              <div className="prereglages_colonne_droite">
                <div className="prereglages_infos_carte">
                  <div className="prereglages_infos_entete">
                    <div className="prereglages_infos_titre_wrap">
                      <span className="prereglages_infos_sur_titre">Détails du preset</span>
                      <h4 className="prereglages_infos_nom" title={presetSelectionne.nom}>
                        {presetSelectionne.nom}
                      </h4>
                    </div>
                    {presetSelectionne.isSessionEnLigne ? (
                      <span className="prereglages_infos_badge_online">
                        <span className="prereglages_carte_badge_pulse" />
                        En ligne
                      </span>
                    ) : (
                      <span className="prereglages_infos_badge_custom">Preset</span>
                    )}
                  </div>

                  <div className="prereglages_infos_grille_durees">
                    <div className="prereglages_infos_stat">
                      <div className="prereglages_infos_stat_header">
                        <span className="prereglages_infos_stat_icone">⏱️</span>
                        <span className="prereglages_infos_stat_label">Travail</span>
                      </div>
                      <span className="prereglages_infos_stat_valeur">
                        {tempsTravail} <small>min</small>
                      </span>
                    </div>

                    <div className="prereglages_infos_stat">
                      <div className="prereglages_infos_stat_header">
                        <span className="prereglages_infos_stat_icone">☕</span>
                        <span className="prereglages_infos_stat_label">Repos</span>
                      </div>
                      <span className="prereglages_infos_stat_valeur">
                        {tempsPause} <small>min</small>
                      </span>
                    </div>
                  </div>

                  {/* Barre de ratio visuel travail / repos */}
                  <div className="prereglages_infos_ratio_wrap">
                    <div className="prereglages_infos_ratio_barre">
                      <div
                        className="prereglages_infos_ratio_fill prereglages_infos_ratio_fill--travail"
                        style={{ width: `${pctTravail}%` }}
                      />
                      <div
                        className="prereglages_infos_ratio_fill prereglages_infos_ratio_fill--pause"
                        style={{ width: `${100 - pctTravail}%` }}
                      />
                    </div>
                    <div className="prereglages_infos_ratio_labels">
                      <span>Travail {pctTravail}%</span>
                      <span>Repos {100 - pctTravail}%</span>
                    </div>
                  </div>

                  {/* Actions du preset */}
                  <div className="prereglages_infos_actions">
                    <button
                      type="button"
                      className="prereglages_infos_btn_appliquer"
                      onClick={() => onAppliquer(presetSelectionne)}
                    >
                      Appliquer ce preset ✓
                    </button>

                    {!presetSelectionne.isSessionEnLigne && (
                      <div className="prereglages_infos_outils">
                        <button
                          type="button"
                          className="prereglages_infos_outil_btn"
                          onClick={() => onRemplacer(presetSelectionne.id)}
                          title="Mettre à jour avec les réglages actuels"
                          aria-label="Mettre à jour"
                        >
                          ⟳
                        </button>
                        <button
                          type="button"
                          className="prereglages_infos_outil_btn"
                          onClick={handleCrayonClick}
                          title="Éditer la configuration du preset"
                          aria-label="Éditer la configuration"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="prereglages_infos_outil_btn prereglages_infos_outil_btn--suppr"
                          onClick={() => onDemanderSuppression(presetSelectionne.id)}
                          title="Supprimer"
                          aria-label="Supprimer"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================================
              Partie 2 : Section dédiée à la configuration du préréglage sélectionné
              Organisée en deux colonnes sur la même ligne
             ====================================================================== */}
          {presetSelectionne && (
            <div
              className="preset_config_section"
              ref={configSectionRef}
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

                    {/* Aperçu carré du fond */}
                    <div className="preset_config_fond_preview_wrap">
                      {draftImageFond ? (
                        <div
                          className="preset_config_fond_preview"
                          style={{ backgroundImage: `url(${draftImageFond})` }}
                          title="Aperçu du fond d'écran"
                        />
                      ) : presetSelectionne.couleurFondAppliquee ? (
                        <div
                          className="preset_config_fond_preview"
                          style={{ backgroundColor: presetSelectionne.couleurFondAppliquee }}
                          title="Aperçu de la couleur de fond"
                        />
                      ) : (
                        <div className="preset_config_fond_preview preset_config_fond_preview--vide">
                          <span className="preset_config_fond_placeholder_icone">🖼️</span>
                          <span className="preset_config_fond_placeholder_texte">Aucun fond</span>
                        </div>
                      )}
                    </div>

                    {/* Bouton Parcourir et retirer l'image */}
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
