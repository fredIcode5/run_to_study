import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Radio, ListMusic, Play, Pencil, Trash2, ChevronUp, ChevronDown, X, Plus } from 'lucide-react';
import ModalConfirmation from '../ui/ModalConfirmation';
import { analyserLienRadio, genererIdRadio, miniatureYoutube } from './radios';

const libelleElement = (element) => (element.type === 'playlist' ? 'Playlist' : 'Vidéo');

const memesElements = (a, b) => a.length === b.length && a.every((e, i) => e.youtubeId === b[i].youtubeId && e.type === b[i].type);

// --- Éditeur d'une radio : nom, sources (playlists / vidéos YouTube) et leur ordre.
// Les changements restent un brouillon jusqu'à « Enregistrer ».
function EditeurRadio({ radio, estNouvelle, onEnregistrer, onAnnuler, onSupprimer }) {
  const [nom, setNom] = useState(radio.nom);
  const [elements, setElements] = useState(radio.elements);
  const [lien, setLien] = useState('');
  const [erreur, setErreur] = useState(null);
  const champNomRef = useRef(null);

  useEffect(() => {
    if (estNouvelle) champNomRef.current?.focus();
  }, [estNouvelle]);

  const ajouterLien = () => {
    const { element, erreur: erreurLien } = analyserLienRadio(lien);
    if (erreurLien) { setErreur(erreurLien); return; }
    if (elements.some((e) => e.type === element.type && e.youtubeId === element.youtubeId)) {
      setErreur('Ce lien est déjà dans la radio.');
      return;
    }
    setElements((prev) => [...prev, element]);
    setLien('');
    setErreur(null);
  };

  const deplacer = (index, sens) => {
    setElements((prev) => {
      const cible = index + sens;
      if (cible < 0 || cible >= prev.length) return prev;
      const copie = prev.slice();
      [copie[index], copie[cible]] = [copie[cible], copie[index]];
      return copie;
    });
  };

  const modifie = estNouvelle || nom.trim() !== radio.nom || !memesElements(elements, radio.elements);
  const valide = nom.trim() !== '' && elements.length > 0;

  const enregistrer = () => {
    if (!nom.trim()) { setErreur('Donne un nom à la radio.'); return; }
    if (!elements.length) { setErreur('Ajoute au moins un lien de playlist ou de vidéo YouTube.'); return; }
    onEnregistrer({ ...radio, nom: nom.trim(), elements });
  };

  return (
    <div className="radio_editeur">
      <input
        ref={champNomRef}
        type="text"
        className="ambiance_champ"
        placeholder="Nom de la radio (ex. Focus lofi)"
        value={nom}
        maxLength={40}
        onChange={(e) => { setNom(e.target.value); setErreur(null); }}
        aria-label="Nom de la radio"
      />

      {elements.length > 0 && (
        <ol className="radio_elements">
          {elements.map((element, i) => (
            <li key={element.id} className="radio_element">
              <span className="radio_element_vignette">
                {element.type === 'video'
                  ? <img src={miniatureYoutube(element.youtubeId, 'mqdefault')} alt="" />
                  : <ListMusic size={16} />}
              </span>
              <span className="radio_element_texte">
                <span className="radio_element_type">{i + 1}. {libelleElement(element)}</span>
                <span className="radio_element_lien" title={element.lien}>{element.lien || element.youtubeId}</span>
              </span>
              <span className="radio_element_actions">
                <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} aria-label="Monter" title="Monter">
                  <ChevronUp size={14} />
                </button>
                <button type="button" onClick={() => deplacer(i, 1)} disabled={i === elements.length - 1} aria-label="Descendre" title="Descendre">
                  <ChevronDown size={14} />
                </button>
                <button type="button" onClick={() => setElements((prev) => prev.filter((e) => e.id !== element.id))} aria-label="Retirer ce lien" title="Retirer">
                  <X size={14} />
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="radio_ajout">
        <input
          type="url"
          className="ambiance_champ"
          placeholder="Lien d'une playlist ou d'une vidéo YouTube"
          value={lien}
          onChange={(e) => { setLien(e.target.value); setErreur(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouterLien(); } }}
          aria-label="Lien YouTube à ajouter"
        />
        <button type="button" className="ambiance_btn_secondaire" onClick={ajouterLien} disabled={!lien.trim()}>
          Ajouter
        </button>
      </div>

      {erreur && <p className="radio_erreur" role="alert">{erreur}</p>}

      <div className="radio_editeur_actions">
        <button type="button" className="ambiance_btn_principal" onClick={enregistrer} disabled={!modifie || !valide}>
          Enregistrer
        </button>
        <button type="button" className="ambiance_btn_secondaire" onClick={onAnnuler}>
          {estNouvelle ? 'Annuler' : 'Fermer'}
        </button>
        {!estNouvelle && (
          <button type="button" className="ambiance_btn_secondaire radio_btn_supprimer" onClick={onSupprimer}>
            <Trash2 size={13} /> Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

// --- Section « Radios » de l'onglet Ambiance : créer, nommer, modifier et supprimer
// ses radios. demandeCreation : compteur incrémenté depuis le bouton « Radio »
// du lecteur pour ouvrir directement une nouvelle radio.
function SectionRadios({ radios, radioActiveId, onEnregistrer, onSupprimer, onLancer, demandeCreation }) {
  const [idEnEdition, setIdEnEdition] = useState(null);
  const [nouvelle, setNouvelle] = useState(null);
  const [idASupprimer, setIdASupprimer] = useState(null);
  const sectionRef = useRef(null);

  const creer = () => {
    setIdEnEdition(null);
    setNouvelle({ id: genererIdRadio(), nom: '', elements: [] });
  };

  useEffect(() => {
    if (!demandeCreation) return;
    creer();
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandeCreation]);

  const radioASupprimer = radios.find((r) => r.id === idASupprimer);

  return (
    <section className="ambiance_carte" ref={sectionRef}>
      <div className="ambiance_carte_entete">
        <div className="ambiance_carte_icone ambiance_carte_icone--radio">
          <Radio size={18} />
        </div>
        <div>
          <h3 className="ambiance_carte_titre">Radios</h3>
          <p className="ambiance_carte_soustitre">Tes playlists YouTube, lues à la suite</p>
        </div>
      </div>

      {radios.length === 0 && !nouvelle && (
        <p className="radio_vide">Aucune radio pour l'instant. Crée-en une avec des liens de playlists ou de vidéos YouTube.</p>
      )}

      {nouvelle && (
        <EditeurRadio
          key={nouvelle.id}
          radio={nouvelle}
          estNouvelle
          onEnregistrer={(radio) => { onEnregistrer(radio); setNouvelle(null); }}
          onAnnuler={() => setNouvelle(null)}
        />
      )}

      {radios.length > 0 && (
        <ul className="radio_liste_gestion">
          {radios.map((radio) => (
            <li key={radio.id} className={`radio_gestion${radio.id === radioActiveId ? ' radio_gestion--active' : ''}`}>
              <div className="radio_gestion_ligne">
                <span className="radio_gestion_nom" title={radio.nom}>{radio.nom}</span>
                <span className="radio_gestion_meta">
                  {radio.elements.length} source{radio.elements.length > 1 ? 's' : ''}
                  {radio.id === radioActiveId ? ' · en cours' : ''}
                </span>
                <button type="button" className="radio_icone_btn" onClick={() => onLancer(radio)} aria-label={`Écouter ${radio.nom}`} title="Écouter">
                  <Play size={14} fill="currentColor" />
                </button>
                <button
                  type="button"
                  className="radio_icone_btn"
                  onClick={() => { setNouvelle(null); setIdEnEdition(idEnEdition === radio.id ? null : radio.id); }}
                  aria-label={`Modifier ${radio.nom}`}
                  aria-expanded={idEnEdition === radio.id}
                  title="Modifier"
                >
                  <Pencil size={14} />
                </button>
              </div>
              {idEnEdition === radio.id && (
                <EditeurRadio
                  key={radio.id}
                  radio={radio}
                  onEnregistrer={(r) => { onEnregistrer(r); setIdEnEdition(null); }}
                  onAnnuler={() => setIdEnEdition(null)}
                  onSupprimer={() => setIdASupprimer(radio.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {!nouvelle && (
        <button type="button" className="ambiance_btn_secondaire radio_btn_creer" onClick={creer}>
          <Plus size={14} /> Nouvelle radio
        </button>
      )}

      {createPortal(
        <ModalConfirmation
          ouvert={Boolean(radioASupprimer)}
          message={`Supprimer la radio « ${radioASupprimer?.nom ?? ''} » ?`}
          libelleConfirmer="Supprimer"
          onConfirmer={() => { onSupprimer(idASupprimer); setIdASupprimer(null); setIdEnEdition(null); }}
          onAnnuler={() => setIdASupprimer(null)}
        />,
        document.body
      )}
    </section>
  );
}

export default SectionRadios;
