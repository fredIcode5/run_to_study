import React from 'react';
import { useState, useEffect } from 'react';
import { Pause } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { useAuth } from '../../context/AuthContext.jsx';
import { chargerPlanningMois, chargerPlanningJour, sauvegarderPlanningJour } from '../../lib/firebaseDataService';
import { formaterJourIso } from '../../utils/helpers';
import TacheZoneTexte from '../tasks/TacheZoneTexte';


// --- Onglet "Planning" : Gestion de sessions et tâches via un calendrier interactif
function OngletPlanning() {
  const { utilisateur } = useAuth();

  // Mois actuellement affiché (par défaut le 1er du mois courant pour simplifier)
  const aujourdhui = new Date();
  const [moisAffiche, setMoisAffiche] = useState(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1));

  // Date sélectionnée (format YYYY-MM-DD)
  const [dateSelectionnee, setDateSelectionnee] = useState(formaterJourIso(aujourdhui));

  // Données du mois (pour les bulles)
  const [donneesMois, setDonneesMois] = useState({});

  // Données du jour sélectionné
  const [titreSession, setTitreSession] = useState('');
  const [themeSession, setThemeSession] = useState('Concentration (par défaut)');
  const [notes, setNotes] = useState([]);
  const [texteEvenement, setTexteEvenement] = useState('');

  const [enChargement, setEnChargement] = useState(true);

  // Charger les données globales du mois (les compteurs de notes et événements)
  useEffect(() => {
    if (!utilisateur?.id) return;

    const chargerMois = async () => {
      const prefixe = `${moisAffiche.getFullYear()}-${String(moisAffiche.getMonth() + 1).padStart(2, '0')}`;
      const donnees = await chargerPlanningMois(utilisateur.id, prefixe);
      setDonneesMois(donnees);
    };
    chargerMois();
  }, [moisAffiche, utilisateur?.id]);

  // Charger les détails du jour
  useEffect(() => {
    if (!utilisateur?.id) return;

    let annule = false;
    const chargerJour = async () => {
      setEnChargement(true);
      const data = await chargerPlanningJour(utilisateur.id, dateSelectionnee);
      if (!annule) {
        setTitreSession(data.titreSession || '');
        setThemeSession(data.themeSession || 'Concentration (par défaut)');
        setNotes(data.notes || []);
        setTexteEvenement(data.evenement || '');
        setEnChargement(false);
      }
    };
    chargerJour();
    return () => { annule = true; };
  }, [dateSelectionnee, utilisateur?.id]);

  // Sauvegarde automatique (debounce)
  useEffect(() => {
    if (enChargement || !utilisateur?.id) return;

    const timeout = setTimeout(() => {
      sauvegarderPlanningJour(utilisateur.id, dateSelectionnee, {
        titreSession,
        themeSession,
        notes,
        evenement: texteEvenement
      });

      // Mettre à jour le compteur du mois en local sans recharger depuis Firebase
      setDonneesMois(prev => ({
        ...prev,
        [dateSelectionnee]: {
          count: notes.length,
          evenement: texteEvenement
        }
      }));
    }, 500);

    return () => clearTimeout(timeout);
  }, [titreSession, themeSession, notes, texteEvenement, dateSelectionnee, utilisateur?.id, enChargement]);

  // Événements pour afficher les bulles sur le calendrier
  const events = Object.entries(donneesMois)
    .filter(([_, data]) => data?.count > 0 || !!data?.evenement)
    .map(([date, data]) => ({
      date: date,
      extendedProps: { count: data?.count || 0, evenement: data?.evenement || '' }
    }));

  const renderEventContent = (eventInfo) => {
    const { count, evenement } = eventInfo.event.extendedProps;
    return (
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {count > 0 && (
          <div className="planning_bulle_indicateur_fc">
            {count}
          </div>
        )}
        {evenement && (
          <div style={{ color: '#f59e0b', fontSize: '12px', lineHeight: 1 }} title={evenement}>
            ⭐
          </div>
        )}
      </div>
    );
  };

  const THEMES_SESSION = [
    'Concentration (par défaut)',
    'Créativité',
    'Administratif',
    'Révision / Étude',
    'Sport / Physique',
    'Détente / Pause'
  ];

  const handleAjouterNote = () => {
    const id = Date.now().toString();
    setNotes([...notes, { id, contenu: '', terminee: false }]);
  };

  const handleModifierNote = (id, nouveauContenu) => {
    setNotes(notes.map(n => n.id === id ? { ...n, contenu: nouveauContenu } : n));
  };

  const handleToggleNote = (id) => {
    setNotes(notes.map(n => n.id === id ? { ...n, terminee: !n.terminee } : n));
  };

  const handleSupprimerNote = (id) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const dateFormatee = new Date(dateSelectionnee).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="planning_layout">
      {/* Colonne Gauche : Calendrier */}
      <div className="planning_colonne_calendrier">
        <div className="planning_calendrier_conteneur">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridWeek"
            initialDate={moisAffiche}
            events={events}
            eventContent={renderEventContent}
            locale={frLocale}
            contentHeight="auto"
            dateClick={(info) => {
              setDateSelectionnee(info.dateStr);
            }}
            datesSet={(info) => {
              const middleDate = new Date((info.start.getTime() + info.end.getTime()) / 2);
              // Avoid infinite loops by only updating if the month/year changed
              if (middleDate.getMonth() !== moisAffiche.getMonth() || middleDate.getFullYear() !== moisAffiche.getFullYear()) {
                setMoisAffiche(middleDate);
              }
            }}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            firstDay={1} // Lundi
            aspectRatio={1.8}
            dayCellClassNames={(arg) => {
              if (formaterJourIso(arg.date) === dateSelectionnee) {
                return 'fc-day-selectionne';
              }
              return '';
            }}
          />
        </div>

        {/* Section Événements séparée */}
        <div className="planning_evenements_section" style={{ marginTop: '24px' }}>
          <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.05rem', fontWeight: 600, color: '#1f2430', marginBottom: '12px', paddingLeft: '4px' }}>
            Événements
          </h4>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid rgba(31, 36, 48, 0.06)',
            boxShadow: 'var(--shadow-soft)',
            padding: '12px',
            position: 'relative'
          }}>
            <textarea
              className="todo_contenu"
              style={{ minHeight: '60px', width: '100%', fontSize: '0.95rem', background: 'transparent', resize: 'vertical' }}
              placeholder="Décris un événement pour ce jour (max 100 mots)..."
              value={texteEvenement}
              onChange={(e) => {
                const mots = e.target.value.split(/\s+/).filter(w => w.length > 0);
                if (mots.length <= 100) {
                  setTexteEvenement(e.target.value);
                }
              }}
            />
            <div style={{ textAlign: 'right', marginTop: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {texteEvenement.split(/\s+/).filter(w => w.length > 0).length} / 100 mots
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Colonne Droite : Détails */}
      <div className="planning_colonne_details">
        <h3 className="planning_details_entete" style={{ textTransform: 'capitalize' }}>
          {dateFormatee}
        </h3>

        {enChargement ? (
          <p className="social_message_info">Chargement...</p>
        ) : (
          <>
            <div className="planning_groupe_champ" style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="planning_label">Tâches / Notes</label>
                <button type="button" className="btn_primaire" style={{ fontSize: '0.85rem', padding: '6px 12px' }} onClick={handleAjouterNote}>
                  + Ajouter
                </button>
              </div>

              <div className="planning_notes_liste">
                {notes.length === 0 ? (
                  <p className="social_message_info" style={{ textAlign: 'left', fontSize: '0.9rem' }}>Aucune note pour ce jour.</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className={`todo_carte ${note.terminee ? 'todo_carte--terminee' : ''}`} style={{ marginBottom: '12px' }}>
                      <div className="todo_carte_actions_haut">
                        <button
                          type="button"
                          className="todo_carte_suppr"
                          onClick={() => handleSupprimerNote(note.id)}
                          aria-label="Supprimer la tâche"
                        >
                          ✕
                        </button>
                      </div>

                      <TacheZoneTexte
                        className="todo_contenu"
                        valeur={note.contenu}
                        onChange={(valeur) => handleModifierNote(note.id, valeur)}
                        placeholder="Écris ta tâche..."
                      />

                      <div className="todo_carte_actions">
                        <button
                          type="button"
                          className={`todo_btn_terminer ${note.terminee ? 'actif' : ''}`}
                          onClick={() => handleToggleNote(note.id)}
                        >
                          {note.terminee ? '✓ Terminé' : 'Terminé'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default OngletPlanning;
