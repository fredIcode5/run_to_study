import React, { useState, useMemo } from 'react';
import AnimationSvg from './AnimationSvg';
import { extraireVariablesSvg, normaliserHex } from './couleursCoureur';
import { SVG_COURSE_DEFAUT, SVG_REPOS_DEFAUT } from './svgCoureur';

/**
 * Interface de personnalisation individuelle des couleurs du coureur SVG.
 * Identifie dynamiquement les variables du SVG, affiche chaque partie avec son
 * sélecteur de couleur, permet de réinitialiser globalement ou par partie,
 * et offre un aperçu en direct avec bascule Course / Repos.
 */
function PersonnaliserCouleursCoureur({
  codeCourse = SVG_COURSE_DEFAUT,
  codeRepos = SVG_REPOS_DEFAUT,
  couleurs = {},
  onChangerCouleur,
  onReinitialiserPartie,
  onReinitialiserTout,
}) {
  const [modeApercu, setModeApercu] = useState('course'); // 'course' | 'repos'

  // Analyse les variables des codes SVG actuellement utilisés (course + repos)
  const parties = useMemo(() => {
    const detectees = extraireVariablesSvg(codeCourse, codeRepos);
    if (detectees.length > 0) return detectees;

    // Repli de sécurité si un SVG personnalisé sans variables explicites est chargé
    return [
      { id: '--couleur-tete', label: 'Tête', defaut: '#5865f2' },
      { id: '--couleur-torse', label: 'Haut du corps (Torse)', defaut: '#5865f2' },
      { id: '--couleur-bras', label: 'Bras', defaut: '#5865f2' },
      { id: '--couleur-jambes', label: 'Jambes', defaut: '#5865f2' },
    ];
  }, [codeCourse, codeRepos]);

  // Détermine si au moins une couleur est personnalisée par rapport à l'original
  const estModifie = useMemo(() => {
    return parties.some((partie) => {
      const courante = couleurs[partie.id];
      return courante && normaliserHex(courante) !== normaliserHex(partie.defaut);
    });
  }, [parties, couleurs]);

  const nbModifiees = useMemo(() => {
    return parties.filter((partie) => {
      const courante = couleurs[partie.id];
      return courante && normaliserHex(courante) !== normaliserHex(partie.defaut);
    }).length;
  }, [parties, couleurs]);

  return (
    <section className="parametres_section coureur_couleurs">
      <div className="coureur_editeur_entete">
        <div>
          <h4 className="profil_section_titre">Personnaliser les couleurs du coureur</h4>
          <p className="coureur_editeur_description">
            Choisis individuellement la couleur de chaque partie du corps. Les changements
            s'appliquent en direct au coureur du chrono sans interruption de ses animations.
          </p>
        </div>
        {estModifie && (
          <button
            type="button"
            className="btn_secondaire coureur_editeur_btn_defaut"
            onClick={onReinitialiserTout}
            title="Rétablir toutes les couleurs d'origine du SVG"
          >
            Rétablir les couleurs d'origine ({nbModifiees})
          </button>
        )}
      </div>

      <div className="coureur_couleurs_grille">
        {/* Colonne gauche : liste des parties et sélecteurs de couleur */}
        <div className="coureur_couleurs_liste" role="list" aria-label="Parties du corps personnalisables">
          {parties.map((partie) => {
            const couleurActuelle = normaliserHex(couleurs[partie.id] || partie.defaut);
            const estPartieModifiee =
              Boolean(couleurs[partie.id]) &&
              normaliserHex(couleurs[partie.id]) !== normaliserHex(partie.defaut);

            return (
              <div key={partie.id} className="coureur_couleur_item" role="listitem">
                <div className="coureur_couleur_info">
                  <span className="coureur_couleur_nom">{partie.label}</span>
                  <span className="coureur_couleur_technique">{partie.id}</span>
                </div>

                <div className="coureur_couleur_controle">
                  <label
                    className="preset_config_fond_selecteur coureur_couleur_swatch"
                    title={`Changer la couleur : ${partie.label}`}
                  >
                    <input
                      type="color"
                      value={couleurActuelle}
                      onChange={(e) => onChangerCouleur(partie.id, e.target.value)}
                      aria-label={`Couleur — ${partie.label}`}
                    />
                    <span style={{ backgroundColor: couleurActuelle }} aria-hidden="true" />
                  </label>

                  <span className="coureur_couleur_code" aria-hidden="true">
                    {couleurActuelle.toUpperCase()}
                  </span>

                  {estPartieModifiee ? (
                    <button
                      type="button"
                      className="coureur_couleur_btn_reinit"
                      onClick={() => onReinitialiserPartie(partie.id)}
                      title={`Rétablir la couleur d'origine (${partie.defaut.toUpperCase()})`}
                      aria-label={`Rétablir la couleur d'origine pour ${partie.label}`}
                    >
                      ↺
                    </button>
                  ) : (
                    <span className="coureur_couleur_btn_espace" aria-hidden="true" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Colonne droite : aperçu direct avec bascule Course / Repos */}
        <div className="coureur_couleurs_apercu_zone">
          <div className="coureur_couleurs_onglets_mode">
            <button
              type="button"
              className={`coureur_mode_btn${modeApercu === 'course' ? ' coureur_mode_btn--actif' : ''}`}
              onClick={() => setModeApercu('course')}
            >
              🏃 Course (Travail)
            </button>
            <button
              type="button"
              className={`coureur_mode_btn${modeApercu === 'repos' ? ' coureur_mode_btn--actif' : ''}`}
              onClick={() => setModeApercu('repos')}
            >
              🧘 Repos (Pause)
            </button>
          </div>

          <div className="coureur_editeur_apercu coureur_couleurs_apercu_box">
            <AnimationSvg
              code={modeApercu === 'course' ? codeCourse : codeRepos}
              couleurs={couleurs}
              titre={`Aperçu coureur — ${modeApercu === 'course' ? 'Course' : 'Repos'}`}
              className="coureur_editeur_apercu_svg"
            />
          </div>
          <span className="coureur_editeur_apercu_legende">
            Aperçu immédiat — tes choix s'affichent aussi en temps réel sur le chronomètre.
          </span>
        </div>
      </div>
    </section>
  );
}

export default PersonnaliserCouleursCoureur;
