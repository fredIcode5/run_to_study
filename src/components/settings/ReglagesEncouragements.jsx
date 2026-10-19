import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Upload, Download, Plus } from 'lucide-react';
import ModalConfirmation from '../ui/ModalConfirmation';
import {
  CITATIONS_DEFAUT,
  LONGUEUR_MAX_CITATION,
  LONGUEUR_MAX_AUTEUR,
  NOMBRE_MAX_CITATIONS,
  analyserFichierCitations,
  normaliserEncouragements,
  BORNES_AFFICHAGE_ACCUEIL,
  AFFICHAGE_ACCUEIL_DEFAUT,
  normaliserAffichageAccueil,
} from '../accueil/encouragements';
import { BORNES_VOILE, VOILE_DEFAUT, normaliserFondAccueil } from '../accueil/fondAccueil';
import { POLICES_ACCUEIL, trouverPoliceAccueil, chargerPoliceAccueil } from '../accueil/policesAccueil';

// Curseurs du bloc « Affichage » (la taille est saisie en %, stockée en échelle)
const REGLAGES_AFFICHAGE = [
  { cle: 'x', label: 'Horizontal', aide: '← gauche · droite →', unite: 'px', pas: 1 },
  { cle: 'y', label: 'Vertical', aide: '↑ haut · bas ↓', unite: 'px', pas: 1 },
  { cle: 'taille', label: 'Taille du texte', aide: '100 % = taille normale', unite: '%', pas: 5 },
];
const versAffichage = (cle, v) => (cle === 'taille' ? Math.round(v * 100) : v);
const depuisAffichage = (cle, v) => (cle === 'taille' ? Number(v) / 100 : Number(v));

// --- Police, position, taille du texte et couleur du pseudo de l'écran d'accueil,
// appliquées en direct (l'écran reste visible à gauche du menu pendant le réglage)
function ReglagesAffichageAccueil({ affichage, onChanger }) {
  const valeurs = normaliserAffichageAccueil(affichage);
  const changer = (cle, valeur) => onChanger(normaliserAffichageAccueil({ ...valeurs, [cle]: valeur }));
  const parDefaut = ['x', 'y', 'taille', 'couleurPseudo', 'police'].every((cle) => valeurs[cle] === AFFICHAGE_ACCUEIL_DEFAUT[cle]);
  const police = trouverPoliceAccueil(valeurs.police);

  // L'aperçu sous le menu s'affiche dans la police choisie
  useEffect(() => chargerPoliceAccueil(police.id), [police.id]);

  return (
    <div className="encouragements_affichage">
      <div className="couleurs_chrono_entete">
        <span className="couleurs_chrono_label">Affichage</span>
        {!parDefaut && (
          <button type="button" className="couleurs_chrono_reinit" onClick={() => onChanger(AFFICHAGE_ACCUEIL_DEFAUT)}>
            Par défaut
          </button>
        )}
      </div>

      <div className="encouragements_reglage">
        <label className="encouragements_reglage_entete" htmlFor="accueil-reglage-police">
          <span className="couleurs_chrono_label">Police</span>
          <span className="couleurs_chrono_aide">Bienvenue et citation</span>
        </label>
        <select
          id="accueil-reglage-police"
          className="ambiance_select encouragements_police"
          value={valeurs.police}
          onChange={(e) => changer('police', e.target.value)}
        >
          {POLICES_ACCUEIL.map((p) => (
            <option key={p.id} value={p.id}>{p.nom}</option>
          ))}
        </select>
        <p className="encouragements_police_apercu" style={{ '--apercu-police': police.famille }} aria-hidden="true">
          <span className="encouragements_police_apercu_bienvenue">Bienvenue</span>
          {' '}
          <span className="encouragements_police_apercu_citation">Petit à petit, l'oiseau fait son nid.</span>
        </p>
      </div>

      {REGLAGES_AFFICHAGE.map(({ cle, label, aide, unite, pas }) => {
        const bornes = BORNES_AFFICHAGE_ACCUEIL[cle];
        return (
          <div key={cle} className="encouragements_reglage">
            <label className="encouragements_reglage_entete" htmlFor={`accueil-reglage-${cle}`}>
              <span className="couleurs_chrono_label">{label}</span>
              <span className="couleurs_chrono_aide">{aide}</span>
            </label>
            <div className="encouragements_reglage_ligne">
              <input
                id={`accueil-reglage-${cle}`}
                type="range"
                className="encouragements_curseur"
                min={versAffichage(cle, bornes.min)}
                max={versAffichage(cle, bornes.max)}
                step={pas}
                value={versAffichage(cle, valeurs[cle])}
                onChange={(e) => changer(cle, depuisAffichage(cle, e.target.value))}
              />
              <span className="encouragements_reglage_valeur">
                <input
                  type="number"
                  min={versAffichage(cle, bornes.min)}
                  max={versAffichage(cle, bornes.max)}
                  step={pas}
                  value={versAffichage(cle, valeurs[cle])}
                  onChange={(e) => e.target.value !== '' && changer(cle, depuisAffichage(cle, e.target.value))}
                  aria-label={`${label} (${unite})`}
                />
                {unite}
              </span>
            </div>
          </div>
        );
      })}

      <label className="couleurs_chrono_choix encouragements_couleur_pseudo">
        <span className="preset_config_fond_selecteur" title="Choisir la couleur du pseudo">
          <input
            type="color"
            value={valeurs.couleurPseudo}
            onChange={(e) => changer('couleurPseudo', e.target.value)}
            aria-label="Couleur du pseudo"
          />
          <span style={{ backgroundColor: valeurs.couleurPseudo }} aria-hidden="true" />
        </span>
        <span className="couleurs_chrono_texte">
          <span className="couleurs_chrono_label">Couleur du pseudo</span>
          <span className="couleurs_chrono_aide">Dans « Bienvenue <span style={{ color: valeurs.couleurPseudo }}>pseudo</span> »</span>
        </span>
      </label>
    </div>
  );
}

const EXEMPLE_FICHIER = `{
  "citations": [
    { "texte": "Rien ne sert de courir ; il faut partir à point.", "auteur": "Jean de La Fontaine" },
    { "texte": "Commence maintenant, améliore ensuite." }
  ]
}`;

// Une citation (texte + auteur facultatif) modifiable sur place : validée en quittant le champ
function LigneCitation({ citation, peutSupprimer, onModifier, onSupprimer }) {
  const [texte, setTexte] = useState(citation.texte);
  const [auteur, setAuteur] = useState(citation.auteur);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    setTexte(citation.texte);
    setAuteur(citation.auteur);
  }, [citation]);

  const valider = () => {
    const nouveauTexte = texte.trim();
    const nouvelAuteur = auteur.trim();
    if (!nouveauTexte) {
      setTexte(citation.texte);
      setErreur(true);
      setTimeout(() => setErreur(false), 2500);
      return;
    }
    if (nouveauTexte !== citation.texte || nouvelAuteur !== citation.auteur) {
      onModifier({ texte: nouveauTexte, auteur: nouvelAuteur });
    }
  };

  const validerAvecEntree = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); }
  };

  return (
    <li className={`encouragements_ligne${erreur ? ' encouragements_ligne--erreur' : ''}`}>
      <div className="encouragements_ligne_champs">
        <textarea
          className="encouragements_champ"
          value={texte}
          rows={2}
          maxLength={LONGUEUR_MAX_CITATION}
          onChange={(e) => setTexte(e.target.value)}
          onBlur={valider}
          onKeyDown={validerAvecEntree}
          aria-label="Citation"
          title={erreur ? 'Une citation ne peut pas être vide' : undefined}
        />
        <input
          type="text"
          className="encouragements_champ encouragements_champ--auteur"
          value={auteur}
          maxLength={LONGUEUR_MAX_AUTEUR}
          placeholder="Auteur (facultatif)"
          onChange={(e) => setAuteur(e.target.value)}
          onBlur={valider}
          onKeyDown={validerAvecEntree}
          aria-label="Auteur de la citation"
        />
      </div>
      <button
        type="button"
        className="encouragements_supprimer"
        onClick={onSupprimer}
        disabled={!peutSupprimer}
        aria-label="Supprimer cette citation"
        title={peutSupprimer ? 'Supprimer' : 'Il faut garder au moins une citation'}
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

// --- Voile gris de l'écran d'accueil, posé sur le fond d'écran choisi (preset,
// couleur ou image de l'application) : seule son opacité se règle, pour tous les presets.
function ReglageVoileAccueil({ fond, onChanger }) {
  const { voile } = normaliserFondAccueil(fond);
  const voilePct = Math.round(voile * 100);

  return (
    <div className="encouragements_affichage">
      <div className="couleurs_chrono_entete">
        <span className="couleurs_chrono_label">Voile gris</span>
        {voile !== VOILE_DEFAUT && (
          <button type="button" className="couleurs_chrono_reinit" onClick={() => onChanger({ voile: VOILE_DEFAUT })}>
            Par défaut
          </button>
        )}
      </div>
      <p className="couleurs_chrono_aide">
        Posé sur le fond d'écran de ton preset quand l'espace de travail est vide. 0 % : fond intact, 100 % : gris uni.
      </p>
      <div className="encouragements_reglage_ligne">
        <input
          id="fond-accueil-voile"
          type="range"
          className="encouragements_curseur"
          min={Math.round(BORNES_VOILE.min * 100)}
          max={Math.round(BORNES_VOILE.max * 100)}
          step={5}
          value={voilePct}
          onChange={(e) => onChanger({ voile: Number(e.target.value) / 100 })}
          aria-label="Opacité du voile gris"
        />
        <span className="encouragements_reglage_valeur">
          <input
            type="number"
            min={Math.round(BORNES_VOILE.min * 100)}
            max={Math.round(BORNES_VOILE.max * 100)}
            step={1}
            value={voilePct}
            onChange={(e) => e.target.value !== '' && onChanger({ voile: Number(e.target.value) / 100 })}
            aria-label="Opacité du voile gris (%)"
          />
          %
        </span>
      </div>
    </div>
  );
}

// --- « Mon Pomodoro » : réglage « Encouragements » de l'écran d'accueil.
// Les changements sont appliqués et enregistrés immédiatement ; un import de
// fichier demande toujours de choisir entre remplacer et ajouter.
function ReglagesEncouragements({ encouragements, onChanger, fond, onChangerFond }) {
  const valeurs = normaliserEncouragements(encouragements);
  const [nouvelle, setNouvelle] = useState('');
  const [nouvelAuteur, setNouvelAuteur] = useState('');
  const [message, setMessage] = useState(null); // { type: 'erreur' | 'succes', texte }
  const [importEnAttente, setImportEnAttente] = useState(null); // citations lues dans le fichier
  const [confirmerDefaut, setConfirmerDefaut] = useState(false);
  const inputFichierRef = useRef(null);
  const minuterieRef = useRef(null);

  useEffect(() => () => clearTimeout(minuterieRef.current), []);

  const afficherMessage = (type, texte, duree = 4000) => {
    setMessage({ type, texte });
    clearTimeout(minuterieRef.current);
    if (duree) minuterieRef.current = setTimeout(() => setMessage(null), duree);
  };

  const changerCitations = (citations) => onChanger({ ...valeurs, citations });

  const dejaPresente = (texte) => valeurs.citations.some((c) => c.texte === texte);

  const ajouter = () => {
    const texte = nouvelle.trim();
    if (!texte) return;
    if (dejaPresente(texte)) {
      afficherMessage('erreur', 'Cette citation est déjà dans la liste.');
      return;
    }
    if (valeurs.citations.length >= NOMBRE_MAX_CITATIONS) {
      afficherMessage('erreur', `${NOMBRE_MAX_CITATIONS} citations au maximum.`);
      return;
    }
    changerCitations([...valeurs.citations, { texte, auteur: nouvelAuteur.trim() }]);
    setNouvelle('');
    setNouvelAuteur('');
  };

  const lireFichier = (fichier) => {
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      const { citations, erreur } = analyserFichierCitations(String(lecteur.result || ''));
      if (erreur) {
        setImportEnAttente(null);
        afficherMessage('erreur', `Import impossible : ${erreur}`, 0);
        return;
      }
      setMessage(null);
      setImportEnAttente(citations);
    };
    lecteur.onerror = () => afficherMessage('erreur', 'Le fichier n\'a pas pu être lu.', 0);
    lecteur.readAsText(fichier);
  };

  const appliquerImport = (mode) => {
    if (!importEnAttente) return;
    if (mode === 'remplacer') {
      changerCitations(importEnAttente);
      afficherMessage('succes', `Liste remplacée : ${importEnAttente.length} citation(s).`);
    } else {
      const ajouts = importEnAttente.filter((c) => !dejaPresente(c.texte));
      changerCitations([...valeurs.citations, ...ajouts].slice(0, NOMBRE_MAX_CITATIONS));
      afficherMessage('succes', `${ajouts.length} citation(s) ajoutée(s)${ajouts.length < importEnAttente.length ? ' (doublons ignorés)' : ''}.`);
    }
    setImportEnAttente(null);
  };

  const exporter = () => {
    const blob = new Blob([JSON.stringify({ citations: valeurs.citations }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'encouragements.json';
    lien.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="param_section encouragements">
      <div className="couleurs_chrono_entete">
        <h3 className="param_section_titre">Encouragements</h3>
        <span className="encouragements_compte">{valeurs.citations.length} citation{valeurs.citations.length > 1 ? 's' : ''}</span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={valeurs.actif}
        className="encouragements_interrupteur"
        onClick={() => onChanger({ ...valeurs, actif: !valeurs.actif })}
      >
        <span className="encouragements_interrupteur_texte">
          <span className="couleurs_chrono_label">Écran d'accueil</span>
          <span className="couleurs_chrono_aide">Bienvenue + citation quand l'espace de travail est vide</span>
        </span>
        <span className={`switch ${valeurs.actif ? 'switch--actif' : ''}`} aria-hidden="true">
          <span className="switch_bouton" />
        </span>
      </button>

      <ReglagesAffichageAccueil
        affichage={valeurs.affichage}
        onChanger={(affichage) => onChanger({ ...valeurs, affichage })}
      />

      <ReglageVoileAccueil fond={fond} onChanger={onChangerFond} />

      <ul className="encouragements_liste">
        {valeurs.citations.map((citation, i) => (
          <LigneCitation
            key={`${i}-${citation.texte}`}
            citation={citation}
            peutSupprimer={valeurs.citations.length > 1}
            onModifier={(modifiee) => changerCitations(valeurs.citations.map((c, j) => (j === i ? modifiee : c)))}
            onSupprimer={() => changerCitations(valeurs.citations.filter((_, j) => j !== i))}
          />
        ))}
      </ul>

      <div className="encouragements_ajout">
        <div className="encouragements_ligne_champs">
          <input
            type="text"
            className="param_input"
            placeholder="Nouvelle citation…"
            value={nouvelle}
            maxLength={LONGUEUR_MAX_CITATION}
            onChange={(e) => setNouvelle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') ajouter(); }}
            aria-label="Nouvelle citation"
          />
          <input
            type="text"
            className="param_input encouragements_champ--auteur"
            placeholder="Auteur (facultatif)"
            value={nouvelAuteur}
            maxLength={LONGUEUR_MAX_AUTEUR}
            onChange={(e) => setNouvelAuteur(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') ajouter(); }}
            aria-label="Auteur de la nouvelle citation"
          />
        </div>
        <button type="button" className="encouragements_btn" onClick={ajouter} disabled={!nouvelle.trim()} aria-label="Ajouter la citation">
          <Plus size={15} />
        </button>
      </div>

      <div className="encouragements_actions">
        <button type="button" className="encouragements_btn encouragements_btn--texte" onClick={() => inputFichierRef.current?.click()}>
          <Upload size={14} /> Importer (JSON)
        </button>
        <button type="button" className="encouragements_btn encouragements_btn--texte" onClick={exporter}>
          <Download size={14} /> Exporter
        </button>
        <button type="button" className="couleurs_chrono_reinit" onClick={() => setConfirmerDefaut(true)}>
          Citations par défaut
        </button>
        <input
          ref={inputFichierRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => { lireFichier(e.target.files?.[0]); e.target.value = ''; }}
        />
      </div>

      {/* Import valide : jamais d'écrasement silencieux, l'utilisateur choisit */}
      {importEnAttente && (
        <div className="encouragements_import" role="dialog" aria-label="Importer des citations">
          <p>
            <strong>{importEnAttente.length} citation{importEnAttente.length > 1 ? 's' : ''}</strong> valide{importEnAttente.length > 1 ? 's' : ''} dans le fichier.
            Que faire de ta liste actuelle ({valeurs.citations.length}) ?
          </p>
          <div className="encouragements_import_actions">
            <button type="button" className="encouragements_btn encouragements_btn--principal" onClick={() => appliquerImport('ajouter')}>
              Ajouter à la liste
            </button>
            <button type="button" className="encouragements_btn encouragements_btn--texte" onClick={() => appliquerImport('remplacer')}>
              Remplacer la liste
            </button>
            <button type="button" className="couleurs_chrono_reinit" onClick={() => setImportEnAttente(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={`encouragements_message encouragements_message--${message.type}`} role={message.type === 'erreur' ? 'alert' : 'status'}>
          {message.texte}
        </p>
      )}

      <details className="encouragements_format">
        <summary>Format du fichier JSON</summary>
        <pre>{EXEMPLE_FICHIER}</pre>
        <p>
          Chaque citation : un objet avec « texte » (non vide, {LONGUEUR_MAX_CITATION} caractères au plus) et « auteur »
          (facultatif), ou simplement un texte. {NOMBRE_MAX_CITATIONS} citations au maximum.
        </p>
      </details>

      {createPortal(
        <ModalConfirmation
          ouvert={confirmerDefaut}
          message={`Remplacer tes ${valeurs.citations.length} citations par les ${CITATIONS_DEFAUT.length} citations par défaut ?`}
          libelleConfirmer="Remplacer"
          onConfirmer={() => { changerCitations(CITATIONS_DEFAUT); setConfirmerDefaut(false); afficherMessage('succes', 'Citations par défaut rétablies.'); }}
          onAnnuler={() => setConfirmerDefaut(false)}
        />,
        document.body
      )}
    </div>
  );
}

export default ReglagesEncouragements;
