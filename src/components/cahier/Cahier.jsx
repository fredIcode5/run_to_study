import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, AlertTriangle, Eraser } from 'lucide-react';
import ModalConfirmation from '../ui/ModalConfirmation';
import { compterMots } from './cahiers';
import './Cahier.css';

// État de l'enregistrement automatique, discret, à côté du compteur de mots
function EtatEnregistrement({ etat, onReessayer }) {
  if (etat === 'modifie' || etat === 'enregistrement') {
    return <span className="cahier_etat">Enregistrement…</span>;
  }
  if (etat === 'enregistre') {
    return <span className="cahier_etat cahier_etat--ok"><Check size={13} /> Enregistré</span>;
  }
  if (etat === 'local') {
    return (
      <span className="cahier_etat cahier_etat--local" title="Ton compte n'a pas répondu : les notes sont gardées dans ce navigateur">
        <Check size={13} /> Enregistré sur cet appareil
        <button type="button" className="cahier_lien" onClick={onReessayer}>Réessayer le compte</button>
      </span>
    );
  }
  if (etat === 'erreur') {
    return (
      <span className="cahier_etat cahier_etat--erreur">
        <AlertTriangle size={13} /> Non enregistré
        <button type="button" className="cahier_lien" onClick={onReessayer}>Réessayer</button>
      </span>
    );
  }
  return null;
}

// --- Cahier de notes d'une session : texte libre, enregistré automatiquement.
// Session en cours : modifiable directement. Ancienne session (ouverte depuis
// l'Historique) : consultation par défaut, « Modifier » enregistre les
// changements dans le cahier de cette ancienne session, jamais dans celui de la
// session en cours.
function Cahier({ contenu, etat, estSessionActive, charge, synchroIndisponible, onModifier, onReessayer, onRevenirSessionActive }) {
  const [edition, setEdition] = useState(estSessionActive);
  const [confirmerEffacement, setConfirmerEffacement] = useState(false);
  const lectureSeule = !charge || !edition;
  const mots = compterMots(contenu);

  return (
    <div className="cahier">
      {!estSessionActive && (
        <div className="cahier_bandeau" role="status">
          <span className="cahier_bandeau_texte">
            Ancienne session · {edition ? 'modification' : 'consultation'}
          </span>
          <button type="button" className="cahier_bandeau_btn" onClick={() => setEdition((e) => !e)}>
            {edition ? 'Terminer' : 'Modifier'}
          </button>
          <button type="button" className="cahier_bandeau_btn cahier_bandeau_btn--principal" onClick={onRevenirSessionActive}>
            Session en cours
          </button>
        </div>
      )}

      {synchroIndisponible && (
        <p className="cahier_alerte" role="status">
          Ton compte n'a pas répondu : tu peux écrire normalement, les notes sont gardées dans ce navigateur.
        </p>
      )}

      <textarea
        className="cahier_zone"
        value={charge ? contenu : ''}
        onChange={(e) => onModifier(e.target.value)}
        readOnly={lectureSeule}
        placeholder={!charge ? 'Chargement du cahier…' : edition ? 'Écris ici tes notes pour cette session…' : 'Ce cahier est vide.'}
        aria-label="Notes de la session"
        spellCheck
        autoFocus={estSessionActive && charge}
      />

      <div className="cahier_pied">
        <span className="cahier_compteur">{mots} mot{mots > 1 ? 's' : ''}</span>
        <span className="cahier_pied_etat" aria-live="polite">
          <EtatEnregistrement etat={etat} onReessayer={onReessayer} />
        </span>
        <button
          type="button"
          className="cahier_effacer"
          onClick={() => setConfirmerEffacement(true)}
          disabled={lectureSeule || !contenu}
          title="Effacer tout le contenu du cahier"
        >
          <Eraser size={14} /> Effacer
        </button>
      </div>

      {createPortal(
        <ModalConfirmation
          ouvert={confirmerEffacement}
          message="Effacer tout le contenu de ce cahier ?"
          libelleConfirmer="Effacer"
          onConfirmer={() => { onModifier(''); setConfirmerEffacement(false); }}
          onAnnuler={() => setConfirmerEffacement(false)}
        />,
        document.body
      )}
    </div>
  );
}

export default Cahier;
