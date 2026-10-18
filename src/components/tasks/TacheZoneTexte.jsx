import React from 'react';
import { useEffect, useRef } from 'react';


// Zone de texte qui s'agrandit automatiquement selon son contenu
function TacheZoneTexte({ className, valeur, onChange, placeholder, autoFocus }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [valeur]);

  return (
    <textarea
      ref={ref}
      className={className}
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export default TacheZoneTexte;
