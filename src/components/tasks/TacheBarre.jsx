import React from 'react';
import { useState, useEffect, useRef } from 'react';
import TacheTag from './TacheTag';


// Barre supérieure commune à la carte et à la modale : tags + date d'échéance
function TacheBarre({ tags, onAjouterTag, onSupprimerTag, dateEcheance, onModifierDate }) {
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [valeurTag, setValeurTag] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (ajoutOuvert) inputRef.current?.focus();
  }, [ajoutOuvert]);

  const validerTag = () => {
    const texte = valeurTag.trim();
    if (texte) onAjouterTag(texte);
    setValeurTag('');
    setAjoutOuvert(false);
  };

  return (
    <div className="todo_carte_barre" onClick={(e) => e.stopPropagation()}>
      <div className="todo_tags">
        {tags.map((tag, i) => (
          <TacheTag key={`${tag}-${i}`} texte={tag} onSupprimer={() => onSupprimerTag(i)} />
        ))}

        {ajoutOuvert ? (
          <input
            ref={inputRef}
            type="text"
            className="todo_tag_input"
            value={valeurTag}
            maxLength={20}
            placeholder="Nouveau tag"
            onChange={(e) => setValeurTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') validerTag();
              if (e.key === 'Escape') { setValeurTag(''); setAjoutOuvert(false); }
            }}
            onBlur={validerTag}
          />
        ) : (
          <button
            type="button"
            className="todo_tag_ajouter"
            onClick={() => setAjoutOuvert(true)}
            aria-label="Ajouter un tag"
          >
            + tag
          </button>
        )}
      </div>

      <input
        type="date"
        className="todo_date"
        value={dateEcheance || ''}
        onChange={(e) => onModifierDate(e.target.value)}
        aria-label="Date d'échéance"
      />
    </div>
  );
}

export default TacheBarre;
