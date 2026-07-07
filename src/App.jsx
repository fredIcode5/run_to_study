import { useState, useEffect, useRef } from 'react'
import './App.css'


// --- Réglages Pomodoro par défaut, utilisés au premier lancement
// et comme valeurs de repli en cas de données invalides dans le localStorage ---
const REGLAGES_PAR_DEFAUT = {
  dureeTravail: 25,        // minutes
  dureePause: 5,           // minutes
  couleurChrono: '#1f2430',
  couleurPoignee: '#e2472a',
  couleurBoutons: '#e2472a',
};

const CLE_STOCKAGE_REGLAGES = 'pomodoro_reglages';


function Navbar(){
  return(
    <>
    <div className="navbar">
    <button>home</button>
    <button>page</button>
    <button>stats</button>
    <button>compte</button>
    </div>
    </>
  );
}


function PanneauJoueur ({ pseudo, niveau, distance, position, ouvrirProfil }) {
  return(
    <div className="joueur_info">
      <button
        className="joueur_photo"
        onClick={ouvrirProfil}
        aria-label="Ouvrir le profil"
      >
        <span className="joueur_photo_icone">👤</span>
      </button>

      <div className="joueur_details">
        <div className="joueur_identite">
          <span className="joueur_pseudo">{pseudo}</span>
          <span className="joueur_niveau">Niv. {niveau}</span>
        </div>

        <div className="joueur_stats">
          <div className="joueur_stat">
            <span className="joueur_stat_valeur">{distance} m</span>
            <span className="joueur_stat_label">Distance</span>
          </div>
          <div className="joueur_stat">
            <span className="joueur_stat_valeur">Position : {position}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


function ModalProfil ({ ouvert, fermer, distanceTotale }) {
  if (!ouvert) return null;

  return(
    <div className="modal_fond" onClick={fermer}>
      <div className="modal_fenetre" onClick={(e) => e.stopPropagation()}>
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>
        <div className="modal_contenu">
          <p>Voici votre profil</p>
          <p className="modal_distance_totale">
            Distance totale parcourue : <strong>{distanceTotale} m</strong>
          </p>
        </div>
      </div>
    </div>
  );
}


// --- Chrono : gère le cycle "travail" / "pause" dont les durées sont
// pilotées par les réglages (props dureeTravailMinutes / dureePauseMinutes).
// Les couleurs (chrono, boutons) sont appliquées globalement via des
// variables CSS (voir App > useEffect couleurs), pas via des props ici.
function Chrono ({ enMarche, setEnMarche, onSessionTerminee, dureeTravailMinutes, dureePauseMinutes }) {
  // 'travail' = session Pomodoro classique, 'pause' = pause qui suit
  const [phase, setPhase] = useState('travail');

  const dureeTravail = dureeTravailMinutes * 60;
  const dureePause = dureePauseMinutes * 60;
  const dureeActuelle = phase === 'travail' ? dureeTravail : dureePause;

  const [secondesRestantes, setSecondesRestantes] = useState(dureeActuelle);
  const intervalRef = useRef(null);

  // Application "temps réel" des réglages de durée :
  // si le chrono est à l'arrêt, toute modification de durée dans les
  // Réglages met immédiatement à jour l'affichage. Si le chrono tourne,
  // la nouvelle durée sera prise en compte à la prochaine phase.
  useEffect(() => {
    if (!enMarche) {
      setSecondesRestantes(phase === 'travail' ? dureeTravail : dureePause);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dureeTravailMinutes, dureePauseMinutes, phase]);

  useEffect(() => {
    if (enMarche) {
      intervalRef.current = setInterval(() => {
        setSecondesRestantes((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setEnMarche(false);

            if (phase === 'travail') {
              // Fin d'une session de travail : on comptabilise la distance
              // puis on bascule automatiquement sur la pause
              onSessionTerminee?.(Math.floor(dureeTravail / 5));
              setPhase('pause');
              return dureePause;
            } else {
              // Fin de la pause : retour à une nouvelle session de travail
              setPhase('travail');
              return dureeTravail;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [enMarche, phase, dureeTravail, dureePause]);

  const formaterTemps = (s) => {
    const minutes = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  };

  const start = () => {
    if (secondesRestantes > 0) setEnMarche(true);
  };

  const pause = () => {
    setEnMarche(false);
  };

  const reset = () => {
    setEnMarche(false);
    setSecondesRestantes(dureeActuelle);
  };

  const basculer = () => {
    if (enMarche) pause();
    else start();
  };

  const libelleBouton = enMarche
    ? 'Pause'
    : secondesRestantes === dureeActuelle
      ? (phase === 'travail' ? 'Démarrer' : 'Démarrer la pause')
      : secondesRestantes === 0
        ? 'Terminé'
        : 'Reprendre';

  // Distance simulée de la session en cours : 5 secondes écoulées = 1 mètre
  const secondesEcoulees = dureeActuelle - secondesRestantes;
  const distanceSession = Math.floor(secondesEcoulees / 5);

  return(
    <div className='chrono'>
      {/* Badge indiquant la phase actuelle (utile car le cycle travail/pause est automatique) */}
      <span className={`chrono_phase chrono_phase--${phase}`}>
        {phase === 'travail' ? '🎯 Session de travail' : '☕ Pause'}
      </span>

      <div className="chrono_affichage">{formaterTemps(secondesRestantes)}</div>
      <div className="chrono_controles">
        <button className="btn_primaire" onClick={basculer} disabled={secondesRestantes === 0}>
          {libelleBouton}
        </button>
        <button className="btn_secondaire" onClick={reset}>Recommencer</button>
      </div>

      <div className="chrono_distance">
        <span className="chrono_distance_valeur">{distanceSession} m</span>
        <span className="chrono_distance_label">Distance parcourue</span>
      </div>
    </div>
  );
}


function Note () {
  return(
    <div className='note'>
      <h2>Note 1</h2>
      <p>Contenu du bloc note...</p>
    </div>
  );
}

// --- Param : deux sections ---
// 1. Arrière-plan du site (couleur RGB + image/GIF)
// 2. Minuteur Pomodoro (durées + couleurs)
function Param ({
  couleurFondInput,
  setCouleurFondInput,
  onAppliquerCouleur,
  onChangerImage,
  imageFondActuelle,
  reglages,
  onChangerDuree,
  onChangerCouleur,
  onReinitialiserReglages
}) {
  return(
    <div className='param'>
      <h2>Paramètre 2</h2>
      <p>Contenu du bloc paramètres...</p>

      {/* --- Section : personnalisation de l'arrière-plan --- */}
      <div className="param_section">
        <h3 className="param_section_titre">Arrière-plan du site</h3>

        {/* Option 1 : couleur de fond personnalisée au format RGB */}
        <div className="param_champ">
          <label className="param_label" htmlFor="couleur-fond">
            Couleur de fond (format RGB)
          </label>
          <div className="param_champ_ligne">
            <input
              id="couleur-fond"
              type="text"
              className="param_input"
              placeholder="rgb(255, 0, 0)"
              value={couleurFondInput}
              onChange={(e) => setCouleurFondInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onAppliquerCouleur(couleurFondInput);
              }}
            />
            <button
              className="param_btn_valider"
              onClick={() => onAppliquerCouleur(couleurFondInput)}
            >
              Valider
            </button>
          </div>
        </div>

        {/* Option 2 : image ou GIF de fond depuis les fichiers de l'ordinateur */}
        <div className="param_champ">
          <label className="param_label" htmlFor="image-fond">
            Image / GIF de fond
          </label>

          <label htmlFor="image-fond" className="param_file_label">
            📁 Parcourir...
          </label>
          <input
            id="image-fond"
            type="file"
            accept="image/*,.gif"
            className="param_file_input"
            onChange={(e) => onChangerImage(e.target.files?.[0])}
          />

          {imageFondActuelle && (
            <span className="param_file_nom">Image de fond appliquée ✓</span>
          )}
        </div>
      </div>

      {/* --- Section : personnalisation du minuteur Pomodoro --- */}
      <div className="param_section">
        <h3 className="param_section_titre">Minuteur Pomodoro</h3>

        {/* Durée de la session de travail, en minutes */}
        <div className="param_champ">
          <label className="param_label" htmlFor="duree-travail">
            Durée de la session (minutes)
          </label>
          <input
            id="duree-travail"
            type="number"
            min="1"
            max="180"
            className="param_input"
            value={reglages.dureeTravail}
            onChange={(e) => onChangerDuree('dureeTravail', e.target.value)}
          />
        </div>

        {/* Durée de la pause, en minutes */}
        <div className="param_champ">
          <label className="param_label" htmlFor="duree-pause">
            Durée de la pause (minutes)
          </label>
          <input
            id="duree-pause"
            type="number"
            min="1"
            max="180"
            className="param_input"
            value={reglages.dureePause}
            onChange={(e) => onChangerDuree('dureePause', e.target.value)}
          />
        </div>

        {/* Couleur du chronomètre (texte du minuteur) */}
        <div className="param_couleur_ligne">
          <label className="param_label" htmlFor="couleur-chrono">
            Couleur du chronomètre
          </label>
          <input
            id="couleur-chrono"
            type="color"
            className="param_couleur_input"
            value={reglages.couleurChrono}
            onChange={(e) => onChangerCouleur('couleurChrono', e.target.value)}
          />
        </div>

        {/* Couleur de la poignée du panneau latéral */}
        <div className="param_couleur_ligne">
          <label className="param_label" htmlFor="couleur-poignee">
            Couleur de la poignée du panneau
          </label>
          <input
            id="couleur-poignee"
            type="color"
            className="param_couleur_input"
            value={reglages.couleurPoignee}
            onChange={(e) => onChangerCouleur('couleurPoignee', e.target.value)}
          />
        </div>

        {/* Couleur des boutons du chronomètre */}
        <div className="param_couleur_ligne">
          <label className="param_label" htmlFor="couleur-boutons">
            Couleur des boutons du chronomètre
          </label>
          <input
            id="couleur-boutons"
            type="color"
            className="param_couleur_input"
            value={reglages.couleurBoutons}
            onChange={(e) => onChangerCouleur('couleurBoutons', e.target.value)}
          />
        </div>

        <button className="param_btn_reinit" onClick={onReinitialiserReglages}>
          Réinitialiser les réglages
        </button>
      </div>
    </div>
  );
}


function Chat_IA (){
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chargement, setChargement] = useState(false);
  const messagesFinRef = useRef(null);

  useEffect(() => {
    messagesFinRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const envoyerMessage = async () => {
    if (!input.trim() || chargement) return;

    const nouveauxMessages = [...messages, { role: 'user', text: input }];
    setMessages(nouveauxMessages);
    setInput('');
    setChargement(true);

    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nouveauxMessages.map(m => ({
            role: m.role,
            content: m.text
          }))
        })
      });
      const data = await res.json();
      const reponseTexte = data.content?.[0]?.text || 'Erreur de réponse';

      setMessages(prev => [...prev, { role: 'assistant', text: reponseTexte }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Erreur de connexion au serveur.' }]);
    } finally {
      setChargement(false);
    }
  };

  const gererTouche = (e) => {
    if (e.key === 'Enter') envoyerMessage();
  };

  return(
    <div className='Chat_IA'>
      <div className="chat_messages">
        {messages.length === 0 && (
          <div className="chat_message_vide">Pose ta question à Claude...</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat_message ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {chargement && <div className="chat_message assistant">...</div>}
        <div ref={messagesFinRef}></div>
      </div>

      <div className="chat_input_zone">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={gererTouche}
          placeholder="Écris un message..."
          disabled={chargement}
        />
        <button onClick={envoyerMessage} disabled={chargement}>Envoyer</button>
      </div>
    </div>
  );
}


function Salon_course () {
  return(
    <div className='salon_course'>
      <h2>Statistiques</h2>
      <p>Contenu du bloc stats...</p>
    </div>
  );
}


const ONGLETS_POIGNEE = [
  { id: 1, icone: '📝', label: 'Notes', notif: true },
  { id: 2, icone: '⚙️', label: 'Réglages', notif: true },
  { id: 3, icone: '🤖', label: 'Assistant', notif: true },
  { id: 4, icone: '🏁', label: 'Salon de course', notif: true },
];

// BlocDeux relaie les props "fond" et "réglages Pomodoro" vers Param
function BlocDeux ({
  ouvert,
  setOuvert,
  couleurFondInput,
  setCouleurFondInput,
  onAppliquerCouleur,
  onChangerImage,
  imageFondActuelle,
  reglages,
  onChangerDuree,
  onChangerCouleur,
  onReinitialiserReglages
}) {
  const [vueActive, setVueActive] = useState(1);

  const choisirOnglet = (id) => {
    setVueActive(id);
    if (!ouvert) setOuvert(true);
  };

  return(
    <div className={`panel ${ouvert ? '' : 'panel--collapsed'}`}>
      <div className="panel_poignee">
        <button
          className="poignee_toggle"
          onClick={() => setOuvert(!ouvert)}
          aria-label={ouvert ? 'Réduire le panneau' : 'Ouvrir le panneau'}
        >
          {ouvert ? '›' : '‹'}
        </button>

        <div className="poignee_carres">
          {ONGLETS_POIGNEE.map((onglet) => (
            <button
              key={onglet.id}
              className={`poignee_carre ${vueActive === onglet.id ? 'actif' : ''}`}
              onClick={() => choisirOnglet(onglet.id)}
              aria-label={onglet.label}
              title={onglet.label}
            >
              <span className="poignee_carre_icone">{onglet.icone}</span>
              {onglet.notif && <span className="poignee_notif" aria-hidden="true"></span>}
            </button>
          ))}
        </div>
      </div>

      <div className="panel_corps">
        <div className="panel_controles">
          <button className={vueActive === 1 ? 'actif' : ''} onClick={() => setVueActive(1)}>Notes</button>
          <button className={vueActive === 2 ? 'actif' : ''} onClick={() => setVueActive(2)}>Réglages</button>
          <button className={vueActive === 3 ? 'actif' : ''} onClick={() => setVueActive(3)}>Assistant</button>
          <button className={vueActive === 4 ? 'actif' : ''} onClick={() => setVueActive(4)}>salon de course</button>
        </div>

        <div className="panel_contenu">
          {vueActive === 1 && <Note/>}
          {vueActive === 2 && (
            <Param
              couleurFondInput={couleurFondInput}
              setCouleurFondInput={setCouleurFondInput}
              onAppliquerCouleur={onAppliquerCouleur}
              onChangerImage={onChangerImage}
              imageFondActuelle={imageFondActuelle}
              reglages={reglages}
              onChangerDuree={onChangerDuree}
              onChangerCouleur={onChangerCouleur}
              onReinitialiserReglages={onReinitialiserReglages}
            />
          )}
          {vueActive === 3 && <Chat_IA/>}
          {vueActive === 4 && <Salon_course/>}
        </div>
      </div>
    </div>
  );
}


// --- BarreDefilante : le coureur GIF est placé AU-DESSUS de la bande
// de flèches défilantes, et agrandi pour plus de visibilité. Le GIF
// s'anime nativement (image par image) : aucune animation CSS de saut
// ne lui est appliquée. Le fichier coureur.gif doit être placé dans /public.
function BarreDefilante ({ actif }) {
  const fleches = Array.from({ length: 16 }, (_, i) => i);

  return(
    <div className="bas_page">
      {/* Coureur animé : placé au-dessus de la bande de flèches */}
      <img
        src="/coureur.gif"
        alt="Coureur animé"
        className="coureur_defilant"
      />

      <div className="fleches_bande">
        <div className={`fleches_piste ${actif ? '' : 'arret'}`}>
          {fleches.map((i) => <span key={`a-${i}`}>→</span>)}
          {fleches.map((i) => <span key={`b-${i}`}>→</span>)}
        </div>
      </div>
    </div>
  );
}


function App() {
  const [panelOuvert, setPanelOuvert] = useState(true);
  const [enMarche, setEnMarche] = useState(false);
  const [profilOuvert, setProfilOuvert] = useState(false);
  const [distanceTotale, setDistanceTotale] = useState(0);

  // --- États : personnalisation de l'arrière-plan ---
  const [couleurFondInput, setCouleurFondInput] = useState('');
  const [couleurFondAppliquee, setCouleurFondAppliquee] = useState(null);
  const [imageFond, setImageFond] = useState(null);

  // --- Réglages Pomodoro (durées + couleurs) ---
  // Initialisation "paresseuse" : lecture du localStorage une seule fois,
  // au tout premier rendu, pour restaurer les réglages sauvegardés.
  const [reglages, setReglages] = useState(() => {
    try {
      const sauvegarde = localStorage.getItem(CLE_STOCKAGE_REGLAGES);
      if (!sauvegarde) return REGLAGES_PAR_DEFAUT;
      const parsed = JSON.parse(sauvegarde);
      return { ...REGLAGES_PAR_DEFAUT, ...parsed };
    } catch {
      return REGLAGES_PAR_DEFAUT;
    }
  });

  const ajouterDistanceSession = (metres) => {
    setDistanceTotale((prev) => prev + metres);
  };

  // Vérifie le format "rgb(r, g, b)" avec composantes entre 0 et 255, puis applique
  const appliquerCouleurFond = (valeur) => {
    const regexRgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;
    const correspondance = valeur.trim().match(regexRgb);

    if (!correspondance) {
      alert('Format invalide. Utilisez le format : rgb(255, 0, 0)');
      return;
    }

    const composantesValides = correspondance.slice(1, 4).every(
      (n) => Number(n) >= 0 && Number(n) <= 255
    );

    if (!composantesValides) {
      alert('Chaque composante RGB doit être comprise entre 0 et 255.');
      return;
    }

    setImageFond(null);
    setCouleurFondAppliquee(valeur.trim());
  };

  // Lit le fichier choisi (image ou GIF) et le convertit en data URL utilisable en CSS
  const appliquerImageFond = (fichier) => {
    if (!fichier) return;

    const lecteur = new FileReader();
    lecteur.onload = () => {
      setCouleurFondAppliquee(null);
      setImageFond(lecteur.result);
    };
    lecteur.readAsDataURL(fichier);
  };

  // Applique dynamiquement le fond choisi (couleur ou image) sur le <body>
  useEffect(() => {
    if (imageFond) {
      document.body.style.backgroundImage = `url(${imageFond})`;
      document.body.style.backgroundColor = '';
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
    } else if (couleurFondAppliquee) {
      document.body.style.backgroundImage = 'none';
      document.body.style.backgroundColor = couleurFondAppliquee;
    } else {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundColor = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundAttachment = '';
    }
  }, [couleurFondAppliquee, imageFond]);

  // Sauvegarde automatique des réglages Pomodoro dans le localStorage
  // à chaque modification, pour être restaurés au rechargement de la page.
  useEffect(() => {
    try {
      localStorage.setItem(CLE_STOCKAGE_REGLAGES, JSON.stringify(reglages));
    } catch {
      // Stockage indisponible (navigation privée, quota dépassé...) : on ignore silencieusement
    }
  }, [reglages]);

  // Application en temps réel des couleurs choisies via des variables CSS globales.
  // Le fichier App.css les consomme via var(--couleur-chrono), var(--couleur-poignee),
  // var(--couleur-boutons), évitant tout prop-drilling jusqu'à Chrono / BlocDeux.
  useEffect(() => {
    const racine = document.documentElement;
    racine.style.setProperty('--couleur-chrono', reglages.couleurChrono);
    racine.style.setProperty('--couleur-poignee', reglages.couleurPoignee);
    racine.style.setProperty('--couleur-boutons', reglages.couleurBoutons);
  }, [reglages.couleurChrono, reglages.couleurPoignee, reglages.couleurBoutons]);

  // Met à jour une durée (dureeTravail ou dureePause) après validation basique
  const gererChangementDuree = (cle, valeur) => {
    const nombre = parseInt(valeur, 10);
    if (isNaN(nombre) || nombre < 1) return; // valeur invalide : on ignore le changement
    const nombreBorne = Math.min(nombre, 180); // plafonné à 180 minutes
    setReglages((prev) => ({ ...prev, [cle]: nombreBorne }));
  };

  // Met à jour une couleur (couleurChrono, couleurPoignee ou couleurBoutons)
  const gererChangementCouleur = (cle, valeur) => {
    setReglages((prev) => ({ ...prev, [cle]: valeur }));
  };

  // Réinitialise tous les réglages Pomodoro aux valeurs par défaut
  const reinitialiserReglages = () => {
    setReglages(REGLAGES_PAR_DEFAUT);
  };

  return(
    <>
    <Navbar/>
    <PanneauJoueur
      pseudo="Pseudo"
      niveau={1}
      distance={distanceTotale}
      position={0}
      ouvrirProfil={() => setProfilOuvert(true)}
    />
    <main className={`stage ${panelOuvert ? 'stage--panel-ouvert' : ''}`}>
      <Chrono
        enMarche={enMarche}
        setEnMarche={setEnMarche}
        onSessionTerminee={ajouterDistanceSession}
        dureeTravailMinutes={reglages.dureeTravail}
        dureePauseMinutes={reglages.dureePause}
      />
    </main>
    <BlocDeux
      ouvert={panelOuvert}
      setOuvert={setPanelOuvert}
      couleurFondInput={couleurFondInput}
      setCouleurFondInput={setCouleurFondInput}
      onAppliquerCouleur={appliquerCouleurFond}
      onChangerImage={appliquerImageFond}
      imageFondActuelle={imageFond}
      reglages={reglages}
      onChangerDuree={gererChangementDuree}
      onChangerCouleur={gererChangementCouleur}
      onReinitialiserReglages={reinitialiserReglages}
    />
    <BarreDefilante actif={enMarche}/>
    <ModalProfil
      ouvert={profilOuvert}
      fermer={() => setProfilOuvert(false)}
      distanceTotale={distanceTotale}
    />
    </>
  )
}

export default App