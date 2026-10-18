import React from 'react';
import { useState } from 'react';
import { extraireIdYoutube } from '../../utils/helpers';
import MiniatureMusique from './MiniatureMusique';
import LecteurVinyle from './LecteurVinyle';


// Modale de sélection de la musique d'ambiance : lien YouTube, ou recherche
// via un compte Spotify connecté (simulation de connexion, comme pour les salons)
function ModalChoisirMusique({ ouvert, fermer, onValider }) {
  const [typeMusique, setTypeMusique] = useState('youtube');
  const [lienYoutube, setLienYoutube] = useState('');
  const [spotifyConnecte, setSpotifyConnecte] = useState(false);
  const [rechercheSpotify, setRechercheSpotify] = useState('');
  const [artisteSpotify, setArtisteSpotify] = useState('');

  if (!ouvert) return null;

  // Aperçu en direct de la miniature qui sera utilisée sur la carte du
  // lecteur, affiché au fur et à mesure de la saisie (lien YouTube valide,
  // ou recherche Spotify renseignée)
  const idYoutubeApercu = typeMusique === 'youtube' && lienYoutube.trim()
    ? extraireIdYoutube(lienYoutube)
    : null;
  const afficherApercuSpotify = typeMusique === 'spotify' && spotifyConnecte && rechercheSpotify.trim();

  const connecterSpotify = () => setSpotifyConnecte(true);

  const validerYoutube = () => {
    const id = extraireIdYoutube(lienYoutube);
    if (!id) {
      alert('Lien YouTube invalide. Utilisez un lien du type https://www.youtube.com/watch?v=...');
      return;
    }
    // Le titre/artiste réels seront récupérés automatiquement une fois la
    // vidéo chargée (voir LecteurVinyle > getVideoData). La miniature, elle,
    // est disponible immédiatement via le CDN public de YouTube.
    onValider({
      type: 'youtube',
      videoId: id,
      titre: 'Musique YouTube',
      artiste: '',
      duree: 0,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    });
    setLienYoutube('');
    fermer();
  };

  const validerSpotify = () => {
    const titre = rechercheSpotify.trim();
    if (!titre) return;
    // Pas d'API de lecture Spotify disponible ici : la piste, sa durée et
    // sa pochette sont simulées (aucune vraie recherche n'est effectuée)
    onValider({
      type: 'spotify',
      titre,
      artiste: artisteSpotify.trim(),
      duree: 200 + Math.floor(Math.random() * 100),
      thumbnail: null,
    });
    setRechercheSpotify('');
    setArtisteSpotify('');
    fermer();
  };

  return (
    <div className="modal_fond salon_modal_fond" onClick={fermer}>
      <div className="modal_fenetre salon_modal_fenetre" onClick={(e) => e.stopPropagation()}>
        <button className="modal_fermer" onClick={fermer} aria-label="Fermer">×</button>

        <div className="salon_modal_contenu">
          <h3 className="salon_modal_titre">Choisir une musique d'ambiance</h3>

          <div className="salon_champ">
            <label className="salon_label">Source de la musique</label>
            <div className="salon_musique_choix">
              <button
                type="button"
                className={`salon_musique_onglet ${typeMusique === 'youtube' ? 'actif' : ''}`}
                onClick={() => setTypeMusique('youtube')}
              >
                Lien YouTube
              </button>
              <button
                type="button"
                className={`salon_musique_onglet ${typeMusique === 'spotify' ? 'actif' : ''}`}
                onClick={() => setTypeMusique('spotify')}
              >
                Spotify
              </button>
            </div>

            {typeMusique === 'youtube' ? (
              <>
                <input
                  type="text"
                  className="param_input"
                  placeholder="https://youtube.com/..."
                  value={lienYoutube}
                  onChange={(e) => setLienYoutube(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') validerYoutube(); }}
                />

                {idYoutubeApercu && (
                  <div className="choix_musique_apercu_ligne">
                    <MiniatureMusique
                      className="choix_musique_apercu_vignette"
                      iconeClassName="choix_musique_apercu_icone"
                      type="youtube"
                      thumbnail={`https://img.youtube.com/vi/${idYoutubeApercu}/hqdefault.jpg`}
                    />
                    <div className="choix_musique_apercu_details">
                      <span className="choix_musique_apercu_titre">Musique YouTube</span>
                      <span className="choix_musique_apercu_artiste">Aperçu de la miniature</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="salon_btn_valider_creation"
                  onClick={validerYoutube}
                >
                  Utiliser cette musique
                </button>
              </>
            ) : (
              <div className="salon_spotify_zone salon_spotify_zone--colonne">
                {!spotifyConnecte ? (
                  <button type="button" className="salon_btn_spotify" onClick={connecterSpotify}>
                    🎧 Connecter mon compte Spotify
                  </button>
                ) : (
                  <>
                    <input
                      type="text"
                      className="param_input"
                      placeholder="Rechercher un son sur Spotify..."
                      value={rechercheSpotify}
                      onChange={(e) => setRechercheSpotify(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') validerSpotify(); }}
                    />
                    <input
                      type="text"
                      className="param_input"
                      placeholder="Artiste (optionnel)"
                      value={artisteSpotify}
                      onChange={(e) => setArtisteSpotify(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') validerSpotify(); }}
                    />

                    {afficherApercuSpotify && (
                      <div className="choix_musique_apercu_ligne">
                        <MiniatureMusique
                          className="choix_musique_apercu_vignette"
                          iconeClassName="choix_musique_apercu_icone"
                          type="spotify"
                          thumbnail={null}
                        />
                        <div className="choix_musique_apercu_details">
                          <span className="choix_musique_apercu_titre">{rechercheSpotify}</span>
                          <span className="choix_musique_apercu_artiste">
                            {artisteSpotify.trim() || 'Artiste inconnu'}
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="salon_btn_valider_creation"
                      onClick={validerSpotify}
                    >
                      Utiliser cette musique
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalChoisirMusique;
