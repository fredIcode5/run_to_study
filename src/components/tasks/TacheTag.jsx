import React from 'react';

// Petit chip visuel représentant un tag, avec bouton de suppression
function TacheTag({ texte, onSupprimer }) {
  return (
    <span className="todo_tag">
      {texte}
      <button
        type="button"
        className="todo_tag_suppr"
        onClick={onSupprimer}
        aria-label={`Supprimer le tag ${texte}`}
      >
        ×
      </button>
    </span>
  );
}

export default TacheTag;
