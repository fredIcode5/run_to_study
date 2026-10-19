import React from 'react';
import { SquarePen, Headphones, Timer, Users, FolderOpen } from 'lucide-react';
import Note from '../tasks/Note';
import Salon_course from '../social/Salon_course';
import Param from '../settings/Param';
import OngletAmbiance from '../ambiance/OngletAmbiance';
import SectionDocuments from '../documents/SectionDocuments';
import BoutonModeConcentration from '../ui/BoutonModeConcentration';
import './BlocDeux.css';

const ONGLETS_POIGNEE = [
  { id: 1, icone: <SquarePen size={18} />, label: 'Notes', notif: true },
  { id: 2, icone: <Timer size={18} />, label: 'Mon Pomodoro', notif: true },
  { id: 3, icone: <Users size={18} />, label: 'Salon de course', notif: true },
  { id: 4, icone: <Headphones size={18} />, label: 'Ambiance', notif: true },
  { id: 5, icone: <FolderOpen size={18} />, label: 'Documents', notif: false },
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
  onMettreAJourMusique,
  onChangerMusique,
  radios,
  onEnregistrerRadio,
  onSupprimerRadio,
  onLancerRadio,
  salonCourse,
  opaciteLignePiste,
  onChangerOpaciteLignePiste,
  modeConcentration,
  onBasculerModeConcentration,
  sessionEnLigne,
  prereglages,
  onAppliquerPrereglage,
  onOuvrirRenommagePrereglage,
  onDemanderSuppressionPrereglage,
  onRemplacerPrereglage,
  onMettreAJourPrereglage,
  onOuvrirCreationPrereglage,
  couleursChrono,
  onChangerCouleursChrono,
  encouragements,
  onChangerEncouragements,
  fondAccueil,
  onChangerFondAccueil,
  opaciteTitreSession,
  onChangerOpaciteTitreSession,
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
  numeroSession,
  modeCarnet,
  setModeCarnet,
  idSessionActive,
  onNouvelleSession,
  espaceDocuments
}) {

  const choisirOnglet = (id) => {
    setVueActive(id);
    if (!ouvert) setOuvert(true);
  };

  // Les 5 sections restent montées (état conservé) et sont superposées dans
  // un panneau de dimensions fixes : seule la section active est visible.
  const classeSection = (id) => `panel_section${vueActive === id ? ' panel_section--active' : ''}`;

  return (
    <div className={`panel ${ouvert ? '' : 'panel--collapsed'}`}>
      <div className="panel_corps" inert={!ouvert}>
        <div className="panel_contenu">
          <section className={classeSection(1)} inert={vueActive !== 1} aria-label="Notes">
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
              modeCarnet={modeCarnet}
              setModeCarnet={setModeCarnet}
              idSessionActive={idSessionActive}
              onNouvelleSession={onNouvelleSession}
            />
          </section>
          <section className={classeSection(2)} inert={vueActive !== 2} aria-label="Mon Pomodoro">
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
              couleursChrono={couleursChrono}
              onChangerCouleursChrono={onChangerCouleursChrono}
              encouragements={encouragements}
              onChangerEncouragements={onChangerEncouragements}
              fondAccueil={fondAccueil}
              onChangerFondAccueil={onChangerFondAccueil}
              opaciteTitreSession={opaciteTitreSession}
              onChangerOpaciteTitreSession={onChangerOpaciteTitreSession}
              titreSession={titreSession}
            />
          </section>
          <section className={classeSection(3)} inert={vueActive !== 3} aria-label="Salon de course">
            <Salon_course
              salonCourse={salonCourse}
              opaciteLigne={opaciteLignePiste}
              onChangerOpaciteLigne={onChangerOpaciteLignePiste}
            />
          </section>
          <section className={classeSection(4)} inert={vueActive !== 4} aria-label="Ambiance">
            <OngletAmbiance
              musiqueActuelle={musiqueActuelle}
              onMettreAJourMusique={onMettreAJourMusique}
              onOuvrirChoixMusique={onOuvrirChoixMusique}
              onChangerMusique={onChangerMusique}
              onSupprimerMusique={onSupprimerMusique}
              radios={radios}
              onEnregistrerRadio={onEnregistrerRadio}
              onSupprimerRadio={onSupprimerRadio}
              onLancerRadio={onLancerRadio}
            />
          </section>
          <section className={classeSection(5)} inert={vueActive !== 5} aria-label="Documents">
            <SectionDocuments espaceDocuments={espaceDocuments} actif={ouvert && vueActive === 5} />
          </section>
        </div>
      </div>

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
          <BoutonModeConcentration
            actif={modeConcentration}
            onClick={onBasculerModeConcentration}
            taille={18}
            className="btn_mode_concentration--poignee"
          />
        </div>
      </div>
    </div>
  );
}

export default BlocDeux;
