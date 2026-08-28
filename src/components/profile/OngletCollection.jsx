import React, { useState } from 'react';

// Onglet Collection :
// - À gauche : Div rectangulaire pour afficher le contenu de la case sélectionnée
// - À droite : En-tête "Collection 0 sur 25" et grille des 25 carrés gris
function OngletCollection() {
  const NOMBRE_ITEMS = 25;
  const items = Array.from({ length: NOMBRE_ITEMS });
  const [indexSelectionne, setIndexSelectionne] = useState(null);

  return (
    <div className="profil_onglet_panneau collection_onglet">
      <div className="collection_layout">
        {/* Colonne GAUCHE : Div rectangulaire pour afficher le contenu sélectionné */}
        <div className="collection_colonne_gauche">
          <div className="collection_apercu_rect">
            {indexSelectionne !== null ? (
              <div className="collection_apercu_contenu">
                <div className="collection_apercu_cadre_visuel">
                  <span className="collection_apercu_icone">📦</span>
                </div>
                <div className="collection_apercu_infos">
                  <span className="collection_apercu_badge">Emplacement #{indexSelectionne + 1}</span>
                  <h4 className="collection_apercu_titre">Objet non débloqué</h4>
                  <p className="collection_apercu_desc">
                    Cet emplacement est actuellement vide. Complète tes sessions de travail pour débloquer de nouveaux éléments de collection.
                  </p>
                </div>
              </div>
            ) : (
              <div className="collection_apercu_vide">
                <span className="collection_apercu_vide_icone">🔍</span>
                <h4 className="collection_apercu_vide_titre">Aperçu de la collection</h4>
                <p className="collection_apercu_vide_texte">
                  Sélectionne l'un des carrés à droite pour afficher son contenu détaillé.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Colonne DROITE : Titre, compteur et grille de 25 carrés */}
        <div className="collection_colonne_droite">
          <div className="collection_header">
            <div className="collection_titre_wrap">
              <h3 className="collection_titre">Collection</h3>
              <span className="collection_compteur">0 sur 25</span>
            </div>
          </div>

          <div className="collection_grille">
            {items.map((_, index) => (
              <button
                type="button"
                key={index}
                className={`collection_item_carre ${indexSelectionne === index ? 'collection_item_carre--actif' : ''}`}
                onClick={() => setIndexSelectionne(index)}
                aria-label={`Emplacement ${index + 1}`}
                title={`Emplacement ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OngletCollection;
