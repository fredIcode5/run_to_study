import React from 'react';
import { useState, useRef } from 'react';


function OngletMonRunner() {
  const DEFAULT_COLORS = {
    '--couleur-chaussure': '#f4f6fb',
    '--couleur-chaussure-blanc': '#ffffff',
    '--couleur-chaussure-fonce': '#ffffff',
    '--couleur-bras': '#2563eb',
    '--couleur-jambes': '#e84c9d',
    '--couleur-mains': '#2563eb',
    '--couleur-torse': '#000000',
    '--couleur-fessier': '#e84c9d',
    '--couleur-tete': '#2563eb',
    '--couleur-visage': '#050505',
  };

  const CATEGORIES = [
    {
      id: 'peau',
      label: 'Couleur de peau',
      vars: ['--couleur-tete', '--couleur-bras', '--couleur-mains']
    },
    {
      id: 'chaussures',
      label: 'Chaussures',
      vars: ['--couleur-chaussure', '--couleur-chaussure-blanc', '--couleur-chaussure-fonce']
    },
    {
      id: 'bas',
      label: 'Bas du corps',
      vars: ['--couleur-jambes', '--couleur-fessier']
    },
    {
      id: 'tshirt',
      label: 'Tee-shirt',
      vars: ['--couleur-torse']
    },
    {
      id: 'visage',
      label: 'Visage',
      vars: ['--couleur-visage']
    }
  ];

  const iframeRef = useRef(null);
  const [colors, setColors] = useState(() => {
    const saved = localStorage.getItem('runnerColors');
    return saved ? JSON.parse(saved) : DEFAULT_COLORS;
  });
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [hideRunner, setHideRunner] = useState(() => {
    return localStorage.getItem('hideRunner') === 'true';
  });

  const handleCategoryChange = (category, value) => {
    const newColors = { ...colors };
    category.vars.forEach(v => {
      newColors[v] = value;
    });
    setColors(newColors);

    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'UPDATE_RUNNER_COLORS', colors: newColors },
        '*'
      );
    }
  };

  const handleSave = () => {
    localStorage.setItem('runnerColors', JSON.stringify(colors));
    localStorage.setItem('hideRunner', hideRunner);
    window.dispatchEvent(new Event('runnerVisibilityChanged'));
    
    const iframes = document.querySelectorAll('iframe.coureur_defilant, iframe.mon_runner_iframe');
    iframes.forEach(iframe => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          { type: 'UPDATE_RUNNER_COLORS', colors: colors },
          '*'
        );
      }
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  return (
    <div className="profil_onglet_panneau mon_runner_onglet">
      <div className="mon_runner_layout">
        <div className="mon_runner_apercu">
          <iframe
            ref={iframeRef}
            src="/runner.html"
            title="Aperçu du runner"
            className="mon_runner_iframe"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
        <div className="mon_runner_editeur">
          <h3 className="mon_runner_titre">Personnalise ton coureur</h3>
          <div className="mon_runner_colors_list">
            {CATEGORIES.map(category => {
              // La couleur affichée pour la catégorie est celle de sa première variable CSS
              const categoryColor = colors[category.vars[0]] || '#000000';
              return (
                <div key={category.id} className="mon_runner_color_item">
                  <label htmlFor={category.id}>{category.label}</label>
                  <div className="mon_runner_color_picker_wrap">
                    <input
                      type="color"
                      id={category.id}
                      value={categoryColor}
                      onChange={(e) => handleCategoryChange(category, e.target.value)}
                    />
                    <span className="mon_runner_color_valeur">{categoryColor.toUpperCase()}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mon_runner_options" style={{ marginTop: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="hideRunnerToggle" style={{ fontSize: '1.1rem', color: '#1f2937', fontWeight: '500', cursor: 'pointer' }}>
              Masquer le coureur (fond d'écran)
            </label>
            <input 
              type="checkbox" 
              id="hideRunnerToggle"
              checked={hideRunner}
              onChange={(e) => setHideRunner(e.target.checked)}
              style={{ transform: 'scale(1.5)', cursor: 'pointer', marginLeft: '5px' }}
            />
          </div>
          <button type="button" className="btn_primaire mon_runner_btn_save" onClick={handleSave}>
            {savedFeedback ? 'Enregistré ✓' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OngletMonRunner;
