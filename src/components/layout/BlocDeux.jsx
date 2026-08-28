import React from 'react';
import { SquarePen } from 'lucide-react';
import Note from '../tasks/Note';
import Salon_course from '../social/Salon_course';
import Param from '../settings/Param';

const ONGLETS_POIGNEE = [
  { id: 1, icone: <SquarePen size={18} />, label: 'Notes', notif: true },
  { id: 2, icone: '⚙️', label: 'Réglages', notif: true },
  { id: 3, icone: '🏁', label: 'Salon de course', notif: true },
];


// BlocDeux relaie les props "fond" et "réglages Pomodoro" vers Param,
// et les props des tâches/notes vers Note
function BlocDeux({
  ouvert,
  setOuvert,
  couleurFondInput,
  setCouleurFondInput,
  onAppliquerCouleur,
  onChangerImage,
  imageFondActuelle,
  reglages,
  onChangerDuree,
  onChangerCouleur,
  onReinitialiserReglages,
  taches,
  ajouterTache,
  actionsPourTache,
  definirOrdreTache,
  reinitialiserOrdreTaches,
  viderTaches,
  pointsPomodoro,
  modeLectureSession,
  setModeLectureSession,
  musiqueActuelle,
  onOuvrirChoixMusique,
  onSupprimerMusique,
  onOuvrirBoutique,
  onSessionEnLigneChange,
  sessionEnLigne,
  prereglages,
  onAppliquerPrereglage,
  onOuvrirRenommagePrereglage,
  onDemanderSuppressionPrereglage,
  onRemplacerPrereglage,
  onMettreAJourPrereglage,
  onOuvrirCreationPrereglage,
  vueActive,
  setVueActive,
  sessionConsulteeApp,
  setSessionConsulteeApp,
  sessionsSauvegardees,
  setSessionsSauvegardees,
  sessionsChargeesPourRef,
  remplacerTachesActives,
  titreSession,
  setTitreSession,
  numeroSession
}) {

  const choisirOnglet = (id) => {
    setVueActive(id);
    if (!ouvert) setOuvert(true);
  };

  return (
    <div className={`panel ${ouvert ? '' : 'panel--collapsed'}`}>
      <div className="panel_poignee">
        <button
          className="poignee_toggle"
          onClick={() => setOuvert(!ouvert)}
          aria-label={ouvert ? 'Réduire le panneau' : 'Ouvrir le panneau'}
        >
          {ouvert ? '›' : '‹'}
        </button>

        <div className="poignee_carres">
          {ONGLETS_POIGNEE.map((onglet) => (
            <button
              key={onglet.id}
              className={`poignee_carre ${vueActive === onglet.id ? 'actif' : ''}`}
              onClick={() => choisirOnglet(onglet.id)}
              aria-label={onglet.label}
              title={onglet.label}
            >
              <span className="poignee_carre_icone">{onglet.icone}</span>
              {onglet.notif && <span className="poignee_notif" aria-hidden="true"></span>}
            </button>
          ))}
        </div>
      </div>

      <div className="panel_corps">
        <div className="panel_controles">
          <button className={vueActive === 1 ? 'actif' : ''} onClick={() => setVueActive(1)}>Notes</button>
          <button className={vueActive === 2 ? 'actif' : ''} onClick={() => setVueActive(2)}>Mon Pomodoro</button>
          <button className={vueActive === 3 ? 'actif' : ''} onClick={() => setVueActive(3)}>Salon de course</button>
        </div>

        <div className="panel_contenu">
          <div style={{ display: vueActive === 1 ? 'flex' : 'none', width: '100%', height: '100%', flexDirection: 'column' }}>
            <Note
              taches={taches}
              ajouterTache={ajouterTache}
              actionsPour={actionsPourTache}
              definirOrdreTache={definirOrdreTache}
              reinitialiserOrdre={reinitialiserOrdreTaches}
              viderTaches={viderTaches}
              pointsPomodoro={pointsPomodoro}
              modeLecture={modeLectureSession}
              setModeLecture={setModeLectureSession}
              sessionConsultee={sessionConsulteeApp}
              setSessionConsultee={setSessionConsulteeApp}
              sessionsSauvegardees={sessionsSauvegardees}
              setSessionsSauvegardees={setSessionsSauvegardees}
              sessionsChargeesPourRef={sessionsChargeesPourRef}
              remplacerTachesActives={remplacerTachesActives}
              titreSession={titreSession}
              setTitreSession={setTitreSession}
              numeroSession={numeroSession}
            />
          </div>
          <div style={{ display: vueActive === 2 ? 'block' : 'none', width: '100%', height: '100%' }}>
            <Param
              couleurFondInput={couleurFondInput}
              setCouleurFondInput={setCouleurFondInput}
              onAppliquerCouleur={onAppliquerCouleur}
              onChangerImage={onChangerImage}
              imageFondActuelle={imageFondActuelle}
              reglages={reglages}
              onChangerDuree={onChangerDuree}
              onChangerCouleur={onChangerCouleur}
              onReinitialiserReglages={onReinitialiserReglages}
              musiqueActuelle={musiqueActuelle}
              onOuvrirChoixMusique={onOuvrirChoixMusique}
              onSupprimerMusique={onSupprimerMusique}
              prereglages={prereglages}
              onAppliquerPrereglage={onAppliquerPrereglage}
              onOuvrirRenommagePrereglage={onOuvrirRenommagePrereglage}
              onDemanderSuppressionPrereglage={onDemanderSuppressionPrereglage}
              onRemplacerPrereglage={onRemplacerPrereglage}
              onMettreAJourPrereglage={onMettreAJourPrereglage}
              onOuvrirCreationPrereglage={onOuvrirCreationPrereglage}
              sessionEnLigne={sessionEnLigne}
            />
          </div>
          <div style={{ display: vueActive === 3 ? 'flex' : 'none', width: '100%', height: '100%', flexDirection: 'column' }}>
            <Salon_course 
              reglages={reglages} 
              imageFondActuelle={imageFondActuelle} 
              musiqueActuelle={musiqueActuelle} 
              onOuvrirBoutique={onOuvrirBoutique}
              onSessionEnLigneChange={onSessionEnLigneChange}
              pointsPomodoro={pointsPomodoro}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlocDeux;
