import React from 'react';

function CarteAmi({ ami, onRejoindre, onInviter }) {
  const photoSrc = ami.photo?.dataUrl || ami.photo;
  return (
    <div className="ami_carte">
      <div className="ami_carte_gauche">
        <div className="ami_avatar">
          {photoSrc && typeof photoSrc === 'string' ? (
            <img src={photoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : '🧑'}
        </div>
        <span className="ami_pseudo">{ami.pseudo}</span>
      </div>
      <div className="ami_carte_droite">
        {ami.enSession ? (
          <button className="ami_btn_rejoindre" onClick={() => onRejoindre(ami.codeSession)}>Rejoindre</button>
        ) : (
          <span style={{ fontSize: '0.8rem', color: 'var(--dc-text-muted, #80848e)', marginRight: '8px' }}>Pas en ligne</span>
        )}
        <button className="ami_btn_inviter" onClick={() => onInviter(ami)}>Inviter</button>
      </div>
    </div>
  );
}

export default CarteAmi;
