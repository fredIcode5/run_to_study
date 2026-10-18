import React, { useState, useEffect, useRef } from 'react';
import AnimationSvg from '../coureur/AnimationSvg';
import {
  assainirSvg,
  SVG_COURSE_DEFAUT,
  SVG_REPOS_DEFAUT,
  TAILLE_MAX_SVG,
  BORNES_AFFICHAGE_COUREUR,
  AFFICHAGE_COUREUR_DEFAUT,
  normaliserAffichageCoureur,
} from '../coureur/svgCoureur';
import '../coureur/Coureur.css';

// --- Éditeur d'une animation (course ou repos) : code, aperçu, enregistrement.
// Chaque éditeur a son propre brouillon : enregistrer l'un ne touche pas l'autre.
function EditeurAnimation({ titre, description, codeEnregistre, codeDefaut, onEnregistrer }) {
  const [brouillon, setBrouillon] = useState(codeEnregistre || '');
  const [apercu, setApercu] = useState(codeEnregistre || codeDefaut);
  const [erreur, setErreur] = useState(null);
  const [retraits, setRetraits] = useState([]);
  const [message, setMessage] = useState('');
  const inputFichierRef = useRef(null);
  const minuterieRef = useRef(null);

  // Une animation enregistrée ailleurs (chargement du compte) remplace un éditeur intact
  const dernierEnregistreRef = useRef(codeEnregistre);
  useEffect(() => {
    if (codeEnregistre === dernierEnregistreRef.current) return;
    setBrouillon((actuel) => (actuel === (dernierEnregistreRef.current || '') ? codeEnregistre || '' : actuel));
    setApercu(codeEnregistre || codeDefaut);
    dernierEnregistreRef.current = codeEnregistre;
  }, [codeEnregistre, codeDefaut]);

  useEffect(() => () => clearTimeout(minuterieRef.current), []);

  const afficherMessage = (texte) => {
    setMessage(texte);
    clearTimeout(minuterieRef.current);
    minuterieRef.current = setTimeout(() => setMessage(''), 3000);
  };

  // Valide le brouillon et met à jour l'aperçu ; renvoie vrai si le SVG est exploitable
  const valider = () => {
    const resultat = assainirSvg(brouillon);
    setErreur(resultat.erreur);
    setRetraits(resultat.retraits);
    if (!resultat.erreur) setApercu(brouillon);
    return !resultat.erreur;
  };

  const enregistrer = () => {
    if (!valider()) return;
    dernierEnregistreRef.current = brouillon;
    onEnregistrer(brouillon);
    afficherMessage('Animation enregistrée ✓');
  };

  const retablirDefaut = () => {
    dernierEnregistreRef.current = null;
    onEnregistrer(null);
    setBrouillon('');
    setApercu(codeDefaut);
    setErreur(null);
    setRetraits([]);
    afficherMessage('Animation par défaut rétablie');
  };

  const importerFichier = (fichier) => {
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      setBrouillon(String(lecteur.result || ''));
      setErreur(null);
    };
    lecteur.readAsText(fichier);
  };

  const modifie = brouillon !== (codeEnregistre || '');
  const apercuAJour = brouillon.trim() === '' ? apercu === (codeEnregistre || codeDefaut) : apercu === brouillon;
  const taille = new Blob([brouillon]).size;

  return (
    <section className="parametres_section coureur_editeur">
      <div className="coureur_editeur_entete">
        <div>
          <h4 className="profil_section_titre">{titre}</h4>
          <p className="coureur_editeur_description">{description}</p>
        </div>
        <span className={`coureur_editeur_badge${codeEnregistre ? ' coureur_editeur_badge--perso' : ''}`}>
          {codeEnregistre ? 'Personnalisée' : 'Par défaut'}
        </span>
      </div>

      <div className="coureur_editeur_grille">
        <div className="coureur_editeur_code">
          <textarea
            className={`coureur_editeur_champ${erreur ? ' coureur_editeur_champ--erreur' : ''}`}
            value={brouillon}
            onChange={(e) => { setBrouillon(e.target.value); setErreur(null); }}
            placeholder={'Colle ici le code SVG complet :\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="…">\n  …\n</svg>'}
            spellCheck={false}
            aria-label={`Code SVG — ${titre}`}
            aria-invalid={Boolean(erreur)}
          />
          <div className="coureur_editeur_infos">
            <span>{taille > 0 ? `${(taille / 1024).toFixed(1).replace('.', ',')} Ko / ${TAILLE_MAX_SVG / 1024} Ko` : 'Aucun code personnalisé'}</span>
            {modifie && <span className="coureur_editeur_modifie">● modifications non enregistrées</span>}
          </div>
        </div>

        <div className="coureur_editeur_apercu_zone">
          <div className="coureur_editeur_apercu">
            <AnimationSvg code={apercu} titre={`Aperçu — ${titre}`} className="coureur_editeur_apercu_svg" />
          </div>
          <span className="coureur_editeur_apercu_legende">
            {apercuAJour ? 'Aperçu' : 'Aperçu non à jour — clique sur « Prévisualiser »'}
          </span>
        </div>
      </div>

      {erreur && <p className="coureur_editeur_erreur" role="alert">⚠ {erreur}</p>}
      {!erreur && retraits.length > 0 && (
        <p className="coureur_editeur_avertissement">
          Retiré à l'affichage pour des raisons de sécurité : {retraits.join(', ')}. Ton code enregistré reste intact.
        </p>
      )}

      <div className="coureur_editeur_actions">
        <button type="button" className="btn_secondaire" onClick={valider} disabled={!brouillon.trim()}>
          Prévisualiser
        </button>
        <button type="button" className="btn_primaire" onClick={enregistrer} disabled={!brouillon.trim() || !modifie}>
          Enregistrer
        </button>
        <button type="button" className="btn_secondaire" onClick={() => inputFichierRef.current?.click()}>
          Importer un .svg
        </button>
        {!brouillon.trim() && (
          <button type="button" className="btn_secondaire" onClick={() => setBrouillon(codeDefaut)}>
            Partir de l'exemple
          </button>
        )}
        {codeEnregistre && (
          <button type="button" className="btn_secondaire coureur_editeur_btn_defaut" onClick={retablirDefaut}>
            Rétablir l'animation par défaut
          </button>
        )}
        {message && <span className="coureur_editeur_message" role="status">{message}</span>}
        <input
          ref={inputFichierRef}
          type="file"
          accept=".svg,image/svg+xml"
          hidden
          onChange={(e) => { importerFichier(e.target.files?.[0]); e.target.value = ''; }}
        />
      </div>
    </section>
  );
}

// Classe posée sur <body> : la fenêtre du profil s'efface pour laisser voir le chrono
const CLASSE_APERCU_DIRECT = 'coureur_apercu_direct';

const REGLAGES = [
  { cle: 'x', label: 'Horizontal', aide: '← gauche · droite →', unite: 'px' },
  { cle: 'y', label: 'Vertical', aide: '↑ haut · bas ↓', unite: 'px' },
  { cle: 'echelle', label: 'Taille', aide: '100 % = taille par défaut', unite: '%' },
];

// --- Position et taille du coureur : appliquées en direct aux trois formes du chrono
function ReglagesAffichage({ affichage, onChanger }) {
  const valeurs = normaliserAffichageCoureur(affichage);

  // Aperçu direct : tant qu'un curseur est tenu (ou le bouton « Voir sur le chrono »),
  // la fenêtre du profil devient presque transparente
  const activerApercu = () => {
    document.body.classList.add(CLASSE_APERCU_DIRECT);
    const arreter = () => {
      document.body.classList.remove(CLASSE_APERCU_DIRECT);
      document.removeEventListener('pointerup', arreter);
      document.removeEventListener('pointercancel', arreter);
    };
    document.addEventListener('pointerup', arreter);
    document.addEventListener('pointercancel', arreter);
  };
  useEffect(() => () => document.body.classList.remove(CLASSE_APERCU_DIRECT), []);

  const changer = (cle, valeur) => onChanger(normaliserAffichageCoureur({ ...valeurs, [cle]: valeur }));
  const versAffichage = (cle, v) => (cle === 'echelle' ? Math.round(v * 100) : v);
  const depuisAffichage = (cle, v) => (cle === 'echelle' ? Number(v) / 100 : Number(v));
  const parDefaut = valeurs.x === 0 && valeurs.y === 0 && valeurs.echelle === 1;

  return (
    <section className="parametres_section coureur_reglages">
      <div className="coureur_editeur_entete">
        <div>
          <h4 className="profil_section_titre">Position et taille</h4>
          <p className="coureur_editeur_description">
            S'appliquent en direct au coureur du chrono. Pendant que tu fais glisser un curseur,
            cette fenêtre s'efface pour te laisser voir le résultat.
          </p>
        </div>
      </div>

      <div className="coureur_reglages_lignes">
        {REGLAGES.map(({ cle, label, aide, unite }) => {
          const bornes = BORNES_AFFICHAGE_COUREUR[cle];
          const pas = cle === 'echelle' ? 5 : bornes.pas;
          return (
            <div key={cle} className="coureur_reglage">
              <label className="coureur_reglage_label" htmlFor={`coureur-reglage-${cle}`}>
                {label}
                <span className="coureur_reglage_aide">{aide}</span>
              </label>
              <input
                id={`coureur-reglage-${cle}`}
                type="range"
                className="coureur_reglage_curseur"
                min={versAffichage(cle, bornes.min)}
                max={versAffichage(cle, bornes.max)}
                step={pas}
                value={versAffichage(cle, valeurs[cle])}
                onPointerDown={activerApercu}
                onChange={(e) => changer(cle, depuisAffichage(cle, e.target.value))}
              />
              <div className="coureur_reglage_valeur">
                <input
                  type="number"
                  min={versAffichage(cle, bornes.min)}
                  max={versAffichage(cle, bornes.max)}
                  step={pas}
                  value={versAffichage(cle, valeurs[cle])}
                  onChange={(e) => e.target.value !== '' && changer(cle, depuisAffichage(cle, e.target.value))}
                  aria-label={`${label} (${unite})`}
                />
                <span>{unite}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="coureur_editeur_actions">
        <button type="button" className="btn_secondaire" onPointerDown={activerApercu}>
          👁 Voir sur le chrono (maintenir)
        </button>
        <button
          type="button"
          className="btn_secondaire coureur_editeur_btn_defaut"
          onClick={() => onChanger(AFFICHAGE_COUREUR_DEFAUT)}
          disabled={parDefaut}
        >
          Position et taille par défaut
        </button>
      </div>
    </section>
  );
}

// --- Onglet « Coureur » : position, taille et animations du coureur affiché à côté du chronomètre
function OngletCoureur({ animations, onEnregistrerAnimation, affichage, onChangerAffichage }) {
  return (
    <div className="coureur_onglet">
      <p className="coureur_onglet_intro">
        Le coureur s'affiche à droite du chronomètre. Règle sa position et sa taille, puis colle le code
        SVG de chaque animation (les animations SMIL et CSS intégrées sont conservées), prévisualise-le
        et enregistre.
      </p>

      <ReglagesAffichage affichage={affichage} onChanger={onChangerAffichage} />

      <EditeurAnimation
        titre="1. Animation de course"
        description="Jouée pendant les sessions de travail."
        codeEnregistre={animations?.course || null}
        codeDefaut={SVG_COURSE_DEFAUT}
        onEnregistrer={(code) => onEnregistrerAnimation('course', code)}
      />

      <EditeurAnimation
        titre="2. Animation de repos"
        description="Jouée pendant les pauses."
        codeEnregistre={animations?.repos || null}
        codeDefaut={SVG_REPOS_DEFAUT}
        onEnregistrer={(code) => onEnregistrerAnimation('repos', code)}
      />
    </div>
  );
}

export default OngletCoureur;
