import React from 'react';
import { Clock9 } from 'lucide-react';
import InfiniteLoopAnimation from '../../infinitloop.jsx';
import PiedDePage from '../layout/PiedDePage';

// --- Page d'accueil : vitrine avant d'entrer dans l'appli.
// Le fond (accueil_fond) sert de placeholder pour l'image vitrine à venir
// et occupe le premier écran ; la suite (présentation, fonctionnalités,
// footer) forme une seconde partie accessible par un défilement naturel
// à la molette (voir accueil_suite plus bas).
function Accueil({ onCommencer }) {
  const FONCTIONNALITES_ACCUEIL = [
    {
      id: 'personnalisation',
      titre: 'Personnalisez votre Pomodoro',
      texte: 'Ajustez la durée du minuteur, choisissez parmi plusieurs thèmes visuels, personnalisez les sons de notification et adaptez l\'expérience à votre façon de travailler.',
    },
    {
      id: 'motivation',
      titre: 'Motivez-vous seul ou à plusieurs',
      texte: 'Suivez votre progression en solo ou rejoignez vos amis pour vous encourager mutuellement, comparer vos sessions et rester motivé sur la durée.',
    },
    {
      id: 'medaillons',
      titre: 'Collectez des médaillons uniques à échanger et collectionner',
      texte: 'Débloquez des médaillons en accomplissant vos sessions, complétez votre collection et échangez-les avec d\'autres utilisateurs pour enrichir votre profil.',
    },
    {
      id: 'planification',
      titre: 'Organiser et planifier votre travail',
      texte: 'Profitez d\'un système de notes intelligentes permettant d\'organiser vos tâches, de les programmer pour maintenant ou pour plus tard, et bénéficiez d\'un système de rappel efficace via des notifications.',
    },
    {
      id: 'statistiques',
      titre: 'Trackez vos statistiques avec des outils adaptés',
      texte: 'Visualisez votre temps de concentration, vos séries de Pomodoro et votre progression grâce à des graphiques clairs et des outils de suivi pensés pour vous.',
    },
  ];

  const POINTS_HOME = [
    { id: "p1", color: "#22c55e", phase: 0.0 },
    { id: "p2", color: "#3b82f6", phase: 0.2 },
    { id: "p3", color: "#eab308", phase: 0.4 },
    { id: "p4", color: "#ec4899", phase: 0.6 },
    { id: "p6", color: "#a855f7", phase: 0.8 },
  ];

  const handleScrollLent = () => {
    const target = document.getElementById('presentation');
    if (!target) return;
    
    const targetPosition = target.getBoundingClientRect().top + window.scrollY;
    const startPosition = window.scrollY;
    const distance = targetPosition - startPosition;
    let startTime = null;
    
    // Durée du défilement : 2 secondes pour que ce soit lent
    const duration = 2000; 

    // Fonction d'easing (ease-in-out) pour un mouvement très doux
    const ease = (t, b, c, d) => {
      t /= d / 2;
      if (t < 1) return (c / 2) * t * t + b;
      t--;
      return (-c / 2) * (t * (t - 2) - 1) + b;
    };

    const animation = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const run = ease(timeElapsed, startPosition, distance, duration);
      window.scrollTo(0, run);
      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  };

  return (
    <div className="accueil">
      <div className="accueil_fond">
        <img 
          src="/logop.svg" 
          alt="Logo" 
          className="accueil_logo" 
          onClick={handleScrollLent}
          style={{ cursor: 'pointer' }}
        />
        <h1 className="accueil_titre_principal" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          pomodoro timer and more <Clock9 size={24} strokeWidth={2.5} />
        </h1>
        <div className="accueil_animation_container">
          <img src="/p1.png" alt="" className="accueil_personnage p_un" />
          <img src="/p2.png" alt="" className="accueil_personnage p_deux" />
          <img src="/p3.png" alt="" className="accueil_personnage p_trois" />
          <img src="/p4.png" alt="" className="accueil_personnage p_quatre" />
          <img src="/p6.png" alt="" className="accueil_personnage p_cinq" />
          <InfiniteLoopAnimation 
            enMarche={true} 
            variante="home" 
            pointsPersonnalises={POINTS_HOME} 
          />
        </div>
        <button
          type="button"
          className="btn_primaire accueil_btn_commencer"
          onClick={onCommencer}
        >
          run rest and repeat
        </button>
      </div>

      {/* --- Seconde partie de la vitrine : accessible par défilement naturel --- */}
      <div className="accueil_suite">

        <section id="presentation" className="accueil_presentation">
          <h2 className="accueil_presentation_titre">Run, rest and repeat</h2>
          <p className="accueil_presentation_texte">
            La méthode Pomodoro consiste à alterner des périodes de travail
            concentré, généralement de 25 minutes, avec de courtes pauses
            régulières. Tout comme dans la course à pied, le secret réside dans le 
            fractionné : il s'agit de fournir un effort intense sur une période de 
            temps définie, puis de prendre un temps de repos pour s'hydrater et 
            souffler. Que ce soit sur une piste ou devant un écran, courir ou 
            travailler à plusieurs permet de se motiver mutuellement. La 
            persévérance est la clé pour aller infiniment plus loin. Le but de 
            cette application est de vous accompagner dans cet effort, de vous aider 
            à repousser vos limites et à atteindre tous vos objectifs.
          </p>
        </section>

        <section className="accueil_fonctionnalites_grille">
          {FONCTIONNALITES_ACCUEIL.map((fonctionnalite) => (
            <div key={fonctionnalite.id} className="accueil_fonctionnalite_bloc">
              <h3 className="accueil_fonctionnalite_titre">{fonctionnalite.titre}</h3>
              <p className="accueil_fonctionnalite_texte">{fonctionnalite.texte}</p>
            </div>
          ))}
        </section>

        <PiedDePage />
      </div>
    </div>
  );
}

export default Accueil;
