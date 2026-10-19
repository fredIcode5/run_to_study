import React from 'react';
import { useState } from 'react';
import { UserPlus, LogIn, Flag, Check, Plus, X } from 'lucide-react';
import { ORIGINES_JOUEUR, idJoueurAmi } from './joueursFictifs';

// Les trois actions du salon, communes aux boutons de test et aux boutons définitifs
const ACTIONS_SALON = [
  { id: 'amis', label: 'Ajouter des amis', Icone: UserPlus },
  { id: 'rejoindre', label: 'Rejoindre', Icone: LogIn },
  { id: 'marathon', label: 'Marathon', Icone: Flag },
];

// --- Salon de course (version de test) :
//  1. boutons de test, qui ajoutent des joueurs fictifs sur la Piste de course
//  2. liste d'amis de test (ouverte par « Ajouter des amis »)
//  3. coureurs actuellement sur la piste, et opacité de la ligne sous leurs pieds
//  4. boutons définitifs du futur multijoueur, visibles mais désactivés
// salonCourse : état partagé avec la piste et le compteur (voir useSalonCourse)
function Salon_course({ salonCourse, opaciteLigne, onChangerOpaciteLigne }) {
  const { joueurs, compteur, retirerJoueur, viderPiste, test } = salonCourse;
  const [amisVisibles, setAmisVisibles] = useState(false);
  const idsSurPiste = new Set(joueurs.map((j) => j.id));
  const opacitePct = Math.round(opaciteLigne * 100);
  const changerOpacitePct = (valeur) => onChangerOpaciteLigne(Number(valeur) / 100);

  const actionsTest = {
    amis: () => setAmisVisibles((visibles) => !visibles),
    rejoindre: test.rejoindre,
    marathon: test.marathon,
  };

  return (
    <div className="salon_course">
      <div className="salon_bloc">
        <h3 className="salon_bloc_titre">Joueurs fictifs <span className="salon_badge">test</span></h3>
        <div className="salon_entete_actions salon_boutons" role="group" aria-label="Boutons de test">
          {ACTIONS_SALON.map(({ id, label, Icone }) => (
            <button
              key={id}
              type="button"
              className={`salon_btn_action${id === 'amis' && amisVisibles ? ' actif' : ''}`}
              onClick={actionsTest[id]}
              aria-expanded={id === 'amis' ? amisVisibles : undefined}
            >
              <Icone size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {amisVisibles && (
        <div className="salon_bloc">
          <h3 className="salon_bloc_titre">Amis <span className="salon_badge">données de test</span></h3>
          <ul className="salon_liste_joueurs">
            {test.amis.map((ami) => {
              const present = idsSurPiste.has(idJoueurAmi(ami));
              return (
                <li key={ami.amiId}>
                  <button
                    type="button"
                    className={`salon_ami_test${present ? ' salon_ami_test--present' : ''}`}
                    aria-pressed={present}
                    onClick={() => test.basculerAmi(ami)}
                  >
                    <span className="salon_pastille" style={{ background: ami.couleur }} />
                    <span className="salon_joueur_nom">{ami.pseudo}</span>
                    {present ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="salon_bloc">
        <div className="salon_bloc_entete">
          <h3 className="salon_bloc_titre">Sur la piste <span className="salon_badge">{compteur.nombre}</span></h3>
          {joueurs.length > 0 && (
            <button type="button" className="salon_lien" onClick={viderPiste}>Tout retirer</button>
          )}
        </div>
        <ul className="salon_liste_joueurs">
          <li className="salon_joueur">
            <span className="salon_pastille salon_pastille--vous" />
            <span className="salon_joueur_nom">Vous</span>
            <span className="salon_joueur_origine">Votre coureur</span>
          </li>
          {joueurs.map((joueur) => (
            <li key={joueur.id} className="salon_joueur">
              <span className="salon_pastille" style={{ background: joueur.couleur }} />
              <span className="salon_joueur_nom">{joueur.nom}</span>
              <span className="salon_joueur_origine">{ORIGINES_JOUEUR[joueur.origine]}</span>
              <button
                type="button"
                className="salon_joueur_retirer"
                onClick={() => retirerJoueur(joueur.id)}
                aria-label={`Retirer ${joueur.nom} de la piste`}
                title="Retirer de la piste"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
        <p className="salon_aide">
          {joueurs.length > 0
            ? 'Faites glisser les coureurs à côté du chrono pour réorganiser le peloton.'
            : 'Ajoutez des joueurs fictifs avec les boutons de test.'}
        </p>
      </div>

      <div className="salon_bloc">
        <label className="salon_bloc_titre" htmlFor="salon-opacite-ligne">Ligne sous les coureurs</label>
        <div className="encouragements_reglage_ligne">
          <input
            id="salon-opacite-ligne"
            type="range"
            className="encouragements_curseur"
            min={0}
            max={100}
            step={5}
            value={opacitePct}
            onChange={(e) => changerOpacitePct(e.target.value)}
            aria-label="Opacité de la ligne sous les coureurs"
          />
          <span className="encouragements_reglage_valeur">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={opacitePct}
              onChange={(e) => e.target.value !== '' && changerOpacitePct(e.target.value)}
              aria-label="Opacité de la ligne sous les coureurs (%)"
            />
            %
          </span>
        </div>
        <p className="salon_aide">Les tirets défilent quand les coureurs courent. 0 % : ligne masquée.</p>
      </div>

      <hr className="salon_separateur" />

      {/* Boutons définitifs : aucun gestionnaire, ils seront branchés au multijoueur */}
      <div className="salon_bloc">
        <h3 className="salon_bloc_titre">Multijoueur <span className="salon_badge">bientôt</span></h3>
        <div className="salon_entete_actions salon_boutons salon_boutons--bientot" role="group" aria-label="Multijoueur, bientôt disponible">
          {ACTIONS_SALON.map(({ id, label, Icone }) => (
            <button key={id} type="button" className="salon_btn_action" disabled title="Bientôt disponible">
              <Icone size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Salon_course;
