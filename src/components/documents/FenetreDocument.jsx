import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, GripHorizontal, Search, Camera } from 'lucide-react';
import { chargerContenuDocument } from '../../lib/documentsLocaux';
import { estPdf, estImage, bornerPosition, bornerTaille } from './useDocuments';
import VisionneusePdf from './VisionneusePdf';
import { bloquerProchainMenuContextuel } from '../../utils/helpers';
import './Documents.css';

// Bornes du zoom : image (1 = ajustée au cadre), PDF (1 = page à la largeur de la fenêtre)
const BORNES_ZOOM = {
  image: { min: 1, max: 6 },
  pdf: { min: 0.5, max: 4 },
};
const ZOOM_MIN = BORNES_ZOOM.image.min;
const ZOOM_MAX = BORNES_ZOOM.image.max;

// --- Image zoomable : molette = zoom autour du curseur, glisser (clic gauche
// ou clic droit maintenu) = déplacer l'image une fois zoomée, double-clic = taille ajustée.
// Ces gestes concernent le contenu, jamais la fenêtre.
function ContenuImage({ url, nom, zoom, setZoom, captureRef }) {
  const cadreRef = useRef(null);
  const imageRef = useRef(null);
  const [decalage, setDecalage] = useState({ x: 0, y: 0 });
  const panRef = useRef(null);
  const etatRef = useRef({ zoom, decalage });
  etatRef.current = { zoom, decalage };

  // Garde l'image dans le cadre : pas de bord vide visible une fois zoomée
  const bornerDecalage = (d, z) => {
    const cadre = cadreRef.current;
    if (!cadre || z <= 1) return { x: 0, y: 0 };
    const minX = cadre.clientWidth * (1 - z);
    const minY = cadre.clientHeight * (1 - z);
    return { x: Math.min(0, Math.max(minX, d.x)), y: Math.min(0, Math.max(minY, d.y)) };
  };

  // Zoom (molette ou boutons) centré sur un point du cadre
  const zoomerVers = (nouveauZoom, px, py) => {
    const { zoom: z, decalage: d } = etatRef.current;
    const zBorne = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nouveauZoom));
    const rapport = zBorne / z;
    setDecalage(bornerDecalage({ x: px - (px - d.x) * rapport, y: py - (py - d.y) * rapport }, zBorne));
    setZoom(zBorne);
  };

  // Les boutons de la barre de titre changent le zoom : on recadre autour du centre
  const zoomPrecedentRef = useRef(zoom);
  useEffect(() => {
    const precedent = zoomPrecedentRef.current;
    zoomPrecedentRef.current = zoom;
    if (precedent === zoom || !cadreRef.current) return;
    const px = cadreRef.current.clientWidth / 2;
    const py = cadreRef.current.clientHeight / 2;
    const rapport = zoom / precedent;
    setDecalage((d) => bornerDecalage({ x: px - (px - d.x) * rapport, y: py - (py - d.y) * rapport }, zoom));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // Écouteur non passif : la molette zoome l'image au lieu de faire défiler la page
  useEffect(() => {
    const cadre = cadreRef.current;
    if (!cadre) return undefined;
    const gererMolette = (e) => {
      e.preventDefault();
      const r = cadre.getBoundingClientRect();
      const facteur = Math.exp(-e.deltaY * 0.0015);
      zoomPrecedentRef.current = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, etatRef.current.zoom * facteur));
      zoomerVers(etatRef.current.zoom * facteur, e.clientX - r.left, e.clientY - r.top);
    };
    cadre.addEventListener('wheel', gererMolette, { passive: false });
    return () => cadre.removeEventListener('wheel', gererMolette);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const demarrerPan = (e) => {
    if ((e.button !== 0 && e.button !== 2) || etatRef.current.zoom <= 1) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    panRef.current = { x: e.clientX, y: e.clientY, depart: etatRef.current.decalage, clicDroit: e.button === 2 };
  };

  const deplacerPan = (e) => {
    const p = panRef.current;
    if (!p) return;
    setDecalage(bornerDecalage({ x: p.depart.x + e.clientX - p.x, y: p.depart.y + e.clientY - p.y }, etatRef.current.zoom));
  };

  const terminerPan = () => {
    if (panRef.current?.clicDroit) bloquerProchainMenuContextuel();
    panRef.current = null;
  };

  const reinitialiser = () => {
    zoomPrecedentRef.current = 1;
    setZoom(1);
    setDecalage({ x: 0, y: 0 });
  };

  // Capture de la zone visible : l'image telle qu'affichée (zoom et décalage compris)
  captureRef.current = async () => {
    const cadre = cadreRef.current;
    const img = imageRef.current;
    if (!cadre || !img?.naturalWidth) return null;
    const ratio = window.devicePixelRatio || 1;
    const rc = cadre.getBoundingClientRect();
    const boite = img.getBoundingClientRect(); // boîte transformée (zoom inclus)
    // object-fit: contain : l'image occupe une partie centrée de sa boîte
    const s = Math.min(boite.width / img.naturalWidth, boite.height / img.naturalHeight);
    const l = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    const canevas = document.createElement('canvas');
    canevas.width = Math.round(rc.width * ratio);
    canevas.height = Math.round(rc.height * ratio);
    const ctx = canevas.getContext('2d');
    ctx.fillStyle = '#111214';
    ctx.fillRect(0, 0, canevas.width, canevas.height);
    ctx.drawImage(
      img,
      (boite.left + (boite.width - l) / 2 - rc.left) * ratio,
      (boite.top + (boite.height - h) / 2 - rc.top) * ratio,
      l * ratio,
      h * ratio
    );
    return { blob: await new Promise((resoudre) => canevas.toBlob(resoudre, 'image/png')) };
  };

  return (
    <div
      ref={cadreRef}
      className={`fenetre_doc_image${zoom > 1 ? ' fenetre_doc_image--zoom' : ''}`}
      onPointerDown={demarrerPan}
      onPointerMove={deplacerPan}
      onPointerUp={terminerPan}
      onPointerCancel={terminerPan}
      onDoubleClick={reinitialiser}
      onContextMenu={(e) => e.preventDefault()}
    >
      <img
        ref={imageRef}
        src={url}
        alt={nom}
        draggable={false}
        style={{ transform: `translate(${decalage.x}px, ${decalage.y}px) scale(${zoom})` }}
      />
    </div>
  );
}

// --- Contenu d'un document dans une fenêtre. Chaque document de la fenêtre
// garde sa couche montée (page, zoom, recherche conservés) ; seule la couche
// du document actif est visible.
function ContenuDocument({ doc, actif, zoom, setZoom, bornes, rechercheOuverte, onFermerRecherche, captureRef }) {
  const [url, setUrl] = useState(null);
  const [erreur, setErreur] = useState(false);

  // Contenu chargé depuis le stockage local, exposé via une URL temporaire
  useEffect(() => {
    let annule = false;
    let urlCreee = null;
    chargerContenuDocument(doc.id).then((blob) => {
      if (annule) return;
      if (!blob) { setErreur(true); return; }
      urlCreee = URL.createObjectURL(blob);
      setUrl(urlCreee);
    }).catch(() => !annule && setErreur(true));
    return () => {
      annule = true;
      if (urlCreee) URL.revokeObjectURL(urlCreee);
    };
  }, [doc.id]);

  return (
    <div className={`fenetre_doc_couche${actif ? ' fenetre_doc_couche--active' : ''}`} inert={!actif}>
      {erreur ? (
        <p className="fenetre_doc_erreur">Impossible de charger ce document.</p>
      ) : !url ? (
        <p className="fenetre_doc_erreur">Chargement…</p>
      ) : estPdf(doc) ? (
        <VisionneusePdf
          url={url}
          zoom={zoom}
          setZoom={setZoom}
          zoomMin={bornes.min}
          zoomMax={bornes.max}
          rechercheOuverte={rechercheOuverte}
          onFermerRecherche={onFermerRecherche}
          captureRef={captureRef}
        />
      ) : estImage(doc) ? (
        <ContenuImage url={url} nom={doc.nom} zoom={zoom} setZoom={setZoom} captureRef={captureRef} />
      ) : (
        <p className="fenetre_doc_erreur">Aperçu indisponible pour ce type de fichier.</p>
      )}
    </div>
  );
}

const VUE_PAR_DEFAUT = { zoom: 1, recherche: false };

// --- Fenêtre flottante de l'espace de travail, pouvant réunir plusieurs
// documents : une pastille colorée par document dans la barre de titre, le
// titre affiché prend la couleur de la pastille active.
// La barre de titre déplace la fenêtre entière, la poignée du coin la
// redimensionne ; la navigation dans le contenu reste indépendante.
function FenetreDocument({
  fenetre,
  docs,
  zIndex,
  auPremierPlan,
  onMettreAJour,
  onFermer,
  onPremierPlan,
  onCapturer,
  onActiver,
  onRetirer,
}) {
  // État de lecture propre à chaque document de la fenêtre
  const [vues, setVues] = useState({});
  const settersZoomRef = useRef(new Map());
  const capturesRef = useRef(new Map());

  const docActif = docs.find((d) => d.id === fenetre.actifId) || docs[0];
  const vueActive = vues[docActif.id] || VUE_PAR_DEFAUT;
  const zoom = vueActive.zoom;
  const rechercheOuverte = vueActive.recherche;

  const modifierVue = (id, modifications) => {
    setVues((prev) => ({ ...prev, [id]: { ...VUE_PAR_DEFAUT, ...prev[id], ...modifications } }));
  };

  // Setter de zoom stable par document (accepte une valeur ou une fonction)
  const setZoomPour = (id) => {
    if (!settersZoomRef.current.has(id)) {
      settersZoomRef.current.set(id, (valeur) => setVues((prev) => {
        const actuel = prev[id] || VUE_PAR_DEFAUT;
        const z = typeof valeur === 'function' ? valeur(actuel.zoom) : valeur;
        return { ...prev, [id]: { ...actuel, zoom: z } };
      }));
    }
    return settersZoomRef.current.get(id);
  };

  const captureRefPour = (id) => {
    if (!capturesRef.current.has(id)) capturesRef.current.set(id, { current: null });
    return capturesRef.current.get(id);
  };

  const setZoom = setZoomPour(docActif.id);

  // Capture « screen » de la zone visible, rangée dans l'onglet Screens
  const [etatCapture, setEtatCapture] = useState(null); // null | 'flash' | 'ok' | 'erreur'
  const minuterieCaptureRef = useRef(null);

  // Géométrie locale pendant un geste (évite de re-rendre toute l'app à chaque pixel)
  const [geo, setGeo] = useState({ x: fenetre.x, y: fenetre.y, largeur: fenetre.largeur, hauteur: fenetre.hauteur });
  const [interaction, setInteraction] = useState(null);
  const gesteRef = useRef(null);
  const geoRef = useRef(geo);
  geoRef.current = geo;

  useEffect(() => {
    if (!interaction) setGeo({ x: fenetre.x, y: fenetre.y, largeur: fenetre.largeur, hauteur: fenetre.hauteur });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fenetre.x, fenetre.y, fenetre.largeur, fenetre.hauteur]);

  // Pendant un geste : pas de sélection de texte ni de curseur parasite sur la page
  useEffect(() => {
    if (!interaction) return undefined;
    document.body.classList.add(`fenetre_doc_geste--${interaction}`);
    return () => document.body.classList.remove(`fenetre_doc_geste--${interaction}`);
  }, [interaction]);

  const demarrerGeste = (type) => (e) => {
    if (e.button !== 0) return;
    if (type === 'deplacement' && e.target.closest('button')) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    gesteRef.current = { type, x: e.clientX, y: e.clientY, depart: geo };
    setInteraction(type);
  };

  const poursuivreGeste = (e) => {
    const g = gesteRef.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.type === 'deplacement') {
      setGeo({ ...g.depart, ...bornerPosition({ x: g.depart.x + dx, y: g.depart.y + dy }, g.depart.largeur) });
    } else {
      setGeo({ ...g.depart, ...bornerTaille({ largeur: g.depart.largeur + dx, hauteur: g.depart.hauteur + dy }, g.depart) });
    }
  };

  const terminerGeste = () => {
    if (!gesteRef.current) return;
    gesteRef.current = null;
    setInteraction(null);
    onMettreAJour(geoRef.current);
  };

  const evenementsGeste = (type) => ({
    onPointerDown: demarrerGeste(type),
    onPointerMove: poursuivreGeste,
    onPointerUp: terminerGeste,
    onPointerCancel: terminerGeste,
  });

  const image = estImage(docActif);
  const pdf = estPdf(docActif);
  const bornes = pdf ? BORNES_ZOOM.pdf : BORNES_ZOOM.image;

  useEffect(() => () => clearTimeout(minuterieCaptureRef.current), []);

  const capturer = async () => {
    const capture = captureRefPour(docActif.id).current;
    if (!capture) return;
    clearTimeout(minuterieCaptureRef.current);
    try {
      const resultat = await capture();
      if (!resultat?.blob) throw new Error('capture vide');
      const nomSansExtension = docActif.nom.replace(/\.[^.]+$/, '');
      await onCapturer(resultat.blob, resultat.page ? `${nomSansExtension} p.${resultat.page}` : nomSansExtension);
      setEtatCapture('flash');
      minuterieCaptureRef.current = setTimeout(() => {
        setEtatCapture('ok');
        minuterieCaptureRef.current = setTimeout(() => setEtatCapture(null), 1800);
      }, 220);
    } catch (e) {
      console.error(e);
      setEtatCapture('erreur');
      minuterieCaptureRef.current = setTimeout(() => setEtatCapture(null), 2200);
    }
  };

  return (
    <div
      className={`fenetre_doc${auPremierPlan ? ' fenetre_doc--premier-plan' : ''}${interaction ? ` fenetre_doc--${interaction}` : ''}`}
      style={{ left: `${geo.x}px`, top: `${geo.y}px`, width: `${geo.largeur}px`, height: `${geo.hauteur}px`, zIndex, '--doc-couleur': docActif.couleur }}
      onPointerDownCapture={() => { if (!auPremierPlan) onPremierPlan(); }}
      data-fenetre-id={fenetre.id}
      role="dialog"
      aria-label={docActif.nom}
    >
      <div className="fenetre_doc_barre" {...evenementsGeste('deplacement')} title="Glisser pour déplacer la fenêtre">
        <GripHorizontal size={14} className="fenetre_doc_grip" />

        {/* Pastilles : une par document ; l'active affiche le titre dans sa couleur */}
        <div className="fenetre_doc_pastilles" role="tablist" aria-label="Documents de la fenêtre">
          {docs.map((d) => {
            const actif = d.id === docActif.id;
            return (
              <div
                key={d.id}
                className={`fenetre_doc_pastille${actif ? ' fenetre_doc_pastille--active' : ''}`}
                style={{ '--doc-couleur': d.couleur }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={actif}
                  className="fenetre_doc_pastille_btn"
                  onClick={() => onActiver(d.id)}
                  onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onRetirer(d.id); } }}
                  title={actif ? d.nom : `Afficher « ${d.nom} »`}
                  aria-label={d.nom}
                >
                  <span className="fenetre_doc_pastille_point" aria-hidden="true" />
                  {actif && <span className="fenetre_doc_nom">{d.nom}</span>}
                </button>
                {actif && docs.length > 1 && (
                  <button
                    type="button"
                    className="fenetre_doc_pastille_retirer"
                    onClick={() => onRetirer(d.id)}
                    aria-label={`Retirer « ${d.nom} » de la fenêtre`}
                    title="Retirer de la fenêtre (le document reste dans la liste)"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {(image || pdf) && (
          <div className="fenetre_doc_zoom">
            <button type="button" className="fenetre_doc_capture" onClick={capturer} aria-label="Capturer la zone visible" title="Screen : capturer la zone visible (rangée dans Screens)">
              <Camera size={14} />
            </button>
            <button type="button" onClick={() => setZoom((z) => Math.max(bornes.min, +(z / 1.25).toFixed(2)))} disabled={zoom <= bornes.min} aria-label="Dézoomer" title="Dézoomer">
              <ZoomOut size={14} />
            </button>
            <span className="fenetre_doc_zoom_valeur">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(bornes.max, +(z * 1.25).toFixed(2)))} disabled={zoom >= bornes.max} aria-label="Zoomer" title="Zoomer">
              <ZoomIn size={14} />
            </button>
            {zoom !== 1 && (
              <button type="button" onClick={() => setZoom(1)} aria-label="Taille ajustée" title={pdf ? 'Ajuster à la largeur' : 'Taille ajustée'}>
                <RotateCcw size={13} />
              </button>
            )}
          </div>
        )}

        {pdf && (
          <button
            type="button"
            className={`fenetre_doc_loupe${rechercheOuverte ? ' fenetre_doc_loupe--actif' : ''}`}
            onClick={() => modifierVue(docActif.id, { recherche: !rechercheOuverte })}
            aria-label="Rechercher dans le document"
            aria-pressed={rechercheOuverte}
            title="Rechercher dans le document"
          >
            <Search size={14} />
          </button>
        )}

        <button type="button" className="fenetre_doc_fermer" onClick={onFermer} aria-label="Fermer la fenêtre" title="Fermer la fenêtre (les documents restent dans la liste)">
          <X size={15} />
        </button>
      </div>

      <div className="fenetre_doc_contenu">
        {docs.map((d) => {
          const vue = vues[d.id] || VUE_PAR_DEFAUT;
          return (
            <ContenuDocument
              key={d.id}
              doc={d}
              actif={d.id === docActif.id}
              zoom={vue.zoom}
              setZoom={setZoomPour(d.id)}
              bornes={estPdf(d) ? BORNES_ZOOM.pdf : BORNES_ZOOM.image}
              rechercheOuverte={vue.recherche}
              onFermerRecherche={() => modifierVue(d.id, { recherche: false })}
              captureRef={captureRefPour(d.id)}
            />
          );
        })}

        {/* Bouclier : pendant un geste, ou tant que la fenêtre n'est pas au premier
            plan, le contenu ne capte pas la souris (le 1er clic ramène la fenêtre devant) */}
        {(interaction || !auPremierPlan) && <div className="fenetre_doc_bouclier" />}

        {etatCapture === 'flash' && <div className="fenetre_doc_capture_flash" aria-hidden="true" />}
        {(etatCapture === 'ok' || etatCapture === 'erreur') && (
          <span className={`fenetre_doc_capture_message${etatCapture === 'erreur' ? ' fenetre_doc_capture_message--erreur' : ''}`} role="status">
            {etatCapture === 'ok' ? 'Capture enregistrée dans Screens ✓' : 'La capture a échoué'}
          </span>
        )}
      </div>

      <div className="fenetre_doc_redim" {...evenementsGeste('redimension')} aria-hidden="true" title="Redimensionner" />
    </div>
  );
}

export default FenetreDocument;
