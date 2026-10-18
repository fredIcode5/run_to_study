import React from 'react';
import { X } from 'lucide-react';

// --- Footer de la vitrine d'accueil : identité de l'appli, liens légaux,
// réseaux sociaux (placeholders) et mention de copyright.
function PiedDePage() {
  const anneeActuelle = new Date().getFullYear();

  const RESEAUX_SOCIAUX_PLACEHOLDER = [
    { id: 'instagram', label: 'Instagram', href: '#' },
    { id: 'twitter', label: 'X / Twitter', href: '#' },
    { id: 'tiktok', label: 'TikTok', href: '#' },
  ];

  return (
    <footer className="site_footer">
      <div className="site_footer_contenu">

        <div className="site_footer_bloc site_footer_identite">
          <span className="site_footer_logo">🍅 Pomodoro</span>
          <p className="site_footer_signature">Made with ❤️ by Pomodoro Team</p>
        </div>

        <nav className="site_footer_bloc site_footer_liens" aria-label="Liens légaux">
          <a href="#" className="site_footer_lien">Contact</a>
          <a href="#" className="site_footer_lien">Terms of Service</a>
          <a href="#" className="site_footer_lien">Privacy Policy</a>
        </nav>

        <div className="site_footer_bloc site_footer_reseaux">
          {RESEAUX_SOCIAUX_PLACEHOLDER.map((reseau) => (
            <a key={reseau.id} href={reseau.href} className="site_footer_lien_reseau">
              {reseau.label}
            </a>
          ))}
        </div>

      </div>

      <p className="site_footer_copyright">
        © {anneeActuelle} Pomodoro Team. Tous droits réservés.
      </p>
    </footer>
  );
}

export default PiedDePage;
