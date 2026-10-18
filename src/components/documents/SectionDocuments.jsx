import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Image, File, Trash2, Camera, SquareArrowOutUpRight } from 'lucide-react';
import ModalConfirmation from '../ui/ModalConfirmation';
import { TYPES_ACCEPTES, PALETTE_DOCUMENTS, estPdf, estImage } from './useDocuments';
import './Documents.css';

// Distance (px) à parcourir bouton enfoncé avant que le glisser ne démarre
const SEUIL_GLISSER = 6;

const CATEGORIES = [
  { id: 'documents', label: 'Fichiers' },
  { id: 'screens', label: 'Screens' },
];

export const IconeDocument = ({ doc, size = 16 }) => {
  if (estPdf(doc)) return <FileText size={size} />;
  if (estImage(doc)) return <Image size={size} />;
  return <File size={size} />;
};

const formaterTaille = (octets) => {
  if (!octets) return '';
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
};

const libelleType = (doc) => {
  if (estPdf(doc)) return 'PDF';
  if (estImage(doc)) return (doc.type.split('/')[1] || 'image').toUpperCase();
  return 'Fichier';
};

// Capture d'une image de l'écran (onglet, fenêtre ou écran choisi par l'utilisateur)
const capturerEcran = async () => {
  const flux = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  try {
    const video = document.createElement('video');
    video.srcObject = flux;
    video.muted = true;
    await video.play();
    await new Promise((resoudre) => requestAnimationFrame(resoudre));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return await new Promise((resoudre) => canvas.toBlob(resoudre, 'image/png'));
  } finally {
    flux.getTracks().forEach((piste) => piste.stop());
  }
};

// Section « Documents » du menu latéral : liste permanente des fichiers importés.
// Glisser une bande vers l'espace de travail ouvre le document dans une fenêtre
// flottante (ou l'ajoute à la fenêtre sur laquelle on la dépose) ; un clic
// l'affiche dans la fenêtre au premier plan. La bande reste dans la liste et
// prend l'état « ouvert ». Chaque document a sa couleur de pastille, modifiable ici.
function SectionDocuments({ espaceDocuments, actif }) {
  const {
    documents,
    fenetresParDocument,
    importerFichiers,
    enregistrerCapture,
    supprimerDocument,
    ouvrirFenetre,
    ajouterAFenetre,
    selectionnerDocument,
    changerCouleurDocument,
  } = espaceDocuments;

  const [categorie, setCategorie] = useState('documents');
  const [message, setMessage] = useState('');
  const [idASupprimer, setIdASupprimer] = useState(null);
  const [fantome, setFantome] = useState(null);
  const [survolDepot, setSurvolDepot] = useState(false);
  const [idPaletteOuverte, setIdPaletteOuverte] = useState(null);

  const sectionRef = useRef(null);
  const inputFichierRef = useRef(null);
  const glisserRef = useRef(null);
  const actionsRef = useRef({ ouvrirFenetre, ajouterAFenetre, selectionnerDocument });
  const minuterieMessageRef = useRef(null);
  const ciblePrecedenteRef = useRef(null);

  useEffect(() => {
    actionsRef.current = { ouvrirFenetre, ajouterAFenetre, selectionnerDocument };
  });

  // Ferme la palette de couleurs au clic ailleurs
  useEffect(() => {
    if (!idPaletteOuverte) return undefined;
    const fermer = (e) => {
      if (!e.target.closest?.('.document_couleurs, .document_bande_pastille')) setIdPaletteOuverte(null);
    };
    document.addEventListener('pointerdown', fermer);
    return () => document.removeEventListener('pointerdown', fermer);
  }, [idPaletteOuverte]);

  const afficherMessage = (texte) => {
    setMessage(texte);
    clearTimeout(minuterieMessageRef.current);
    minuterieMessageRef.current = setTimeout(() => setMessage(''), 3500);
  };

  useEffect(() => () => clearTimeout(minuterieMessageRef.current), []);

  const documentsAffiches = documents.filter((d) => d.categorie === categorie);
  const compteParCategorie = (id) => documents.filter((d) => d.categorie === id).length;

  const importer = async (fichiers) => {
    const total = Array.from(fichiers || []).length;
    const ajoutes = await importerFichiers(fichiers, categorie);
    if (ajoutes < total) afficherMessage('Seuls les PDF et les images sont acceptés.');
  };

  const lancerCapture = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      afficherMessage('La capture d\'écran n\'est pas disponible dans ce navigateur.');
      return;
    }
    try {
      const blob = await capturerEcran();
      if (blob) {
        await enregistrerCapture(blob);
        afficherMessage('Capture enregistrée ✓');
      }
    } catch (e) {
      // Annulation par l'utilisateur dans la fenêtre de partage : rien à signaler
      if (e?.name !== 'NotAllowedError' && e?.name !== 'AbortError') {
        console.error(e);
        afficherMessage('La capture a échoué.');
      }
    }
  };

  // Ctrl+V d'une image (capture faite avec l'outil du système) : rangée dans « Screens »
  useEffect(() => {
    if (!actif) return undefined;
    const gererCollage = async (e) => {
      const cible = e.target;
      if (cible?.closest?.('input, textarea, [contenteditable="true"]')) return;
      const images = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'));
      if (images.length === 0) return;
      e.preventDefault();
      for (const image of images) await enregistrerCapture(image);
      setCategorie('screens');
      afficherMessage(images.length > 1 ? `${images.length} captures enregistrées ✓` : 'Capture enregistrée ✓');
    };
    window.addEventListener('paste', gererCollage);
    return () => window.removeEventListener('paste', gererCollage);
  }, [actif, enregistrerCapture]);

  // Vrai si le point est au-dessus du panneau latéral : y relâcher n'ouvre rien
  const estSurLePanneau = (x, y) => {
    const panneau = sectionRef.current?.closest('.panel_corps');
    if (!panneau) return false;
    const r = panneau.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  // Fenêtre de document sous le pointeur (le fantôme ne capte pas la souris)
  const fenetreSousLePointeur = (x, y) => document.elementFromPoint(x, y)?.closest?.('.fenetre_doc') || null;

  const marquerCible = (fenetre) => {
    if (ciblePrecedenteRef.current === fenetre) return;
    ciblePrecedenteRef.current?.classList.remove('fenetre_doc--cible');
    fenetre?.classList.add('fenetre_doc--cible');
    ciblePrecedenteRef.current = fenetre;
  };

  const demarrerGlisser = (e, doc) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    e.preventDefault();
    glisserRef.current = { doc, departX: e.clientX, departY: e.clientY, actif: false };
  };

  // Glisser-déposer d'une bande vers l'espace de travail
  useEffect(() => {
    const deplacer = (e) => {
      const g = glisserRef.current;
      if (!g) return;
      if (!g.actif) {
        if (Math.hypot(e.clientX - g.departX, e.clientY - g.departY) < SEUIL_GLISSER) return;
        g.actif = true;
      }
      const surPanneau = estSurLePanneau(e.clientX, e.clientY);
      const cible = surPanneau ? null : fenetreSousLePointeur(e.clientX, e.clientY);
      marquerCible(cible);
      setFantome({ doc: g.doc, x: e.clientX, y: e.clientY, surPanneau, surFenetre: Boolean(cible) });
    };

    const relacher = (e) => {
      const g = glisserRef.current;
      if (!g) return;
      glisserRef.current = null;
      // Simple clic sur la bande : affiche le document
      if (!g.actif) {
        actionsRef.current.selectionnerDocument(g.doc.id);
        return;
      }
      setFantome(null);
      marquerCible(null);
      if (estSurLePanneau(e.clientX, e.clientY)) return;
      const cible = fenetreSousLePointeur(e.clientX, e.clientY);
      if (cible?.dataset.fenetreId) {
        actionsRef.current.ajouterAFenetre(cible.dataset.fenetreId, g.doc.id);
      } else {
        actionsRef.current.ouvrirFenetre(g.doc.id, { x: e.clientX, y: e.clientY });
      }
    };

    const annuler = (e) => {
      if (e.key !== 'Escape' || !glisserRef.current) return;
      glisserRef.current = null;
      setFantome(null);
      marquerCible(null);
    };

    document.addEventListener('pointermove', deplacer);
    document.addEventListener('pointerup', relacher);
    document.addEventListener('keydown', annuler);
    return () => {
      document.removeEventListener('pointermove', deplacer);
      document.removeEventListener('pointerup', relacher);
      document.removeEventListener('keydown', annuler);
    };
  }, []);

  // Dépôt de fichiers depuis l'explorateur directement sur la section
  const gererSurvolFichiers = (e) => {
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    e.preventDefault();
    setSurvolDepot(true);
  };

  const gererDepotFichiers = (e) => {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    setSurvolDepot(false);
    importer(e.dataTransfer.files);
  };

  const documentASupprimer = documents.find((d) => d.id === idASupprimer);

  return (
    <div
      ref={sectionRef}
      className={`documents${survolDepot ? ' documents--depot' : ''}`}
      onDragOver={gererSurvolFichiers}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setSurvolDepot(false); }}
      onDrop={gererDepotFichiers}
    >
      <div className="documents_entete">
        <h2 className="documents_titre">Documents</h2>

        <div className="documents_onglets" role="tablist">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={categorie === c.id}
              className={`documents_onglet${categorie === c.id ? ' documents_onglet--actif' : ''}`}
              onClick={() => setCategorie(c.id)}
            >
              {c.label}
              <span className="documents_onglet_compte">{compteParCategorie(c.id)}</span>
            </button>
          ))}
        </div>

        {categorie === 'documents' ? (
          <button type="button" className="documents_btn_ajouter" onClick={() => inputFichierRef.current?.click()}>
            + Ajouter un document
          </button>
        ) : (
          <div className="documents_actions_screens">
            <button type="button" className="documents_btn_ajouter" onClick={lancerCapture}>
              <Camera size={14} /> Capturer l'écran
            </button>
            <button type="button" className="documents_btn_secondaire" onClick={() => inputFichierRef.current?.click()}>
              + Image
            </button>
          </div>
        )}

        <input
          ref={inputFichierRef}
          type="file"
          accept={categorie === 'screens' ? 'image/*' : TYPES_ACCEPTES}
          multiple
          hidden
          onChange={(e) => { importer(e.target.files); e.target.value = ''; }}
        />

        {message && <span className="documents_message">{message}</span>}
      </div>

      <div className="documents_liste">
        {documentsAffiches.length === 0 ? (
          <p className="documents_vide">
            {categorie === 'documents'
              ? 'Aucun document. Importe un PDF ou une image, ou dépose-le ici.'
              : 'Aucune capture. Capture l\'écran ou colle une image (Ctrl+V) pendant que cet onglet est ouvert.'}
          </p>
        ) : (
          documentsAffiches.map((doc) => {
            const nbFenetres = fenetresParDocument.get(doc.id) || 0;
            const ouvert = nbFenetres > 0;
            const paletteOuverte = idPaletteOuverte === doc.id;
            return (
              <React.Fragment key={doc.id}>
              <div
                className={`document_bande${ouvert ? ' document_bande--ouvert' : ''}${fantome?.doc.id === doc.id ? ' document_bande--glissee' : ''}`}
                style={{ '--doc-couleur': doc.couleur }}
                onPointerDown={(e) => demarrerGlisser(e, doc)}
                title="Clic : afficher · Glisser : ouvrir à l'endroit voulu, ou sur une fenêtre pour l'y ajouter"
              >
                <button
                  type="button"
                  className="document_bande_pastille"
                  onClick={() => setIdPaletteOuverte(paletteOuverte ? null : doc.id)}
                  aria-label={`Changer la couleur de ${doc.nom}`}
                  aria-expanded={paletteOuverte}
                  title="Changer la couleur"
                />
                <span className="document_bande_icone"><IconeDocument doc={doc} /></span>
                <span className="document_bande_texte">
                  <span className="document_bande_nom">{doc.nom}</span>
                  <span className="document_bande_meta">
                    {libelleType(doc)} · {formaterTaille(doc.taille)}
                    {ouvert && <span className="document_bande_etat"> · ouvert{nbFenetres > 1 ? ` ×${nbFenetres}` : ''}</span>}
                  </span>
                </span>
                <button
                  type="button"
                  className="document_bande_btn"
                  onClick={() => ouvrirFenetre(doc.id)}
                  aria-label={`Ouvrir ${doc.nom} dans une nouvelle fenêtre`}
                  title="Ouvrir dans une nouvelle fenêtre"
                >
                  <SquareArrowOutUpRight size={14} />
                </button>
                <button
                  type="button"
                  className="document_bande_btn document_bande_btn--suppr"
                  onClick={() => setIdASupprimer(doc.id)}
                  aria-label={`Supprimer ${doc.nom}`}
                  title="Supprimer le document"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {paletteOuverte && (
                <div className="document_couleurs" role="group" aria-label={`Couleur de ${doc.nom}`}>
                  {PALETTE_DOCUMENTS.map((couleur) => (
                    <button
                      key={couleur}
                      type="button"
                      className={`document_couleur${doc.couleur?.toLowerCase() === couleur.toLowerCase() ? ' document_couleur--active' : ''}`}
                      style={{ '--doc-couleur': couleur }}
                      onClick={() => { changerCouleurDocument(doc.id, couleur); setIdPaletteOuverte(null); }}
                      aria-label={`Couleur ${couleur}`}
                      title={couleur}
                    />
                  ))}
                  <label className="document_couleur document_couleur--perso" title="Couleur personnalisée">
                    <input
                      type="color"
                      value={doc.couleur || '#5865F2'}
                      onChange={(e) => changerCouleurDocument(doc.id, e.target.value)}
                      aria-label="Couleur personnalisée"
                    />
                  </label>
                </div>
              )}
              </React.Fragment>
            );
          })
        )}
      </div>

      <p className="documents_aide">Clic : afficher dans la fenêtre active · Glisser : nouvelle fenêtre, ou déposer sur une fenêtre pour l'y ajouter.</p>

      {fantome && createPortal(
        <div
          className={`document_fantome${fantome.surPanneau ? ' document_fantome--annule' : ''}`}
          style={{ left: `${fantome.x + 12}px`, top: `${fantome.y + 12}px`, '--doc-couleur': fantome.doc.couleur }}
          aria-hidden="true"
        >
          <IconeDocument doc={fantome.doc} />
          <span className="document_fantome_nom">{fantome.doc.nom}</span>
          <span className="document_fantome_aide">
            {fantome.surPanneau ? 'Relâche hors du panneau' : fantome.surFenetre ? 'Relâche pour ajouter à cette fenêtre' : 'Relâche pour ouvrir ici'}
          </span>
        </div>,
        document.body
      )}

      {createPortal(
        <ModalConfirmation
          ouvert={Boolean(documentASupprimer)}
          message={`Supprimer « ${documentASupprimer?.nom ?? ''} » ? Le fichier sera retiré de la liste et ses fenêtres fermées.`}
          libelleConfirmer="Supprimer"
          onConfirmer={() => { supprimerDocument(idASupprimer); setIdASupprimer(null); }}
          onAnnuler={() => setIdASupprimer(null)}
        />,
        document.body
      )}
    </div>
  );
}

export default SectionDocuments;
