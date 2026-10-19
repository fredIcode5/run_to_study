import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessagesSquare, Plus, SendHorizontal, Square, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import ModalConfirmation from '../ui/ModalConfirmation';
import { LONGUEUR_MAX_MESSAGE } from './useChatIa';
import './ChatIa.css';

const HAUTEUR_MAX_SAISIE = 160;
const separerValeur = (valeur) => {
  const [fournisseur, ...reste] = valeur.split('::');
  return [fournisseur, reste.join('::')];
};

// Mise en forme légère des réponses (sans HTML injecté) : blocs ```code```,
// `code` en ligne et **gras** ; le reste garde ses retours à la ligne
const formaterEnLigne = (texte, cle) => texte.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g).map((morceau, i) => {
  if (/^`[^`]+`$/.test(morceau)) return <code key={`${cle}-${i}`} className="chat_ia_code">{morceau.slice(1, -1)}</code>;
  if (/^\*\*[^*]+\*\*$/.test(morceau)) return <strong key={`${cle}-${i}`}>{morceau.slice(2, -2)}</strong>;
  return morceau;
});

function ContenuMessage({ texte }) {
  return texte.split(/```/).map((bloc, i) => (i % 2 === 1
    ? <pre key={i} className="chat_ia_bloc_code"><code>{bloc.replace(/^[\w+-]*\n/, '')}</code></pre>
    : <React.Fragment key={i}>{formaterEnLigne(bloc, i)}</React.Fragment>));
}

// Pourquoi aucun modèle n'est proposé : clé absente, refusée, modèles payants masqués…
function ConfigurationManquante({ catalogue, onActualiser }) {
  const { fournisseurs } = catalogue;
  return (
    <div className="chat_ia_config">
      <p className="chat_ia_config_titre"><AlertTriangle size={15} /> Aucun modèle d'IA n'est utilisable pour l'instant.</p>
      {fournisseurs.length === 0 ? (
        <p>
          Aucune clé API n'est configurée. Ajoute par exemple <code className="chat_ia_code">GEMINI_API_KEY=…</code> (niveau
          gratuit, clé créée sur aistudio.google.com) dans le fichier <code className="chat_ia_code">.env</code> du projet, puis
          relance <code className="chat_ia_code">npm run dev</code>. Les autres fournisseurs possibles sont décrits dans <code className="chat_ia_code">.env.example</code>.
        </p>
      ) : (
        <ul className="chat_ia_config_liste">
          {fournisseurs.map((f) => (
            <li key={f.id}>
              <strong>{f.nom}</strong> : {f.erreur
                || (f.payantsMasques > 0
                  ? `seuls des modèles payants sont accessibles (${f.payantsMasques}) ; ils restent masqués tant que IA_MODELES_PAYANTS=true n'est pas défini.`
                  : 'aucun modèle reconnu pour cette clé.')}
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="chat_ia_btn" onClick={onActualiser}><RotateCcw size={13} /> Actualiser</button>
    </div>
  );
}

// --- Chat IA : conversation avec le modèle choisi parmi ceux que le serveur
// déclare configurés et utilisables. Le fournisseur et le niveau (gratuit ou
// payant) du modèle sont toujours affichés ; chaque réponse indique le modèle
// qui l'a rédigée. Les clés API ne transitent jamais par le navigateur.
function ChatIa({ chat }) {
  const {
    catalogue, chargerCatalogue, modeles, modeleChoisi, choisirModele,
    conversations, conversationActive, nouvelleConversation, choisirConversation, supprimerConversation,
    brouillon, setBrouillon, envoyer, reessayer, arreterGeneration, generation, erreur, erreurStockage,
  } = chat;
  const [listeOuverte, setListeOuverte] = useState(false);
  const [aSupprimer, setASupprimer] = useState(null);
  const finRef = useRef(null);
  const saisieRef = useRef(null);

  useEffect(() => {
    if (catalogue.etat === 'inactif') chargerCatalogue();
  }, [catalogue.etat, chargerCatalogue]);

  const enAttente = Boolean(generation && generation.conversationId === conversationActive?.id);
  const nbMessages = conversationActive?.messages.length ?? 0;

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' });
  }, [nbMessages, enAttente, erreur, conversationActive?.id]);

  // Zone de saisie qui grandit avec le texte, jusqu'à une hauteur maximale
  useLayoutEffect(() => {
    const zone = saisieRef.current;
    if (!zone) return;
    zone.style.height = 'auto';
    zone.style.height = `${Math.min(zone.scrollHeight, HAUTEUR_MAX_SAISIE)}px`;
  }, [brouillon]);

  const nomFournisseur = (id) => catalogue.fournisseurs.find((f) => f.id === id)?.nom || id;
  const nomModele = (fournisseur, id) => modeles.find((m) => m.fournisseur === fournisseur && m.id === id)?.nom || id;

  const gererTouche = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      envoyer();
    }
  };

  const fournisseursAvecModeles = catalogue.fournisseurs.filter((f) => f.modeles.length > 0);

  return (
    <div className="chat_ia">
      <div className="chat_ia_barre">
        <button
          type="button"
          className={`chat_ia_btn_icone${listeOuverte ? ' chat_ia_btn_icone--actif' : ''}`}
          onClick={() => setListeOuverte((o) => !o)}
          aria-expanded={listeOuverte}
          aria-label="Conversations enregistrées"
          title="Conversations enregistrées"
        >
          <MessagesSquare size={16} />
          {conversations.length > 0 && <span className="chat_ia_compte">{conversations.length}</span>}
        </button>

        <div className="chat_ia_selecteur">
          <select
            className="chat_ia_modele"
            value={modeleChoisi ? `${modeleChoisi.fournisseur}::${modeleChoisi.id}` : ''}
            onChange={(e) => choisirModele(...separerValeur(e.target.value))}
            disabled={!modeleChoisi}
            aria-label="Modèle d'IA"
          >
            {!modeleChoisi && <option value="">{catalogue.etat === 'chargement' ? 'Chargement des modèles…' : 'Aucun modèle disponible'}</option>}
            {fournisseursAvecModeles.map((f) => (
              <optgroup key={f.id} label={f.nom}>
                {f.modeles.map((m) => (
                  <option key={m.id} value={`${f.id}::${m.id}`}>
                    {m.nom} — {m.gratuit ? 'gratuit' : 'payant'}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {modeleChoisi && (
            <span className={`chat_ia_niveau${modeleChoisi.gratuit ? '' : ' chat_ia_niveau--payant'}`}>
              {modeleChoisi.nomFournisseur} · {modeleChoisi.gratuit ? 'niveau gratuit' : 'payant'}
            </span>
          )}
        </div>

        <button type="button" className="chat_ia_btn" onClick={nouvelleConversation} disabled={Boolean(generation)} title="Nouvelle conversation (les précédentes restent enregistrées)">
          <Plus size={14} /> Nouvelle
        </button>
      </div>

      <div className="chat_ia_corps">
        {listeOuverte && (
          <nav className="chat_ia_liste" aria-label="Conversations">
            {conversations.length === 0 ? (
              <p className="chat_ia_liste_vide">Aucune conversation enregistrée.</p>
            ) : (
              <ul>
                {conversations.map((c) => (
                  <li key={c.id} className={`chat_ia_liste_item${c.id === conversationActive?.id ? ' chat_ia_liste_item--active' : ''}`}>
                    <button
                      type="button"
                      className="chat_ia_liste_ouvrir"
                      onClick={() => { choisirConversation(c.id); setListeOuverte(false); }}
                      disabled={Boolean(generation)}
                    >
                      <span className="chat_ia_liste_titre">{c.titre}</span>
                      <span className="chat_ia_liste_meta">
                        {new Date(c.dateModification).toLocaleDateString()} · {c.modele ? nomModele(c.fournisseur, c.modele) : '—'}
                      </span>
                    </button>
                    <button type="button" className="chat_ia_liste_suppr" onClick={() => setASupprimer(c)} aria-label={`Supprimer « ${c.titre} »`} title="Supprimer la conversation">
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        )}

        <div className="chat_ia_messages" role="log" aria-live="polite">
          {catalogue.etat === 'erreur' && (
            <div className="chat_ia_config">
              <p className="chat_ia_config_titre"><AlertTriangle size={15} /> {catalogue.erreur}</p>
              <button type="button" className="chat_ia_btn" onClick={chargerCatalogue}><RotateCcw size={13} /> Réessayer</button>
            </div>
          )}
          {catalogue.etat === 'pret' && modeles.length === 0 && (
            <ConfigurationManquante catalogue={catalogue} onActualiser={chargerCatalogue} />
          )}

          {!conversationActive && modeles.length > 0 && (
            <div className="chat_ia_accueil">
              <p className="chat_ia_accueil_titre">Nouvelle conversation</p>
              <p>Pose une question à {modeleChoisi?.nom}. Tu peux changer de modèle à tout moment sans perdre la conversation.</p>
            </div>
          )}

          {conversationActive?.messages.map((m) => (
            <div key={m.id} className={`chat_ia_message chat_ia_message--${m.role}`}>
              <div className="chat_ia_bulle"><ContenuMessage texte={m.contenu} /></div>
              {m.role === 'assistant' && (
                <span className="chat_ia_meta">
                  {nomFournisseur(m.fournisseur)} · {nomModele(m.fournisseur, m.modele)}
                  {m.tronquee && ' · réponse tronquée (limite de longueur)'}
                </span>
              )}
            </div>
          ))}

          {enAttente && (
            <div className="chat_ia_message chat_ia_message--assistant">
              <div className="chat_ia_bulle chat_ia_attente" aria-label="Réponse en cours de rédaction">
                <span /><span /><span />
              </div>
              <span className="chat_ia_meta">{modeleChoisi?.nom} rédige sa réponse…</span>
            </div>
          )}

          {erreur && !enAttente && (
            <div className={`chat_ia_erreur${erreur.code === 'arret' ? ' chat_ia_erreur--info' : ''}`} role="alert">
              <span>{erreur.message}</span>
              {conversationActive?.messages.at(-1)?.role === 'user' && (
                <button type="button" className="chat_ia_btn" onClick={reessayer} disabled={!modeleChoisi}>
                  <RotateCcw size={13} /> Réessayer
                </button>
              )}
            </div>
          )}
          <div ref={finRef} />
        </div>
      </div>

      {erreurStockage && <p className="chat_ia_stockage" role="status">{erreurStockage}</p>}

      <form className="chat_ia_saisie" onSubmit={(e) => { e.preventDefault(); envoyer(); }}>
        <textarea
          ref={saisieRef}
          className="chat_ia_champ"
          value={brouillon}
          onChange={(e) => setBrouillon(e.target.value)}
          onKeyDown={gererTouche}
          placeholder={modeleChoisi ? `Message à ${modeleChoisi.nom}…` : 'Aucun modèle disponible'}
          rows={1}
          maxLength={LONGUEUR_MAX_MESSAGE}
          disabled={!modeleChoisi}
          aria-label="Message"
        />
        {generation ? (
          <button type="button" className="chat_ia_envoyer chat_ia_envoyer--arret" onClick={arreterGeneration} aria-label="Arrêter la génération" title="Arrêter">
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button type="submit" className="chat_ia_envoyer" disabled={!brouillon.trim() || !modeleChoisi} aria-label="Envoyer" title="Envoyer (Entrée)">
            <SendHorizontal size={16} />
          </button>
        )}
      </form>
      <p className="chat_ia_aide">Entrée : envoyer · Maj+Entrée : nouvelle ligne · Quotas gratuits selon le fournisseur</p>

      {createPortal(
        <ModalConfirmation
          ouvert={Boolean(aSupprimer)}
          message={`Supprimer la conversation « ${aSupprimer?.titre ?? ''} » ?`}
          libelleConfirmer="Supprimer"
          onConfirmer={() => { supprimerConversation(aSupprimer.id); setASupprimer(null); }}
          onAnnuler={() => setASupprimer(null)}
        />,
        document.body
      )}
    </div>
  );
}

export default ChatIa;
