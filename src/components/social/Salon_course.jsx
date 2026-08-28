import React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getAmis, creerSession, rejoindreSession, quitterSession, ecouterSessions, chargerProfil } from '../../lib/firebaseDataService';
import CarteSalon from './CarteSalon';
import CarteAmi from './CarteAmi';
import ParticipantRow from './ParticipantRow';


function Salon_course({ reglages, imageFondActuelle, musiqueActuelle, onOuvrirBoutique, onSessionEnLigneChange, pointsPomodoro }) {
  const { utilisateur } = useAuth();
  const [modeActif, setModeActif] = useState('recherche'); // Default to recherche
  const [rechercheTempsTravail, setRechercheTempsTravail] = useState(25);
  const [rechercheTempsRepos, setRechercheTempsRepos] = useState(5);
  const [rechercheEcart, setRechercheEcart] = useState(5);
  const [codeSaisi, setCodeSaisi] = useState('');
  const [sessionActive, setSessionActive] = useState(null);
  const [salons, setSalons] = useState([]);
  const [amis, setAmis] = useState([]);
  const [photoProfilLocale, setPhotoProfilLocale] = useState(null);

  useEffect(() => {
    if (onSessionEnLigneChange) {
      onSessionEnLigneChange(sessionActive);
    }
  }, [sessionActive, onSessionEnLigneChange]);

  // Charger la photo de profil depuis Firestore
  useEffect(() => {
    if (!utilisateur?.uid) return;
    chargerProfil(utilisateur.uid).then(profil => {
      if (profil?.photo_profil) setPhotoProfilLocale(profil.photo_profil);
    }).catch(console.error);
  }, [utilisateur?.uid]);

  useEffect(() => {
    if (utilisateur?.uid) {
      getAmis(utilisateur.uid).then(setAmis).catch(console.error);
    }
  }, [utilisateur]);

  useEffect(() => {
    const unsubscribe = ecouterSessions((sessionsRecues) => {
      setSalons(sessionsRecues);
      
      // Détecter automatiquement si l'utilisateur fait partie d'une session
      if (utilisateur?.uid) {
        const maSession = sessionsRecues.find(s => 
          s.participants && s.participants.some(p => p.uid === utilisateur.uid)
        );
        if (maSession) {
          setSessionActive(maSession);
          setModeActif('session');
        } else {
          setSessionActive(null);
          setModeActif(prev => (prev === 'session' ? 'recherche' : prev));
        }
      }
    });
    return () => unsubscribe();
  }, [utilisateur?.uid]);

  // Toggle modes
  const handleModeRecherche = () => setModeActif('recherche');
  const handleModeRejoindre = () => setModeActif(modeActif === 'rejoindre' ? 'recherche' : 'rejoindre');
  const handleModeCreer = () => setModeActif(modeActif === 'creer' ? 'recherche' : 'creer');

  const executerCreation = async () => {
    if (!utilisateur) return alert("Vous devez être connecté pour créer une session.");
    const nvCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const tTravail = reglages?.dureeTravail || 25;
    const tPause = reglages?.dureePause || 5;
    let themeStr = 'Focus';
    if (musiqueActuelle?.type === 'spotify') themeStr = 'Spotify';
    else if (musiqueActuelle?.type === 'youtube') themeStr = 'YouTube';

    const nvSalon = {
      nom: 'Session de ' + (utilisateur?.pseudo || 'Anonyme'),
      proprietaire: utilisateur?.pseudo || 'Anonyme',
      proprietaireId: utilisateur?.uid,
      theme: themeStr,
      tempsTravail: tTravail, 
      tempsPause: tPause,
      imageFond: imageFondActuelle,
      code: nvCode,
      etatPomodoro: 'En attente',
      participants: [{
        uid: utilisateur.uid,
        pseudo: utilisateur.pseudo || 'Anonyme',
        photo: photoProfilLocale || utilisateur.photoURL || '🧑',
        enSession: true
      }]
    };
    
    try {
      const id = await creerSession(nvSalon);
      setSessionActive({ id, ...nvSalon });
      setModeActif('session');
    } catch (e) {
      alert("Erreur lors de la création de la session.");
    }
  };

  const validerCodeRejoindre = async (code) => {
    if (!utilisateur) return alert("Vous devez être connecté pour rejoindre une session.");
    const codeNettoye = code.trim().toUpperCase();
    const salonTrouve = salons.find(s => s.code.toUpperCase() === codeNettoye);
    if (salonTrouve) {
      try {
        await rejoindreSession(salonTrouve.id, {
          uid: utilisateur.uid,
          pseudo: utilisateur.pseudo || 'Anonyme',
          photo: photoProfilLocale || utilisateur.photoURL || '🧑',
          enSession: true
        });
        setSessionActive(salonTrouve);
        setModeActif('session');
      } catch (e) {
        alert("Erreur en rejoignant la session.");
      }
    } else {
      alert("Code de session invalide ou session introuvable.");
    }
  };

  const handleRejoindreDirect = async (salon) => {
    if (!utilisateur) return alert("Vous devez être connecté pour rejoindre une session.");
    try {
      await rejoindreSession(salon.id, {
        uid: utilisateur.uid,
        pseudo: utilisateur.pseudo || 'Anonyme',
        photo: photoProfilLocale || utilisateur.photoURL || '🧑',
        enSession: true
      });
      setSessionActive(salon);
      setModeActif('session');
    } catch (e) {
      alert("Erreur en rejoignant la session.");
    }
  };

  const handleQuitterSession = async () => {
    if (sessionActive && utilisateur) {
      try {
        await quitterSession(sessionActive.id, utilisateur.uid);
      } catch(e) {
        console.error(e);
      }
    }
    setSessionActive(null);
    setModeActif('recherche');
  };

  const handleInviter = (ami) => {
    alert(`Invitation envoyée à ${ami.pseudo}`);
  };

  const salonsFiltres = salons.filter((s) => {
    if (rechercheEcart === 31) return true;
    const ecartTravail = Math.abs((s.tempsTravail || 0) - rechercheTempsTravail);
    const reposMatch = (s.tempsPause || 0) === rechercheTempsRepos;
    return ecartTravail <= rechercheEcart && reposMatch;
  });

  // Prepare enriched friends (with active session info if they are in one)
  const amisEnrichis = amis.map(ami => {
    let enSession = false;
    let codeSession = null;
    
    for (const salon of salons) {
      if (salon.participants && salon.participants.some(p => p.uid === ami.amiId)) {
        enSession = true;
        codeSession = salon.code;
        break;
      }
    }
    
    return {
      ...ami,
      photo: ami.photo_profil,
      enSession,
      codeSession
    };
  });

  return (
    <div className="salon_course">
      
      {modeActif !== 'session' && (
        <div className="salon_entete_actions">
          <button 
            className={`salon_btn_action ${modeActif === 'recherche' || modeActif === 'accueil' ? 'actif' : ''}`} 
            onClick={handleModeRecherche}
          >
            🔎 Rechercher
          </button>
          <button 
            className={`salon_btn_action salon_btn_creer ${modeActif === 'creer' ? 'actif' : ''}`} 
            onClick={handleModeCreer}
          >
            ➕ Créer
          </button>
          <button 
            className={`salon_btn_action ${modeActif === 'rejoindre' ? 'actif' : ''}`} 
            onClick={handleModeRejoindre}
          >
            🔗 Rejoindre
          </button>
        </div>
      )}

      <div className="salon_contenu">
        {modeActif === 'creer' && (
          <div className="salon_section_creer" style={{ textAlign: 'center', padding: '32px 16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ marginBottom: '24px', color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Vos paramètres de session vont servir à créer une session.
            </p>
            <button 
              className="salon_btn_valider_code" 
              style={{ padding: '10px 24px', fontSize: '1rem', background: '#10b981' }}
              onClick={executerCreation}
            >
              Créer
            </button>
          </div>
        )}

        {(modeActif === 'recherche' || modeActif === 'accueil') && (
          <div className="salon_section_recherche">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: '1' }}>
                <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>Temps de travail</label>
                <input
                  type="number"
                  className="salon_input_saisie"
                  value={rechercheTempsTravail}
                  onChange={(e) => setRechercheTempsTravail(parseInt(e.target.value) || 0)}
                  onWheel={(e) => {
                    if (e.deltaY < 0) setRechercheTempsTravail(prev => prev + 1);
                    else if (e.deltaY > 0) setRechercheTempsTravail(prev => prev > 0 ? prev - 1 : 0);
                  }}
                  style={{ marginBottom: 0 }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: '1' }}>
                <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>Temps de repos</label>
                <input
                  type="number"
                  className="salon_input_saisie"
                  value={rechercheTempsRepos}
                  onChange={(e) => setRechercheTempsRepos(parseInt(e.target.value) || 0)}
                  onWheel={(e) => {
                    if (e.deltaY < 0) setRechercheTempsRepos(prev => prev + 1);
                    else if (e.deltaY > 0) setRechercheTempsRepos(prev => prev > 0 ? prev - 1 : 0);
                  }}
                  style={{ marginBottom: 0 }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: '1' }}>
                <label style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>
                  Écart : {rechercheEcart === 31 ? 'Toutes les séances' : `±${rechercheEcart} min`}
                </label>
                <input
                  type="range"
                  min="0"
                  max="31"
                  value={rechercheEcart}
                  onChange={(e) => setRechercheEcart(parseInt(e.target.value) || 0)}
                  style={{ cursor: 'pointer', height: '42px', accentColor: '#10b981', margin: 0 }}
                />
              </div>
            </div>
            <div className="salon_liste">
              {salonsFiltres.length === 0 ? (
                <p className="salon_vide">Aucune session disponible</p>
              ) : (
                salonsFiltres.map(salon => (
                  <CarteSalon key={salon.id} salon={salon} onRejoindre={handleRejoindreDirect} />
                ))
              )}
            </div>
          </div>
        )}

        {modeActif === 'rejoindre' && (
          <div className="salon_section_rejoindre">
            <div className="salon_input_groupe">
              <input
                type="text"
                className="salon_input_saisie code_saisie"
                placeholder="Code (ex: AAA25b)"
                value={codeSaisi}
                onChange={(e) => setCodeSaisi(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') validerCodeRejoindre(codeSaisi); }}
                autoFocus
              />
              <button className="salon_btn_valider_code" onClick={() => validerCodeRejoindre(codeSaisi)}>
                Rejoindre
              </button>
            </div>
            
            <h3 className="salon_section_titre mt-4">Mes amis</h3>
            <div className="amis_liste">
              {amisEnrichis.length === 0 ? (
                <p className="salon_vide">Vous n'avez pas encore d'amis connectés.</p>
              ) : (
                amisEnrichis.map(ami => (
                  <CarteAmi 
                    key={ami.id} 
                    ami={ami} 
                    onRejoindre={validerCodeRejoindre} 
                    onInviter={handleInviter} 
                  />
                ))
              )}
            </div>
          </div>
        )}

        {modeActif === 'session' && sessionActive && (
          <div className="salon_section_active">
            <div className="session_active_entete" style={{ alignItems: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
                Code : {sessionActive.code} - Chrono : {sessionActive.tempsTravail}/{sessionActive.tempsPause}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="salon_btn_boutique"
                  onClick={onOuvrirBoutique}
                >
                  🛍️ Boutique
                </button>
                <button className="salon_btn_quitter" onClick={handleQuitterSession}>Quitter</button>
              </div>
            </div>
            
            <h3 className="salon_section_titre">Participants</h3>
            <div className="participants_liste">
              {sessionActive.participants && sessionActive.participants.length > 0 ? (
                [...sessionActive.participants]
                  .sort((a, b) => (a.uid === utilisateur?.uid ? -1 : b.uid === utilisateur?.uid ? 1 : 0))
                  .map(p => (
                    <ParticipantRow
                      key={p.uid}
                      participant={p}
                      estMoi={p.uid === utilisateur?.uid}
                      musiqueCourante={p.uid === utilisateur?.uid ? musiqueActuelle : null}
                      nbTours={p.uid === utilisateur?.uid ? (pointsPomodoro?.length ?? 0) : (p.nbTours ?? p.tours ?? undefined)}
                    />
                  ))
              ) : (
                <p className="salon_vide">Aucun participant (1/5)</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Salon_course;
