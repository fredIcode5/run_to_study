import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import urlTravailleurPdf from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { bloquerProchainMenuContextuel } from '../../utils/helpers';

pdfjs.GlobalWorkerOptions.workerSrc = urlTravailleurPdf;

const MARGE_PAGES = 12;

// Repli « insensible à la casse et aux accents » qui conserve la longueur du
// texte, pour que les positions trouvées correspondent aux caractères d'origine
const plier = (texte) => {
  let resultat = '';
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte[i];
    resultat += ((c.normalize('NFD')[0] || c).toLowerCase()[0]) || c;
  }
  return resultat;
};

// --- Une page : canevas dessiné seulement quand la page approche de la zone
// visible, plus les rectangles de surlignage de la recherche
function PagePdf({ pdf, numero, taille, echelle, surlignages, racineRef, pageRef }) {
  const canevasRef = useRef(null);
  const [visible, setVisible] = useState(false);
  // Le dessin suit l'échelle avec un léger retard : pendant un redimensionnement,
  // le canevas existant est simplement étiré au lieu d'être redessiné à chaque pixel
  const [echelleDessin, setEchelleDessin] = useState(echelle);

  useEffect(() => {
    const minuterie = setTimeout(() => setEchelleDessin(echelle), 120);
    return () => clearTimeout(minuterie);
  }, [echelle]);

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return undefined;
    const observateur = new IntersectionObserver(
      ([entree]) => setVisible(entree.isIntersecting),
      { root: racineRef.current, rootMargin: '600px 0px' }
    );
    observateur.observe(el);
    return () => observateur.disconnect();
  }, [pageRef, racineRef]);

  useEffect(() => {
    if (!visible) return undefined;
    let tache = null;
    let annule = false;
    pdf.getPage(numero).then((page) => {
      if (annule) return;
      const ratio = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: echelleDessin * ratio });
      const canevas = canevasRef.current;
      canevas.width = Math.floor(viewport.width);
      canevas.height = Math.floor(viewport.height);
      tache = page.render({ canvasContext: canevas.getContext('2d'), viewport });
      tache.promise.catch(() => {});
    });
    return () => {
      annule = true;
      tache?.cancel();
    };
  }, [pdf, numero, visible, echelleDessin]);

  return (
    <div
      ref={pageRef}
      className="visionneuse_pdf_page"
      style={{ width: `${taille.largeur * echelle}px`, height: `${taille.hauteur * echelle}px` }}
    >
      <canvas ref={canevasRef} />
      {surlignages.map((r, i) => (
        <span
          key={i}
          className={`visionneuse_pdf_surlignage${r.actif ? ' visionneuse_pdf_surlignage--actif' : ''}`}
          style={{ left: `${r.x * echelle}px`, top: `${r.y * echelle}px`, width: `${r.l * echelle}px`, height: `${r.h * echelle}px` }}
        />
      ))}
    </div>
  );
}

// --- Visionneuse PDF de la fenêtre flottante, sans bouton de téléchargement.
// zoom = multiplicateur de la largeur ajustée (1 = page à la largeur de la fenêtre).
// Clic droit maintenu = se déplacer dans le document ; Ctrl + molette = zoom.
function VisionneusePdf({ url, zoom, setZoom, zoomMin, zoomMax, rechercheOuverte, onFermerRecherche, captureRef }) {
  const conteneurRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [pages, setPages] = useState([]); // { largeur, hauteur, viewport } à l'échelle 1
  const [erreur, setErreur] = useState(false);
  const [largeurDispo, setLargeurDispo] = useState(0);
  const [pageCourante, setPageCourante] = useState(1);
  const pagesRefs = useMemo(() => pages.map(() => React.createRef()), [pages]);

  // --- Chargement du document
  useEffect(() => {
    const chargement = pdfjs.getDocument(url);
    let annule = false;
    chargement.promise.then(async (doc) => {
      const tailles = [];
      for (let i = 1; i <= doc.numPages; i += 1) {
        const viewport = (await doc.getPage(i)).getViewport({ scale: 1 });
        tailles.push({ largeur: viewport.width, hauteur: viewport.height, viewport });
      }
      if (annule) return;
      setPdf(doc);
      setPages(tailles);
    }).catch(() => !annule && setErreur(true));
    return () => {
      annule = true;
      chargement.destroy();
    };
  }, [url]);

  // --- Largeur disponible (suit le redimensionnement de la fenêtre)
  useEffect(() => {
    const el = conteneurRef.current;
    if (!el) return undefined;
    const observateur = new ResizeObserver(() => setLargeurDispo(el.clientWidth));
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);

  const largeurPageMax = pages.reduce((m, p) => Math.max(m, p.largeur), 0);
  const echelle = largeurPageMax && largeurDispo
    ? Math.max(0.1, ((largeurDispo - 2 * MARGE_PAGES) / largeurPageMax) * zoom)
    : 1;

  // --- Conserve le point central de lecture quand l'échelle change
  const centreRef = useRef({ x: 0.5, y: 0 });
  const memoriserCentre = () => {
    const el = conteneurRef.current;
    if (!el || !el.scrollHeight) return;
    centreRef.current = {
      x: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
      y: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
    };
  };
  useLayoutEffect(() => {
    const el = conteneurRef.current;
    if (!el || !pages.length) return;
    el.scrollLeft = centreRef.current.x * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = centreRef.current.y * el.scrollHeight - el.clientHeight / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [echelle]);

  // --- Page courante : celle qui occupe le haut de la zone visible
  const suivrePage = () => {
    const el = conteneurRef.current;
    if (!el) return;
    const repere = el.scrollTop + el.clientHeight / 3;
    let numero = 1;
    pagesRefs.forEach((ref, i) => {
      if (ref.current && ref.current.offsetTop <= repere) numero = i + 1;
    });
    setPageCourante(numero);
  };

  const gererDefilement = () => {
    memoriserCentre();
    suivrePage();
  };

  const allerALaPage = (numero) => {
    const cible = pagesRefs[numero - 1]?.current;
    if (cible) conteneurRef.current.scrollTo({ top: cible.offsetTop - MARGE_PAGES, behavior: 'smooth' });
  };

  // --- Capture de la zone visible : assemble les parties visibles des pages
  // déjà dessinées (sans les surlignages de recherche)
  captureRef.current = async () => {
    const el = conteneurRef.current;
    if (!el) return null;
    const ratio = window.devicePixelRatio || 1;
    const rc = el.getBoundingClientRect();
    const largeur = el.clientWidth;
    const hauteur = el.clientHeight;
    const canevas = document.createElement('canvas');
    canevas.width = Math.round(largeur * ratio);
    canevas.height = Math.round(hauteur * ratio);
    const ctx = canevas.getContext('2d');
    ctx.fillStyle = '#111214';
    ctx.fillRect(0, 0, canevas.width, canevas.height);
    el.querySelectorAll('.visionneuse_pdf_page canvas').forEach((source) => {
      const r = source.getBoundingClientRect();
      const gauche = Math.max(r.left, rc.left);
      const haut = Math.max(r.top, rc.top);
      const droite = Math.min(r.right, rc.left + largeur);
      const bas = Math.min(r.bottom, rc.top + hauteur);
      if (droite <= gauche || bas <= haut || !source.width) return;
      const kx = source.width / r.width;
      const ky = source.height / r.height;
      ctx.drawImage(
        source,
        (gauche - r.left) * kx, (haut - r.top) * ky, (droite - gauche) * kx, (bas - haut) * ky,
        (gauche - rc.left) * ratio, (haut - rc.top) * ratio, (droite - gauche) * ratio, (bas - haut) * ratio
      );
    });
    return { blob: await new Promise((resoudre) => canevas.toBlob(resoudre, 'image/png')), page: pageCourante };
  };

  // --- Ctrl + molette : zoom (écouteur non passif pour bloquer le zoom de la page)
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const el = conteneurRef.current;
    if (!el) return undefined;
    const gererMolette = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const z = zoomRef.current * Math.exp(-e.deltaY * 0.002);
      setZoom(Math.min(zoomMax, Math.max(zoomMin, +z.toFixed(2))));
    };
    el.addEventListener('wheel', gererMolette, { passive: false });
    return () => el.removeEventListener('wheel', gererMolette);
  }, [setZoom, zoomMin, zoomMax]);

  // --- Clic droit maintenu : se déplacer dans le document (dans les deux axes)
  const panRef = useRef(null);
  const [enDeplacement, setEnDeplacement] = useState(false);

  const demarrerPan = (e) => {
    if (e.button !== 2) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const el = conteneurRef.current;
    panRef.current = { x: e.clientX, y: e.clientY, gauche: el.scrollLeft, haut: el.scrollTop };
    setEnDeplacement(true);
  };

  const deplacerPan = (e) => {
    const p = panRef.current;
    if (!p) return;
    const el = conteneurRef.current;
    el.scrollLeft = p.gauche - (e.clientX - p.x);
    el.scrollTop = p.haut - (e.clientY - p.y);
  };

  const terminerPan = () => {
    if (!panRef.current) return;
    panRef.current = null;
    setEnDeplacement(false);
    bloquerProchainMenuContextuel();
  };

  // --- Recherche dans le texte du document
  const [requete, setRequete] = useState('');
  const [textes, setTextes] = useState(null); // par page : { plie, morceaux: [{ debut, item }] }
  const [indexActif, setIndexActif] = useState(0);
  const champRechercheRef = useRef(null);

  useEffect(() => {
    if (rechercheOuverte) champRechercheRef.current?.focus();
    else { setRequete(''); setIndexActif(0); }
  }, [rechercheOuverte]);

  // Extraction du texte une seule fois, à la première ouverture de la recherche
  useEffect(() => {
    if (!rechercheOuverte || !pdf || textes) return;
    let annule = false;
    (async () => {
      const resultat = [];
      for (let i = 1; i <= pdf.numPages; i += 1) {
        const contenu = await (await pdf.getPage(i)).getTextContent();
        let texte = '';
        const morceaux = [];
        contenu.items.forEach((item) => {
          if (!item.str) return;
          morceaux.push({ debut: texte.length, item });
          texte += item.str;
          if (item.hasEOL) texte += ' ';
        });
        resultat.push({ plie: plier(texte), morceaux });
      }
      if (!annule) setTextes(resultat);
    })();
    return () => { annule = true; };
  }, [rechercheOuverte, pdf, textes]);

  // Occurrences : { page, rects } avec rects en pixels à l'échelle 1
  const resultats = useMemo(() => {
    const cible = plier(requete.trim());
    if (!cible || !textes) return [];
    const trouves = [];
    textes.forEach(({ plie, morceaux }, indexPage) => {
      const viewport = pages[indexPage]?.viewport;
      if (!viewport) return;
      let position = plie.indexOf(cible);
      while (position !== -1) {
        const fin = position + cible.length;
        const rects = [];
        morceaux.forEach(({ debut, item }) => {
          const finItem = debut + item.str.length;
          if (finItem <= position || debut >= fin) return;
          const a = Math.max(position, debut) - debut;
          const b = Math.min(fin, finItem) - debut;
          const [, , , , tx, ty] = item.transform;
          const hauteur = item.height || Math.hypot(item.transform[2], item.transform[3]);
          const x0 = tx + (item.width * a) / item.str.length;
          const x1 = tx + (item.width * b) / item.str.length;
          const [vx0, vy0, vx1, vy1] = viewport.convertToViewportRectangle([x0, ty - hauteur * 0.2, x1, ty + hauteur * 0.85]);
          rects.push({ x: Math.min(vx0, vx1), y: Math.min(vy0, vy1), l: Math.abs(vx1 - vx0), h: Math.abs(vy1 - vy0) });
        });
        trouves.push({ page: indexPage, rects });
        position = plie.indexOf(cible, position + 1);
      }
    });
    return trouves;
  }, [requete, textes, pages]);

  useEffect(() => { setIndexActif(0); }, [requete]);

  // Fait défiler jusqu'au résultat actif
  useEffect(() => {
    const resultat = resultats[indexActif];
    const el = conteneurRef.current;
    const pageEl = pagesRefs[resultat?.page]?.current;
    if (!resultat || !el || !pageEl || !resultat.rects[0]) return;
    const r = resultat.rects[0];
    el.scrollTo({
      top: pageEl.offsetTop + r.y * echelle - el.clientHeight / 3,
      left: Math.max(0, pageEl.offsetLeft + r.x * echelle - el.clientWidth / 2),
      behavior: 'smooth',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexActif, resultats]);

  const surlignagesParPage = useMemo(() => {
    const parPage = pages.map(() => []);
    resultats.forEach((resultat, i) => {
      resultat.rects.forEach((r) => parPage[resultat.page]?.push({ ...r, actif: i === indexActif }));
    });
    return parPage;
  }, [resultats, indexActif, pages]);

  const resultatSuivant = (sens) => {
    if (!resultats.length) return;
    setIndexActif((i) => (i + sens + resultats.length) % resultats.length);
  };

  const gererToucheRecherche = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); resultatSuivant(e.shiftKey ? -1 : 1); }
    if (e.key === 'Escape') { e.preventDefault(); onFermerRecherche(); }
  };

  const compteur = !requete.trim()
    ? ''
    : !textes ? 'Recherche…'
      : resultats.length ? `${indexActif + 1} / ${resultats.length}` : 'Aucun résultat';

  if (erreur) return <p className="fenetre_doc_erreur">Impossible de lire ce PDF.</p>;

  return (
    <div className="visionneuse_pdf">
      {rechercheOuverte && (
        <div className="visionneuse_pdf_recherche" onPointerDown={(e) => e.stopPropagation()}>
          <input
            ref={champRechercheRef}
            type="text"
            className="visionneuse_pdf_recherche_champ"
            placeholder="Rechercher dans le document"
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            onKeyDown={gererToucheRecherche}
            aria-label="Rechercher dans le document"
          />
          <span className="visionneuse_pdf_recherche_compteur" aria-live="polite">{compteur}</span>
          <button type="button" onClick={() => resultatSuivant(-1)} disabled={!resultats.length} aria-label="Résultat précédent" title="Précédent (Maj+Entrée)">
            <ChevronUp size={15} />
          </button>
          <button type="button" onClick={() => resultatSuivant(1)} disabled={!resultats.length} aria-label="Résultat suivant" title="Suivant (Entrée)">
            <ChevronDown size={15} />
          </button>
          <button type="button" onClick={onFermerRecherche} aria-label="Fermer la recherche" title="Fermer (Échap)">
            <X size={15} />
          </button>
        </div>
      )}

      <div
        ref={conteneurRef}
        className={`visionneuse_pdf_defilement${enDeplacement ? ' visionneuse_pdf_defilement--deplacement' : ''}`}
        onScroll={gererDefilement}
        onPointerDown={demarrerPan}
        onPointerMove={deplacerPan}
        onPointerUp={terminerPan}
        onPointerCancel={terminerPan}
        onContextMenu={(e) => e.preventDefault()}
      >
        {!pdf ? (
          <p className="fenetre_doc_erreur">Chargement…</p>
        ) : (
          pages.map((taille, i) => (
            <PagePdf
              key={i}
              pdf={pdf}
              numero={i + 1}
              taille={taille}
              echelle={echelle}
              surlignages={surlignagesParPage[i] || []}
              racineRef={conteneurRef}
              pageRef={pagesRefs[i]}
            />
          ))
        )}
      </div>

      {pages.length > 0 && (
        <div className="visionneuse_pdf_pages" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => allerALaPage(Math.max(1, pageCourante - 1))} disabled={pageCourante <= 1} aria-label="Page précédente">
            <ChevronLeft size={14} />
          </button>
          <span>{pageCourante} / {pages.length}</span>
          <button type="button" onClick={() => allerALaPage(Math.min(pages.length, pageCourante + 1))} disabled={pageCourante >= pages.length} aria-label="Page suivante">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default VisionneusePdf;
