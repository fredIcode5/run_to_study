import React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { rechercherUtilisateurs, envoyerDemandeAmi, repondreDemandeAmi, getDemandesAmis, getDemandesEnvoyees, getAmis } from '../../lib/firebaseDataService';

// --- Onglet "Social" : partagé en deux colonnes.
// Gauche : recherche d'utilisateurs (barre de recherche + résultats placeholder).
// Droite : liste d'amis (placeholder), avec statut et actions rapides.
function OngletSocial() {
  const { utilisateur } = useAuth();
  const [rechercheTerme, setRechercheTerme] = useState('');
  const [resultatsRecherche, setResultatsRecherche] = useState([]);
  const [enChargementRecherche, setEnChargementRecherche] = useState(false);

  // Recherche dynamique avec debounce
  useEffect(() => {
    let timeoutId;

    const lancerRecherche = async () => {
      if (!rechercheTerme || rechercheTerme.trim().length < 2) {
        setResultatsRecherche([]);
        return;
      }

      setEnChargementRecherche(true);
      try {
        const resultats = await rechercherUtilisateurs(rechercheTerme, utilisateur?.id);
        setResultatsRecherche(resultats);
      } catch (err) {
        console.error("Erreur lors de la recherche :", err);
        setResultatsRecherche([]);
      } finally {
        setEnChargementRecherche(false);
      }
    };

    if (rechercheTerme.trim().length >= 2) {
      timeoutId = setTimeout(lancerRecherche, 300); // 300ms de debounce
    } else {
      setResultatsRecherche([]);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [rechercheTerme, utilisateur?.id]);

  const [amis, setAmis] = useState([]);
  const [demandesRecues, setDemandesRecues] = useState([]);
  const [demandesEnvoyees, setDemandesEnvoyees] = useState([]);
  const [chargementSocial, setChargementSocial] = useState(true);

  const chargerDonneesSociales = async () => {
    if (!utilisateur?.id) return;
    setChargementSocial(true);
    try {
      const amisData = await getAmis(utilisateur.id);
      const recuesData = await getDemandesAmis(utilisateur.id);
      const envoyeesData = await getDemandesEnvoyees(utilisateur.id);

      setAmis(amisData);
      setDemandesRecues(recuesData);
      setDemandesEnvoyees(envoyeesData);
    } catch (err) {
      console.error("Erreur chargement social:", err);
    } finally {
      setChargementSocial(false);
    }
  };

  useEffect(() => {
    chargerDonneesSociales();
  }, [utilisateur?.id]);

  const handleAjouterAmi = async (destinataireId) => {
    if (!utilisateur?.id) return;
    try {
      await envoyerDemandeAmi(utilisateur.id, destinataireId);
      await chargerDonneesSociales();
    } catch (err) {
      console.error("Erreur ajout ami", err);
    }
  };

  const handleRepondreDemande = async (demandeId, reponse) => {
    try {
      await repondreDemandeAmi(demandeId, reponse);
      await chargerDonneesSociales();
    } catch (err) {
      console.error("Erreur reponse demande", err);
    }
  };

  // Helper pour savoir si on a déjà envoyé/reçu/accepté une demande avec un utilisateur
  const getStatutAmi = (userId) => {
    if (amis.some(a => a.amiId === userId)) return 'ami';
    if (demandesEnvoyees.some(d => d.destinataire_id === userId)) return 'envoyee';
    if (demandesRecues.some(d => d.expediteur_id === userId)) return 'recue';
    return 'aucun';
  };

  return (
    <div className="profil_onglet_panneau profil_onglet_panneau--social">
      <div className="social_layout">

        {/* Colonne gauche : recherche d'utilisateurs */}
        <div className="social_colonne social_colonne_recherche">
          <h4 className="profil_section_titre">Rechercher des utilisateurs</h4>

          <input
            type="text"
            className="social_recherche_input"
            placeholder="Rechercher un pseudo ou email..."
            value={rechercheTerme}
            onChange={(e) => setRechercheTerme(e.target.value)}
          />

          <div className="social_resultats_liste">
            {enChargementRecherche ? (
              <p className="social_message_info">Recherche en cours...</p>
            ) : resultatsRecherche.length > 0 ? (
              resultatsRecherche.map((resultat) => {
                const statut = getStatutAmi(resultat.id);
                return (
                  <div key={resultat.id} className="social_resultat_rectangle social_carte_compacte">
                    <div className="social_resultat_infos">
                      <div className="social_resultat_photo">
                        {resultat.photo_profil ? (
                          <img src={resultat.photo_profil} alt={`Profil de ${resultat.pseudo}`} className="social_resultat_photo_img" />
                        ) : (
                          <span className="social_resultat_photo_icone">👤</span>
                        )}
                      </div>
                      <div className="social_resultat_identite">
                        <span className="social_resultat_pseudo">{resultat.pseudo}</span>
                        <span className="social_resultat_niveau">Niv. {resultat.niveau}</span>
                      </div>
                    </div>

                    {statut === 'aucun' && (
                      <button type="button" className="btn_secondaire social_resultat_btn_ajouter" onClick={() => handleAjouterAmi(resultat.id)}>
                        Ajouter
                      </button>
                    )}
                    {statut === 'envoyee' && (
                      <button type="button" className="btn_secondaire social_resultat_btn_ajouter" disabled style={{ opacity: 0.6 }}>
                        En attente
                      </button>
                    )}
                    {statut === 'recue' && (
                      <button type="button" className="btn_secondaire social_resultat_btn_ajouter" disabled style={{ opacity: 0.6 }}>
                        Demande reçue
                      </button>
                    )}
                    {statut === 'ami' && (
                      <button type="button" className="btn_secondaire social_resultat_btn_ajouter" disabled style={{ opacity: 0.6 }}>
                        Déjà ami
                      </button>
                    )}
                  </div>
                );
              })
            ) : rechercheTerme.trim().length >= 2 ? (
              <p className="social_message_info">Aucun utilisateur trouvé.</p>
            ) : (
              <p className="social_message_info">Cherchez des amis avec qui courir, travailler et évoluer ensemble.</p>
            )}
          </div>
        </div>

        {/* Colonne droite : liste d'amis */}
        <div className="social_colonne social_colonne_amis">
          <h4 className="profil_section_titre">Liste d'amis</h4>

          <div className="social_amis_liste">
            {chargementSocial ? (
              <p className="social_message_info">Chargement de vos amis...</p>
            ) : (
              <>
                {demandesRecues.length > 0 && (
                  <div className="social_demandes_section">
                    <h5 style={{ fontSize: '0.85rem', color: 'var(--dc-text-secondary, #b5bac1)', marginBottom: '8px', marginTop: 0 }}>Demandes reçues</h5>
                    {demandesRecues.map((demande) => (
                      <div key={demande.id} className="social_ami_rectangle social_carte_compacte">
                        <div className="social_ami_photo">
                          {demande.expediteur?.photo_profil ? (
                            <img src={demande.expediteur.photo_profil} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            <span className="social_ami_photo_icone">👤</span>
                          )}
                        </div>
                        <div className="social_ami_contenu">
                          <div className="social_ami_ligne_haut">
                            <span className="social_ami_pseudo">{demande.expediteur?.pseudo}</span>
                            <div className="social_ami_actions">
                              <button type="button" className="btn_secondaire" onClick={() => handleRepondreDemande(demande.id, 'refusee')}>
                                Refuser
                              </button>
                              <button type="button" className="btn_primaire" onClick={() => handleRepondreDemande(demande.id, 'acceptee')}>
                                Accepter
                              </button>
                            </div>
                          </div>
                          <span className="social_ami_activite_label">Niv. {demande.expediteur?.niveau}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {amis.length > 0 ? (
                  <div className="social_amis_approuves">
                    {demandesRecues.length > 0 && <h5 style={{ fontSize: '0.85rem', color: 'var(--dc-text-secondary, #b5bac1)', margin: '16px 0 8px 0' }}>Amis</h5>}
                    {amis.map((ami) => (
                      <div key={ami.id} className="social_ami_rectangle social_carte_compacte">
                        <div className="social_ami_photo">
                          {ami.photo_profil ? (
                            <img src={ami.photo_profil} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            <span className="social_ami_photo_icone">👤</span>
                          )}
                        </div>
                        <div className="social_ami_contenu">
                          <div className="social_ami_ligne_haut">
                            <span className="social_ami_pseudo">{ami.pseudo}</span>
                          </div>
                          <span className="social_ami_activite_label">Niv. {ami.niveau}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  demandesRecues.length === 0 && (
                    <p className="social_message_info">Vous n'avez actuellement aucun ami.</p>
                  )
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default OngletSocial;
