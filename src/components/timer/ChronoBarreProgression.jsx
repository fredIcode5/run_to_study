import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { COULEURS_CHRONO_DEFAUT } from './couleursChrono';

// Éléments fixés en haut de l'écran que la barre ne doit pas recouvrir
// (sur tablette et mobile, ils occupent la même zone qu'elle)
const ELEMENTS_A_EVITER = ['.barre_joueur_musique_flottante', '.actions_bas_page .btn_mode_concentration', '.compteur_coureurs'];
const MARGE_HAUTE = 20;
const ESPACE_SOUS_ELEMENT = 10;

// Emplacements où la section Notes affiche les commandes de la session en
// cours : son titre sous le chrono, « nouvelle session » et « enregistrer la
// session » à gauche du chrono (entre lui et le panneau du joueur)
export const ID_EMPLACEMENT_TITRE_SESSION = 'chrono-emplacement-titre-session';
export const ID_EMPLACEMENT_ACTIONS_SESSION = 'chrono-emplacement-actions-session';
// Place libre à gauche du chrono nécessaire aux deux boutons carrés côte à
// côte ; en deçà, ils passent sous le titre
const PLACE_ACTIONS = 76;
const ECART_ACTIONS = 12;

// --- Chronomètre minimaliste : temps restant (MM:SS), barre de progression à
// deux couches et trois commandes.
// Couche « travail » : se remplit pendant le travail, reste pleine pendant la pause.
// Couche « pause » : superposée par-dessus pendant la pause, un peu plus fine pour
// que la couleur du travail reste visible sur les bords.
function ChronoBarreProgression({
  phase,
  tempsAffiche,
  avancementTravail,
  avancementPause,
  couleurs = COULEURS_CHRONO_DEFAUT,
  enMarche,
  peutDemarrer,
  onTogglePlay,
  onPhaseSuivante,
  onReset,
  avertissement,
  entourerAvecCoureur
}) {
  const pourcentage = (avancement) => `${(Math.min(1, Math.max(0, avancement)) * 100).toFixed(2)}%`;
  const enTravail = phase === 'travail';
  const avancementPhase = enTravail ? avancementTravail : avancementPause;
  const nomPhase = enTravail ? 'session de travail' : 'pause';

  const libelleLecture = enMarche
    ? 'Mettre en pause'
    : avancementPhase > 0 && avancementPhase < 1 ? 'Reprendre' : 'Démarrer';
  const libelleSuivante = enTravail ? 'Passer à la pause' : 'Passer à la session de travail';
  const libelleRecommencer = enTravail ? 'Recommencer la session de travail' : 'Recommencer la pause';

  // Le coureur (s'il est fourni) se place à droite de la barre
  const entourer = entourerAvecCoureur || ((contenu) => contenu);

  // Position verticale : en haut de l'écran, ou juste sous les éléments fixes
  // qu'elle chevaucherait (petits écrans)
  const racineRef = useRef(null);
  const [haut, setHaut] = useState(MARGE_HAUTE);
  // Boutons de session : 'gauche' (à gauche du chrono) ou 'dessous'
  const [disposition, setDisposition] = useState({ actions: 'dessous', hauteurWidget: 0, commandesMasquees: false, decalageTitre: 0 });
  const recalculerPosition = useCallback(() => {
    const widget = racineRef.current?.querySelector('.barre_chrono_widget');
    if (!widget) return;
    const barre = widget.getBoundingClientRect();
    let nouveauHaut = MARGE_HAUTE;
    ELEMENTS_A_EVITER.forEach((selecteur) => {
      document.querySelectorAll(selecteur).forEach((element) => {
        const r = element.getBoundingClientRect();
        const chevauche = r.width > 0 && r.left < barre.right && r.right > barre.left && r.top < MARGE_HAUTE + barre.height;
        if (chevauche) nouveauHaut = Math.max(nouveauHaut, Math.round(r.bottom + ESPACE_SOUS_ELEMENT));
      });
    });
    setHaut((actuel) => (actuel === nouveauHaut ? actuel : nouveauHaut));

    // Place libre entre le panneau du joueur (s'il est au même niveau) et le
    // chrono. Mesurée sur le cadre du chrono (son entourage), que l'animation
    // d'apparition du chrono (léger glissement et zoom) ne déforme pas.
    const cadre = (widget.parentElement === racineRef.current ? widget : widget.parentElement).getBoundingClientRect();
    let limiteGauche = ECART_ACTIONS;
    document.querySelectorAll('.barre_joueur_musique_flottante').forEach((element) => {
      const r = element.getBoundingClientRect();
      if (r.width > 0 && r.bottom > cadre.top && r.top < cadre.bottom && r.right <= cadre.left) {
        limiteGauche = Math.max(limiteGauche, r.right + ECART_ACTIONS);
      }
    });
    const place = cadre.left - ECART_ACTIONS - limiteGauche;
    const actions = place >= PLACE_ACTIONS ? 'gauche' : 'dessous';
    const hauteurWidget = widget.offsetHeight;

    // Titre et boutons masqués tant qu'ils recouvriraient le menu latéral
    // ouvert (petits écrans) ; masqués sans changer de place, d'où une mesure stable
    const menu = document.querySelector('.panel:not(.panel--collapsed)')?.getBoundingClientRect();
    const recouvreMenu = (id) => {
      const r = document.getElementById(id)?.getBoundingClientRect();
      return Boolean(menu && r && r.width > 0 && r.left < menu.right && r.right > menu.left && r.top < menu.bottom && r.bottom > menu.top);
    };
    const commandesMasquees = recouvreMenu(ID_EMPLACEMENT_TITRE_SESSION) || recouvreMenu(ID_EMPLACEMENT_ACTIONS_SESSION);

    // Petits écrans : le coureur (et la piste des autres coureurs) passe sous le
    // chrono ; le titre se place alors sous cette ligne au lieu de la recouvrir
    const coureur = racineRef.current.querySelector('.coureur')?.getBoundingClientRect();
    const decalageTitre = coureur && coureur.top >= cadre.bottom - 1 ? Math.round(coureur.bottom - cadre.bottom) : 0;

    setDisposition((actuelle) => (actuelle.actions === actions && actuelle.hauteurWidget === hauteurWidget
      && actuelle.commandesMasquees === commandesMasquees && actuelle.decalageTitre === decalageTitre
      ? actuelle
      : { actions, hauteurWidget, commandesMasquees, decalageTitre }));
  }, []);
  useLayoutEffect(recalculerPosition);
  useEffect(() => {
    window.addEventListener('resize', recalculerPosition);
    return () => window.removeEventListener('resize', recalculerPosition);
  }, [recalculerPosition]);

  return (
    <div
      ref={racineRef}
      className={`barre_chrono_flottante_haut_centre${disposition.commandesMasquees ? ' barre_chrono_flottante_haut_centre--commandes-masquees' : ''}`}
      role="region"
      aria-label={`Chronomètre — ${nomPhase}`}
      style={{
        top: `${haut}px`,
        '--chrono-couleur-travail': couleurs.travail,
        '--chrono-couleur-pause': couleurs.pause,
        '--chrono-hauteur-widget': `${disposition.hauteurWidget}px`,
        '--chrono-decalage-titre': `${disposition.decalageTitre}px`,
      }}
    >
      {entourer(
      <div className="barre_chrono_widget">
        <span className="chrono_barre_temps">{tempsAffiche}</span>

        <div
          className="chrono_barre_piste"
          role="progressbar"
          aria-label={`Progression de la ${nomPhase}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(avancementPhase * 100)}
        >
          <div className="chrono_barre_couche chrono_barre_couche--travail" style={{ width: pourcentage(avancementTravail) }} />
          <div className="chrono_barre_couche chrono_barre_couche--pause" style={{ width: pourcentage(avancementPause) }} />
        </div>

        <div className="chrono_barre_actions">
          <button
            type="button"
            className="chrono_barre_btn_action chrono_barre_btn_play"
            onClick={onTogglePlay}
            disabled={!enMarche && !peutDemarrer}
            title={libelleLecture}
            aria-label={libelleLecture}
          >
            {enMarche ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <button
            type="button"
            className="chrono_barre_btn_action"
            onClick={onPhaseSuivante}
            title={libelleSuivante}
            aria-label={libelleSuivante}
          >
            <SkipForward size={15} />
          </button>
          <button
            type="button"
            className="chrono_barre_btn_action"
            onClick={onReset}
            title={libelleRecommencer}
            aria-label={libelleRecommencer}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      )}

      {/* Commandes de la session en cours, remplies par la section Notes */}
      <div id={ID_EMPLACEMENT_TITRE_SESSION} className="chrono_emplacement_titre" />
      <div
        id={ID_EMPLACEMENT_ACTIONS_SESSION}
        className={`chrono_emplacement_actions chrono_emplacement_actions--${disposition.actions}`}
      />

      {/* Manipulation du chrono pendant la consultation d'une ancienne session */}
      {avertissement && (
        <p className="chrono_barre_avertissement" role="status">{avertissement}</p>
      )}
    </div>
  );
}

export default ChronoBarreProgression;
