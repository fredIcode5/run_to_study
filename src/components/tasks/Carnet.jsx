import React, { useState, useEffect, useRef } from 'react';
import { Pin, Trash2, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import './Carnet.css';

export default function Carnet({
  ouvert,
  fermer,
  taches = [],
  actionsPourTache,
  initialPosition = { x: 80, y: 220 }
}) {
  const [indexActuel, setIndexActuel] = useState(0);
  const [position, setPosition] = useState(initialPosition);
  const conteneurRef = useRef(null);
  const decalageRef = useRef({ x: 0, y: 0 });
  const enTrainDeGlisser = useRef(false);

  // Tri des notes selon leur numéro d'ordre (ordre croissant)
  const notesTriees = taches
    .slice()
    .sort((a, b) => (a.ordre ?? Infinity) - (b.ordre ?? Infinity));

  // Ajustement de l'index si la liste change
  useEffect(() => {
    if (indexActuel >= notesTriees.length && notesTriees.length > 0) {
      setIndexActuel(notesTriees.length - 1);
    }
  }, [notesTriees.length, indexActuel]);

  // Gestion du glisser-déposer pour déplacer le carnet sur l'espace de travail
  useEffect(() => {
    const gererDeplacement = (e) => {
      if (!enTrainDeGlisser.current) return;
      const marge = 10;
      const largeur = conteneurRef.current?.offsetWidth || 288;
      const hauteur = conteneurRef.current?.offsetHeight || 250;

      let x = e.clientX - decalageRef.current.x;
      let y = e.clientY - decalageRef.current.y;

      x = Math.min(Math.max(x, marge), window.innerWidth - largeur - marge);
      y = Math.min(Math.max(y, marge), window.innerHeight - hauteur - marge);

      setPosition({ x, y });
    };

    const terminerDrag = () => {
      enTrainDeGlisser.current = false;
    };

    document.addEventListener('pointermove', gererDeplacement);
    document.addEventListener('pointerup', terminerDrag);
    return () => {
      document.removeEventListener('pointermove', gererDeplacement);
      document.removeEventListener('pointerup', terminerDrag);
    };
  }, []);

  const demarrerDrag = (e) => {
    if (e.target.closest('button') || e.target.closest('textarea') || e.target.closest('input')) return;
    e.preventDefault();
    enTrainDeGlisser.current = true;
    decalageRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  if (!ouvert) return null;

  const totalNotes = taches.length;
  const notesTerminees = taches.filter((t) => t.terminee).length;

  const allerPrecedent = () => {
    setIndexActuel((prev) => Math.max(0, prev - 1));
  };

  const allerSuivant = () => {
    setIndexActuel((prev) => Math.min(notesTriees.length - 1, prev + 1));
  };

  return (
    <div
      ref={conteneurRef}
      className="carnet_widget"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {/* En-tête du carnet : Bouton Précédent (gauche), Barre de progression (centre), Bouton Suivant & Fermer (droite) */}
      <div className="carnet_entete" onPointerDown={demarrerDrag}>
        {/* Navigation : Bouton Précédent en haut à gauche */}
        <button
          type="button"
          className="carnet_entete_nav_btn"
          onClick={(e) => {
            e.stopPropagation();
            allerPrecedent();
          }}
          disabled={indexActuel <= 0 || notesTriees.length <= 1}
          title="Note précédente"
          aria-label="Note précédente"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Barre de progression des tâches terminées au centre */}
        <div className="carnet_entete_progression" title={`${notesTerminees} sur ${totalNotes} notes terminées`}>
          <div className="carnet_entete_progression_infos">
            <span className="carnet_progression_compteur_badge">
              <strong>{notesTerminees}</strong> / {totalNotes}
            </span>
            <span className="carnet_progression_label">
              terminées
            </span>
            {totalNotes > 0 && (
              <span className="carnet_progression_pourcentage">
                {Math.round((notesTerminees / totalNotes) * 100)}%
              </span>
            )}
          </div>
          <div className="carnet_entete_barre_piste">
            <div
              className="carnet_entete_barre_remplissage"
              style={{ width: `${totalNotes > 0 ? (notesTerminees / totalNotes) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Actions à droite : Bouton Suivant en haut à droite + Bouton Fermer */}
        <div className="carnet_entete_droite">
          <button
            type="button"
            className="carnet_entete_nav_btn"
            onClick={(e) => {
              e.stopPropagation();
              allerSuivant();
            }}
            disabled={indexActuel >= notesTriees.length - 1 || notesTriees.length <= 1}
            title="Note suivante"
            aria-label="Note suivante"
          >
            <ChevronRight size={14} />
          </button>

          <button
            type="button"
            className="carnet_btn_fermer"
            onClick={(e) => {
              e.stopPropagation();
              fermer();
            }}
            title="Fermer le carnet"
            aria-label="Fermer le carnet"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Pile de notes empilées */}
      <div className="carnet_pile_conteneur">
        {notesTriees.length === 0 ? (
          <div className="carnet_carte_vide">
            <p>Aucune note dans cette session.</p>
            <span>Ajoutez des notes depuis le panneau pour les retrouver ici.</span>
          </div>
        ) : (
          notesTriees.map((tache, index) => {
            const diff = index - indexActuel;
            const estActif = diff === 0;
            const actions = actionsPourTache?.(tache.id) || {};

            // Calcul du style d'empilement
            let styleEmpilement = {};
            if (diff < 0) {
              styleEmpilement = {
                transform: 'translateX(-120%) rotate(-12deg) scale(0.9)',
                opacity: 0,
                pointerEvents: 'none',
                zIndex: 1,
              };
            } else if (diff === 0) {
              styleEmpilement = {
                transform: 'translate(0, 0) rotate(0deg) scale(1)',
                opacity: 1,
                zIndex: 10,
                pointerEvents: 'auto',
              };
            } else if (diff === 1) {
              styleEmpilement = {
                transform: 'translate(8px, 10px) rotate(2deg) scale(0.96)',
                opacity: 0.78,
                zIndex: 9,
                pointerEvents: 'none',
              };
            } else if (diff === 2) {
              styleEmpilement = {
                transform: 'translate(16px, 20px) rotate(-1.5deg) scale(0.92)',
                opacity: 0.52,
                zIndex: 8,
                pointerEvents: 'none',
              };
            } else {
              styleEmpilement = {
                transform: 'translate(24px, 30px) rotate(1deg) scale(0.88)',
                opacity: 0.22,
                zIndex: 7,
                pointerEvents: 'none',
              };
            }

            return (
              <div
                key={tache.id}
                className={`carnet_carte ${tache.terminee ? 'carnet_carte--terminee' : ''} ${estActif ? 'carnet_carte--active' : ''}`}
                style={styleEmpilement}
              >
                {/* En-tête de la carte : uniquement la date d'échéance si définie */}
                <div className="carnet_carte_entete">
                  {tache.dateEcheance ? (
                    <span className="carnet_note_date">{tache.dateEcheance}</span>
                  ) : <span className="carnet_carte_entete_spacer" />}
                </div>

                {/* Contenu de la note */}
                <textarea
                  className="carnet_carte_contenu"
                  value={tache.contenu || ''}
                  onChange={(e) => actions.modifierContenu?.(e.target.value)}
                  placeholder="Écris ta tâche..."
                  disabled={!estActif}
                />

                {/* Actions en bas de la carte : boutons Épingler, Supprimer et Terminer */}
                <div className="carnet_carte_actions_bas">
                  <button
                    type="button"
                    className="carnet_btn_epingler"
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.epingler?.();
                    }}
                    title="Épingler sur le fond"
                  >
                    <Pin size={13} />
                  </button>

                  <div className="carnet_carte_actions_droite">
                    <button
                      type="button"
                      className="carnet_btn_supprimer"
                      onClick={(e) => {
                        e.stopPropagation();
                        actions.supprimer?.();
                      }}
                      title="Supprimer la note"
                    >
                      <Trash2 size={13} />
                      <span>Supprimer</span>
                    </button>

                    <button
                      type="button"
                      className={`carnet_btn_terminer ${tache.terminee ? 'carnet_btn_terminer--actif' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        actions.toggleTerminee?.();
                      }}
                    >
                      <Check size={13} />
                      <span>{tache.terminee ? 'Terminé' : 'Terminer'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
