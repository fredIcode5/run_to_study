import { useState, useEffect, useRef } from 'react'
import './App.css'


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


function Chrono ({ enMarche, setEnMarche, onSessionTerminee }) {
  const DUREE_INITIALE = 25 * 60;
  const [secondesRestantes, setSecondesRestantes] = useState(DUREE_INITIALE);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (enMarche) {
      intervalRef.current = setInterval(() => {
        setSecondesRestantes((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setEnMarche(false);
            // Fin de session Pomodoro : on ajoute la distance totale de la session au profil
            onSessionTerminee?.(Math.floor(DUREE_INITIALE / 5));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [enMarche]);

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
    setSecondesRestantes(DUREE_INITIALE);
  };

  const basculer = () => {
    if (enMarche) pause();
    else start();
  };

  const libelleBouton = enMarche
    ? 'Pause'
    : secondesRestantes === DUREE_INITIALE
      ? 'Démarrer'
      : secondesRestantes === 0
        ? 'Terminé'
        : 'Reprendre';

  // Distance simulée de la session en cours : 5 secondes écoulées = 1 mètre
  const secondesEcoulees = DUREE_INITIALE - secondesRestantes;
  const distanceSession = Math.floor(secondesEcoulees / 5);

  return(
    <div className='chrono'>
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

function Param () {
  return(
    <div className='param'>
      <h2>Paramètre 2</h2>
      <p>Contenu du bloc paramètres...</p>
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


// Onglets associés aux carrés de la poignée (icône, aria-label, vue correspondante)
const ONGLETS_POIGNEE = [
  { id: 1, icone: '📝', label: 'Notes', notif: true },
  { id: 2, icone: '⚙️', label: 'Réglages', notif: true },
  { id: 3, icone: '🤖', label: 'Assistant', notif: true },
  { id: 4, icone: '🏁', label: 'Salon de course', notif: true },
];

function BlocDeux ({ ouvert, setOuvert }) {
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
          {vueActive === 2 && <Param/>}
          {vueActive === 3 && <Chat_IA/>}
          {vueActive === 4 && <Salon_course/>}
        </div>
      </div>
    </div>
  );
}


function BarreDefilante ({ actif }) {
  const fleches = Array.from({ length: 16 }, (_, i) => i);

  return(
    <div className="bas_page">
      <div className={`bloc_sautillant ${actif ? '' : 'arret'}`}></div>
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

  const ajouterDistanceSession = (metres) => {
    setDistanceTotale((prev) => prev + metres);
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
      />
    </main>
    <BlocDeux ouvert={panelOuvert} setOuvert={setPanelOuvert}/>
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