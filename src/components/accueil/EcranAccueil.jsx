import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { EVENEMENT_GLISSER_ESPACE, ENCOURAGEMENTS_DEFAUT, choisirCitation, normaliserAffichageAccueil } from './encouragements';
import { FOND_ACCUEIL_DEFAUT, normaliserFondAccueil } from './fondAccueil';
import { trouverPoliceAccueil, chargerPoliceAccueil } from './policesAccueil';
import './EcranAccueil.css';

// Délai d'inactivité avant le retour de l'écran d'accueil (espace redevenu vide)
const DELAI_REAPPARITION_MS = 10000;
// Vitesse d'écriture (ms par caractère) et pause entre le message et la citation
const VITESSE_BIENVENUE_MS = 70;
const VITESSE_CITATION_MS = 40;
const VITESSE_AUTEUR_MS = 55;
const PAUSE_AVANT_CITATION_MS = 450;
const PAUSE_AVANT_AUTEUR_MS = 350;
// Le message de bienvenue s'efface 3 s après avoir été entièrement écrit
const DUREE_BIENVENUE_MS = 3000;
// Le curseur continue de clignoter un moment une fois tout écrit, puis s'efface
const DUREE_CURSEUR_FINAL_MS = 5000;
// Largeur maximale du texte, et minimum en dessous duquel on ne le resserre plus
// pour éviter le menu latéral (menu ouvert sur mobile : il passe dessous)
const LARGEUR_TEXTE_MAX = 760;
const LARGEUR_TEXTE_MIN = 280;
// Espace entre le bas de la barre du chrono et la zone du texte
const ESPACE_SOUS_CHRONO = 24;

// --- Écran d'accueil de l'espace de travail : fond gris de la navbar, message de
// bienvenue tapé au clavier (pseudo en couleur), effacé 3 s plus tard, puis
// citation et son auteur.
// Le voile gris reste en permanence sur le fond d'écran ; le texte est visible tant
// que l'espace est vide, s'efface dès qu'un glisser vers l'espace commence et
// revient avec une nouvelle citation après 10 s d'espace vide.
// enAttente : un écran de chargement recouvre l'appli ; l'accueil (et donc
// l'écriture) ne commence qu'une fois qu'il a disparu.
// fond : opacité du voile gris posé sur le fond d'écran choisi (preset, couleur ou
// image de l'application) ; indépendant des citations, il ne relance rien.
function EcranAccueil({ pseudo, espaceVide, enAttente = false, encouragements = ENCOURAGEMENTS_DEFAUT, fond = FOND_ACCUEIL_DEFAUT }) {
  const [glisserEnCours, setGlisserEnCours] = useState(false);
  const [visible, setVisible] = useState(false);
  // Une apparition = textes figés + identifiant : l'écriture ne rejoue qu'à une nouvelle apparition
  const [apparition, setApparition] = useState(null);
  const [nbBienvenue, setNbBienvenue] = useState(0);
  const [nbCitation, setNbCitation] = useState(0);
  const [nbAuteur, setNbAuteur] = useState(0);
  const [bienvenueRetiree, setBienvenueRetiree] = useState(false);
  const [curseurVisible, setCurseurVisible] = useState(true);
  // Zone du texte : centrée sur l'écran (même axe que le chrono), sous la barre du chrono
  const [position, setPosition] = useState({ haut: 0, largeurMax: LARGEUR_TEXTE_MAX });
  const derniereCitationRef = useRef(null);
  const compteurRef = useRef(0);

  const actif = encouragements.actif !== false;
  // Réglages « Affichage » d'Encouragements : décalage, taille du texte, couleur du pseudo, police
  const affichage = normaliserAffichageAccueil(encouragements.affichage);
  const police = trouverPoliceAccueil(affichage.police);
  useEffect(() => chargerPoliceAccueil(police.id), [police.id]);

  // Voile gris sur le fond d'écran de l'application (celui du preset ou choisi)
  const { voile } = normaliserFondAccueil(fond);

  // Textes figés pour une apparition : « Bienvenue » + pseudo (mis en couleur), citation, auteur
  const apparaitre = () => {
    const citation = choisirCitation(encouragements.citations, derniereCitationRef.current);
    derniereCitationRef.current = citation;
    compteurRef.current += 1;
    const debut = pseudo ? 'Bienvenue ' : 'Bienvenue';
    // Repart d'un texte vide et d'un message de bienvenue affiché dès le premier rendu
    setNbBienvenue(0);
    setNbCitation(0);
    setNbAuteur(0);
    setBienvenueRetiree(false);
    setApparition({
      id: compteurRef.current,
      debut,
      pseudo: pseudo || '',
      bienvenue: debut + (pseudo || ''),
      citation: citation.texte,
      auteur: citation.auteur ? `— ${citation.auteur}` : '',
    });
    setVisible(true);
  };
  const apparaitreRef = useRef(apparaitre);
  apparaitreRef.current = apparaitre;

  // Glisser vers l'espace signalé par les cartes de notes et les bandes de documents
  useEffect(() => {
    const suivre = (e) => setGlisserEnCours(Boolean(e.detail?.enCours));
    window.addEventListener(EVENEMENT_GLISSER_ESPACE, suivre);
    return () => window.removeEventListener(EVENEMENT_GLISSER_ESPACE, suivre);
  }, []);

  // Réactivation dans « Encouragements » : l'écran revient sans attendre
  const actifPrecedentRef = useRef(actif);
  const reactive = actif && !actifPrecedentRef.current;
  useEffect(() => { actifPrecedentRef.current = actif; }, [actif]);

  // État A / B / C : affichage, effacement, réapparition différée
  useEffect(() => {
    if (!actif || !espaceVide || glisserEnCours) {
      setVisible(false);
      return undefined;
    }
    if (visible || enAttente) return undefined;
    // Premier affichage (ou réactivation) immédiat ; sinon 10 s d'espace vide avant de revenir
    if (!apparition || reactive) {
      apparaitreRef.current();
      return undefined;
    }
    const minuterie = setTimeout(() => apparaitreRef.current(), DELAI_REAPPARITION_MS);
    return () => clearTimeout(minuterie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actif, espaceVide, glisserEnCours, visible, enAttente]);

  // Écriture progressive du message puis de la citation (une fois par apparition)
  useEffect(() => {
    if (!apparition) return undefined;
    // Écriture sur place, sans déplacement : jouée même si le système demande de
    // réduire les animations (seul le clignotement du curseur est alors coupé)
    const { bienvenue: texteB, citation: texteC, auteur: texteA } = apparition;
    setNbBienvenue(0);
    setNbCitation(0);
    setNbAuteur(0);
    setBienvenueRetiree(false);
    setCurseurVisible(true);
    const minuteries = [];
    let i = 0;
    const ecrireBienvenue = () => {
      i += 1;
      setNbBienvenue(i);
      if (i < texteB.length) {
        minuteries.push(setTimeout(ecrireBienvenue, VITESSE_BIENVENUE_MS));
      } else {
        minuteries.push(setTimeout(() => setBienvenueRetiree(true), DUREE_BIENVENUE_MS));
        minuteries.push(setTimeout(ecrireCitation, PAUSE_AVANT_CITATION_MS));
      }
    };
    const terminer = () => minuteries.push(setTimeout(() => setCurseurVisible(false), DUREE_CURSEUR_FINAL_MS));
    let j = 0;
    const ecrireCitation = () => {
      j += 1;
      setNbCitation(j);
      if (j < texteC.length) minuteries.push(setTimeout(ecrireCitation, VITESSE_CITATION_MS));
      else if (texteA) minuteries.push(setTimeout(ecrireAuteur, PAUSE_AVANT_AUTEUR_MS));
      else terminer();
    };
    let k = 0;
    const ecrireAuteur = () => {
      k += 1;
      setNbAuteur(k);
      if (k < texteA.length) minuteries.push(setTimeout(ecrireAuteur, VITESSE_AUTEUR_MS));
      else terminer();
    };
    minuteries.push(setTimeout(ecrireBienvenue, VITESSE_BIENVENUE_MS));
    return () => minuteries.forEach(clearTimeout);
  }, [apparition]);

  // Centré horizontalement sur l'écran (axe du chrono), sous la barre du chrono ;
  // la largeur du texte se resserre pour ne pas passer sous le menu latéral
  const mesurer = () => {
    const centre = window.innerWidth / 2;
    let gauchePanneau = window.innerWidth;
    const poignee = document.querySelector('.panel_poignee');
    const corps = document.querySelector('.panel_corps');
    if (poignee) gauchePanneau = Math.min(gauchePanneau, poignee.getBoundingClientRect().left);
    if (corps && getComputedStyle(corps).visibility !== 'hidden') gauchePanneau = Math.min(gauchePanneau, corps.getBoundingClientRect().left);
    const largeurLibre = 2 * (gauchePanneau - centre) - 32;
    const largeurMax = largeurLibre >= LARGEUR_TEXTE_MIN ? Math.min(LARGEUR_TEXTE_MAX, Math.round(largeurLibre)) : LARGEUR_TEXTE_MAX;
    // Toute la zone du chrono, titre de la session compris
    const chrono = document.querySelector('.barre_chrono_flottante_haut_centre');
    const haut = chrono ? Math.round(chrono.getBoundingClientRect().bottom + ESPACE_SOUS_CHRONO) : 0;
    setPosition((p) => (p.haut === haut && p.largeurMax === largeurMax ? p : { haut, largeurMax }));
  };
  const mesurerRef = useRef(mesurer);
  mesurerRef.current = mesurer;

  useLayoutEffect(() => {
    const remesurer = () => mesurerRef.current();
    remesurer();
    // Le menu s'ouvre / se replie avec une transition : on remesure à la fin
    const panneau = document.querySelector('.panel_corps');
    panneau?.addEventListener('transitionend', remesurer);
    window.addEventListener('resize', remesurer);
    // La zone du chrono grandit quand le titre de la session ou ses boutons s'y affichent
    const zoneChrono = document.querySelector('.barre_chrono_flottante_haut_centre');
    const observateur = zoneChrono ? new ResizeObserver(remesurer) : null;
    observateur?.observe(zoneChrono);
    return () => {
      panneau?.removeEventListener('transitionend', remesurer);
      window.removeEventListener('resize', remesurer);
      observateur?.disconnect();
    };
  }, []);

  // La barre du chrono peut se repositionner (petits écrans) : remesure à chaque apparition
  useLayoutEffect(() => {
    if (visible) mesurerRef.current();
  }, [visible, apparition]);

  // Avant la première apparition : le voile seul
  if (!apparition) {
    return <div className="ecran_accueil" style={{ '--ecran-accueil-voile': voile }} aria-hidden="true" />;
  }

  // Ligne qui porte le curseur : celle en cours d'écriture (puis la dernière écrite)
  const ligneCurseur = nbBienvenue < apparition.bienvenue.length
    ? 'bienvenue'
    : apparition.auteur && nbCitation >= apparition.citation.length ? 'auteur' : 'citation';
  const classeTexte = (ligne) => `ecran_accueil_texte${curseurVisible && ligneCurseur === ligne ? ' ecran_accueil_texte--curseur' : ''}`;

  // Message de bienvenue jusqu'au caractère n, le pseudo dans sa propre couleur
  const bienvenueJusqua = (n) => (
    <>
      {apparition.debut.slice(0, n)}
      {n > apparition.debut.length && (
        <span className="ecran_accueil_pseudo">{apparition.pseudo.slice(0, n - apparition.debut.length)}</span>
      )}
    </>
  );

  return (
    <div className="ecran_accueil" style={{ '--ecran-accueil-voile': voile }}>
      <div
        className={`ecran_accueil_contenu${visible ? ' ecran_accueil_contenu--visible' : ''}${police.lettresLiees ? ' ecran_accueil_contenu--lettres-liees' : ''}`}
        aria-hidden={!visible}
        style={{
          top: `${position.haut}px`,
          transform: `translate(${affichage.x}px, ${affichage.y}px)`,
          '--ecran-accueil-largeur': `${position.largeurMax}px`,
          '--ecran-accueil-echelle': affichage.taille,
          '--ecran-accueil-couleur-pseudo': affichage.couleurPseudo,
          '--ecran-accueil-police': police.famille,
        }}
      >
        {/* Texte complet réservé (invisible) sous le texte tapé : aucune secousse de mise en page */}
        <h1
          className={`ecran_accueil_bienvenue${bienvenueRetiree ? ' ecran_accueil_bienvenue--retiree' : ''}`}
          aria-label={apparition.bienvenue}
          aria-hidden={bienvenueRetiree || undefined}
        >
          <span className="ecran_accueil_ligne" aria-hidden="true">
            <span className="ecran_accueil_reserve">{bienvenueJusqua(apparition.bienvenue.length)}</span>
            <span className={classeTexte('bienvenue')}>{bienvenueJusqua(nbBienvenue)}</span>
          </span>
        </h1>
        <p className="ecran_accueil_citation" aria-label={apparition.citation}>
          <span className="ecran_accueil_ligne" aria-hidden="true">
            <span className="ecran_accueil_reserve">{apparition.citation}</span>
            <span className={classeTexte('citation')}>{apparition.citation.slice(0, nbCitation)}</span>
          </span>
        </p>
        {apparition.auteur && (
          <p className="ecran_accueil_auteur" aria-label={apparition.auteur}>
            <span className="ecran_accueil_ligne" aria-hidden="true">
              <span className="ecran_accueil_reserve">{apparition.auteur}</span>
              <span className={classeTexte('auteur')}>{apparition.auteur.slice(0, nbAuteur)}</span>
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export default EcranAccueil;
