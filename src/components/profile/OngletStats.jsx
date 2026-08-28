import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Coins, Clock, Target, Repeat } from 'lucide-react';
import MiniatureMusique from '../ui/MiniatureMusique';
import { formaterJourIso } from '../../utils/helpers';
import { chargerLeaderboardGlobal } from '../../lib/firebaseDataService';

// Noms des jours et mois en français
const JOURS_SEMAINE_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const JOURS_LONGS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

function OngletStats({
  pseudo = 'Moi',
  photoProfil,
  coins = 0,
  sessionsSauvegardees = [],
  historiqueJoursPomodoro = [],
  pointsPomodoro = [],
  activitesPomodoro = [],
  taches = [],
  musiqueAmbiance,
  imageFond,
}) {
  // Période active : 'jour' | 'semaine' | 'mois'
  const [periode, setPeriode] = useState('semaine');
  // Date de référence pour la navigation temporelle
  const [dateRef, setDateRef] = useState(new Date());
  // Bar sélectionnée pour afficher le tooltip
  const [barSurvolee, setBarSurvolee] = useState(null);
  // Leaderboard en ligne
  const [leaderboardEnLigne, setLeaderboardEnLigne] = useState([]);

  // Chargement du classement mondial / amis depuis Firestore
  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const data = await chargerLeaderboardGlobal();
        if (!annule && data && data.length > 0) {
          setLeaderboardEnLigne(data);
        }
      } catch {
        // En cas d'erreur réseau, pas de blocage
      }
    })();
    return () => { annule = true; };
  }, []);

  // Navigation temporelle (précédent / suivant selon la période)
  const changerDate = (delta) => {
    setDateRef((prev) => {
      const nouvelleDate = new Date(prev);
      if (periode === 'jour') {
        nouvelleDate.setDate(nouvelleDate.getDate() + delta);
      } else if (periode === 'semaine') {
        nouvelleDate.setDate(nouvelleDate.getDate() + delta * 7);
      } else if (periode === 'mois') {
        nouvelleDate.setMonth(nouvelleDate.getMonth() + delta);
      }
      return nouvelleDate;
    });
  };

  // Libellé de la période affichée
  const labelPeriode = useMemo(() => {
    const jourNom = JOURS_LONGS[dateRef.getDay()];
    const jourNum = dateRef.getDate();
    const moisNom = MOIS_NOMS[dateRef.getMonth()];
    const annee = dateRef.getFullYear();

    if (periode === 'jour') {
      return `${jourNom} ${jourNum} ${moisNom} ${annee}`;
    }

    if (periode === 'semaine') {
      const currentDay = dateRef.getDay();
      const diffLundi = dateRef.getDate() - (currentDay === 0 ? 6 : currentDay - 1);
      const lundi = new Date(dateRef);
      lundi.setDate(diffLundi);
      const dimanche = new Date(lundi);
      dimanche.setDate(lundi.getDate() + 6);

      const formatJourMois = (d) => `${d.getDate()} ${MOIS_NOMS[d.getMonth()].slice(0, 4)}.`;
      return `${formatJourMois(lundi)} — ${formatJourMois(dimanche)} ${annee}`;
    }

    if (periode === 'mois') {
      return `${moisNom} ${annee}`;
    }

    return '';
  }, [periode, dateRef]);

  // Délimitation temporelle pour le filtrage
  const { dateDebutIso, dateFinIso } = useMemo(() => {
    const d = new Date(dateRef);
    const jourIso = formaterJourIso(d);

    if (periode === 'jour') {
      return { dateDebutIso: jourIso, dateFinIso: jourIso };
    }

    if (periode === 'semaine') {
      const currentDay = d.getDay();
      const diffLundi = d.getDate() - (currentDay === 0 ? 6 : currentDay - 1);
      const lundi = new Date(d);
      lundi.setDate(diffLundi);
      const dimanche = new Date(lundi);
      dimanche.setDate(lundi.getDate() + 6);

      return {
        dateDebutIso: formaterJourIso(lundi),
        dateFinIso: formaterJourIso(dimanche),
        jourSelectionneIso: jourIso
      };
    }

    // Mois
    const premierJourMois = new Date(d.getFullYear(), d.getMonth(), 1);
    const dernierJourMois = new Date(d.getFullYear(), d.getMonth() + 1, 0);

    return {
      dateDebutIso: formaterJourIso(premierJourMois),
      dateFinIso: formaterJourIso(dernierJourMois),
      jourSelectionneIso: jourIso
    };
  }, [periode, dateRef]);

  // Activités filtrées sur la période
  const activitesFiltrees = useMemo(() => {
    return (activitesPomodoro || []).filter((act) => {
      if (!act.date) return false;
      return act.date >= dateDebutIso && act.date <= dateFinIso;
    });
  }, [activitesPomodoro, dateDebutIso, dateFinIso]);

  // Calculs réels pour les 4 KPIs principaux de la période
  const statsPeriode = useMemo(() => {
    const totalMinutesActivites = activitesFiltrees.reduce((acc, a) => acc + (a.dureeMinutes || 25), 0);
    const totalToursActivites = activitesFiltrees.reduce((acc, a) => acc + (a.tours || 1), 0);
    const totalCoinsActivites = activitesFiltrees.reduce((acc, a) => acc + (a.coinsGagnes || 0), 0);

    // Si aucune activité détaillée mais des séances/points présents
    const minutesFallback = (pointsPomodoro?.length || 0) * 25 + (sessionsSauvegardees?.length || 0) * 50;
    const toursFallback = (pointsPomodoro?.length || 0) + (sessionsSauvegardees?.length || 0) * 2;

    const minutesTotales = activitesFiltrees.length > 0 ? totalMinutesActivites : (activitesPomodoro.length === 0 ? minutesFallback : 0);
    const toursTotaux = activitesFiltrees.length > 0 ? totalToursActivites : (activitesPomodoro.length === 0 ? toursFallback : 0);

    // Sessions terminées de la période
    const sessionsPeriode = (sessionsSauvegardees || []).filter((s) => {
      if (!s.dateCreation && !s.date) return true;
      const sDate = s.dateCreation ? formaterJourIso(new Date(s.dateCreation)) : s.date;
      return sDate >= dateDebutIso && sDate <= dateFinIso;
    });

    const heures = Math.floor(minutesTotales / 60);
    const mins = minutesTotales % 60;
    const tempsAffiche = `${heures} h ${mins.toString().padStart(2, '0')}`;

    return {
      minutesTotales,
      toursTotaux,
      sessionsCompte: sessionsPeriode.length,
      coinsGagnes: totalCoinsActivites,
      tempsAffiche
    };
  }, [activitesFiltrees, activitesPomodoro, pointsPomodoro, sessionsSauvegardees, dateDebutIso, dateFinIso]);

  // Données réelles pour le graphique principal
  const donneesGraphique = useMemo(() => {
    if (periode === 'jour') {
      const tranches = [
        { label: '06h', heureMin: 6, heureMax: 7 },
        { label: '08h', heureMin: 8, heureMax: 9 },
        { label: '10h', heureMin: 10, heureMax: 11 },
        { label: '12h', heureMin: 12, heureMax: 13 },
        { label: '14h', heureMin: 14, heureMax: 15 },
        { label: '16h', heureMin: 16, heureMax: 17 },
        { label: '18h', heureMin: 18, heureMax: 19 },
        { label: '20h', heureMin: 20, heureMax: 21 },
        { label: '22h', heureMin: 22, heureMax: 23 },
      ];

      return tranches.map((t) => {
        const correspondances = activitesFiltrees.filter((a) => a.heure >= t.heureMin && a.heure <= t.heureMax);
        const valeur = correspondances.reduce((acc, a) => acc + (a.dureeMinutes || 25), 0);
        const tours = correspondances.reduce((acc, a) => acc + (a.tours || 1), 0);
        return {
          label: t.label,
          valeur,
          tours,
          actif: false,
        };
      });
    }

    if (periode === 'semaine') {
      // 7 jours de la semaine (Lun à Dim)
      const currentDay = dateRef.getDay();
      const diffLundi = dateRef.getDate() - (currentDay === 0 ? 6 : currentDay - 1);
      const lundi = new Date(dateRef);
      lundi.setDate(diffLundi);

      return JOURS_SEMAINE_LABELS.map((nomJour, idx) => {
        const jourDate = new Date(lundi);
        jourDate.setDate(lundi.getDate() + idx);
        const jourIso = formaterJourIso(jourDate);

        const correspondances = (activitesPomodoro || []).filter((a) => a.date === jourIso);
        const valeur = correspondances.reduce((acc, a) => acc + (a.dureeMinutes || 25), 0);
        const tours = correspondances.reduce((acc, a) => acc + (a.tours || 1), 0);
        const estAujourdhui = formaterJourIso(new Date()) === jourIso;

        return {
          label: nomJour,
          dateIso: jourIso,
          valeur,
          tours,
          actif: estAujourdhui,
        };
      });
    }

    // Vue Mois : 4 à 5 semaines
    const annee = dateRef.getFullYear();
    const mois = dateRef.getMonth();
    const dernierJour = new Date(annee, mois + 1, 0);
    const nbJours = dernierJour.getDate();

    const semaines = [
      { label: 'Sem 1', jourDebut: 1, jourFin: 7 },
      { label: 'Sem 2', jourDebut: 8, jourFin: 14 },
      { label: 'Sem 3', jourDebut: 15, jourFin: 21 },
      { label: 'Sem 4', jourDebut: 22, jourFin: Math.min(28, nbJours) },
    ];
    if (nbJours > 28) {
      semaines.push({ label: 'Sem 5', jourDebut: 29, jourFin: nbJours });
    }

    return semaines.map((sem) => {
      const debutIso = formaterJourIso(new Date(annee, mois, sem.jourDebut));
      const finIso = formaterJourIso(new Date(annee, mois, sem.jourFin));

      const correspondances = (activitesPomodoro || []).filter((a) => a.date >= debutIso && a.date <= finIso);
      const valeur = correspondances.reduce((acc, a) => acc + (a.dureeMinutes || 25), 0);
      const tours = correspondances.reduce((acc, a) => acc + (a.tours || 1), 0);

      return {
        label: sem.label,
        valeur,
        tours,
        actif: false,
      };
    });
  }, [periode, dateRef, activitesFiltrees, activitesPomodoro]);

  const maxValeurGraphique = Math.max(...donneesGraphique.map((d) => d.valeur), 1);
  const aDesDonneesGraphique = donneesGraphique.some((d) => d.valeur > 0);

  // 4. Calcul réel du Temps moyen par thème
  const themesStats = useMemo(() => {
    const themeMap = {};

    // Analyse des activités Pomodoro
    activitesFiltrees.forEach((act) => {
      const nomTheme = act.theme || 'Général';
      if (!themeMap[nomTheme]) {
        themeMap[nomTheme] = { minutes: 0, count: 0 };
      }
      themeMap[nomTheme].minutes += (act.dureeMinutes || 25);
      themeMap[nomTheme].count += 1;
    });

    // Analyse des tâches terminées avec tags
    (taches || []).forEach((t) => {
      if (t.tags && t.tags.length > 0) {
        t.tags.forEach((tag) => {
          if (!themeMap[tag]) themeMap[tag] = { minutes: 0, count: 0 };
          themeMap[tag].count += 1;
        });
      }
    });

    const entries = Object.entries(themeMap);
    if (entries.length === 0) return [];

    const totalMinutes = entries.reduce((acc, [, v]) => acc + v.minutes, 0) || 1;
    const COULEURS_THEMES = ['#e2472a', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
    const ICONES_THEMES = ['💻', '📐', '📚', '🌍', '⚡', '🎯'];

    return entries
      .sort((a, b) => b[1].minutes - a[1].minutes)
      .slice(0, 5)
      .map(([nom, data], idx) => {
        const pct = Math.round((data.minutes / totalMinutes) * 100) || 10;
        const h = Math.floor(data.minutes / 60);
        const m = data.minutes % 60;
        const dureeStr = h > 0 ? `${h} h ${m > 0 ? `${m} min` : ''}` : `${m} min`;

        return {
          nom,
          duree: dureeStr,
          pourcentage: pct,
          couleur: COULEURS_THEMES[idx % COULEURS_THEMES.length],
          icone: ICONES_THEMES[idx % ICONES_THEMES.length],
        };
      });
  }, [activitesFiltrees, taches]);

  // 5. Money récolté réel
  const moneyRecap = useMemo(() => {
    const aujourdhuiIso = formaterJourIso(new Date());

    // Aujourd'hui
    const aujourdhuiCoins = (activitesPomodoro || [])
      .filter((a) => a.date === aujourdhuiIso)
      .reduce((acc, a) => acc + (a.coinsGagnes || 0), 0);

    // Cette semaine
    const debutSemaine = new Date();
    const curDay = debutSemaine.getDay();
    debutSemaine.setDate(debutSemaine.getDate() - (curDay === 0 ? 6 : curDay - 1));
    const debutSemaineIso = formaterJourIso(debutSemaine);

    const semaineCoins = (activitesPomodoro || [])
      .filter((a) => a.date >= debutSemaineIso && a.date <= aujourdhuiIso)
      .reduce((acc, a) => acc + (a.coinsGagnes || 0), 0);

    // Ce mois
    const debutMoisIso = formaterJourIso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const moisCoins = (activitesPomodoro || [])
      .filter((a) => a.date >= debutMoisIso && a.date <= aujourdhuiIso)
      .reduce((acc, a) => acc + (a.coinsGagnes || 0), 0);

    return {
      aujourdhui: aujourdhuiCoins,
      semaine: semaineCoins,
      mois: moisCoins,
      totalHistorique: coins || 0,
    };
  }, [activitesPomodoro, coins]);

  // 6. Épisodes / Musiques réels les plus écoutés
  const episodesTop = useMemo(() => {
    const musiquesMap = {};

    (activitesPomodoro || []).forEach((act) => {
      if (act.musiqueTitre) {
        const cle = act.musiqueTitre;
        if (!musiquesMap[cle]) {
          musiquesMap[cle] = {
            titre: act.musiqueTitre,
            artiste: act.musiqueArtiste || 'Artiste inconnu',
            ecoutes: 0,
            minutesTotales: 0,
          };
        }
        musiquesMap[cle].ecoutes += 1;
        musiquesMap[cle].minutesTotales += (act.dureeMinutes || 25);
      }
    });

    // Si la musique active existe et n'a pas encore de log
    if (musiqueAmbiance?.titre && !musiquesMap[musiqueAmbiance.titre]) {
      musiquesMap[musiqueAmbiance.titre] = {
        titre: musiqueAmbiance.titre,
        artiste: musiqueAmbiance.artiste || 'Musique actuelle',
        ecoutes: 1,
        minutesTotales: 25,
      };
    }

    const entries = Object.values(musiquesMap);
    if (entries.length === 0) return [];

    return entries
      .sort((a, b) => b.ecoutes - a.ecoutes)
      .slice(0, 4)
      .map((item, idx) => {
        const h = Math.floor(item.minutesTotales / 60);
        const m = item.minutesTotales % 60;
        const dureeStr = h > 0 ? `${h} h ${m > 0 ? `${m}` : ''}` : `${m} min`;

        return {
          id: idx + 1,
          rang: idx + 1,
          titre: item.titre,
          artiste: item.artiste,
          type: 'youtube',
          ecoutes: item.ecoutes,
          duree: dureeStr,
          thumbnail: null,
        };
      });
  }, [activitesPomodoro, musiqueAmbiance]);

  // 7. Fonds d'écran préférés réels
  const fondsTop = useMemo(() => {
    const fondsMap = {};
    const totalSessions = (activitesPomodoro || []).length || 1;

    (activitesPomodoro || []).forEach((act) => {
      const nom = act.imageFondNom || 'Focus Track';
      if (!fondsMap[nom]) {
        fondsMap[nom] = { nom, sessions: 0 };
      }
      fondsMap[nom].sessions += 1;
    });

    // Si fond actuel
    const nomFondActuel = imageFond ? 'Fond personnalisé' : 'Focus Track';
    if (!fondsMap[nomFondActuel]) {
      fondsMap[nomFondActuel] = { nom: nomFondActuel, sessions: 1 };
    }

    return Object.values(fondsMap)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 3)
      .map((f, idx) => {
        const pct = Math.round((f.sessions / totalSessions) * 100) || 100;
        return {
          id: idx + 1,
          nom: f.nom,
          image: imageFond || '/Focus Track (4).jpg',
          sessions: f.sessions,
          pourcentage: pct,
        };
      });
  }, [activitesPomodoro, imageFond]);

  // 8. Sessions les plus longues réelles
  const sessionsLongues = useMemo(() => {
    const sessionsDuMois = (sessionsSauvegardees || []).filter((s) => {
      if (!s.dateCreation && !s.date) return true;
      const sDate = s.dateCreation ? formaterJourIso(new Date(s.dateCreation)) : s.date;
      return sDate >= dateDebutIso && sDate <= dateFinIso;
    });

    if (sessionsDuMois.length === 0) return [];

    const MEDAILLES = ['🥇', '🥈', '🥉', '🏅', '🎖️'];

    return sessionsDuMois
      .sort((a, b) => (b.notes?.length || 0) - (a.notes?.length || 0))
      .slice(0, 4)
      .map((s, idx) => {
        const nbNotes = s.notes?.length || 0;
        const toursEstimes = Math.max(nbNotes, 1) * 2;
        const dureeMinutes = toursEstimes * 25;
        const h = Math.floor(dureeMinutes / 60);
        const m = dureeMinutes % 60;
        const dureeStr = h > 0 ? `${h} h ${m > 0 ? `${m}` : ''}` : `${m} min`;

        return {
          rang: idx + 1,
          medaille: MEDAILLES[idx] || '🎯',
          titre: s.titre || `Session #${s.numero || idx + 1}`,
          duree: dureeStr,
          theme: s.titre ? 'Travail' : 'Concentration',
          date: s.date || labelPeriode,
          tours: toursEstimes,
          musique: musiqueAmbiance?.titre || 'Ambiance',
        };
      });
  }, [sessionsSauvegardees, dateDebutIso, dateFinIso, labelPeriode, musiqueAmbiance]);

  // 9. Classement des amis / Leaderboard réel
  const classementAmis = useMemo(() => {
    const monTempsStr = statsPeriode.tempsAffiche;

    if (leaderboardEnLigne && leaderboardEnLigne.length > 0) {
      return leaderboardEnLigne.map((coureur, idx) => {
        const h = Math.floor((coureur.temps_total_pomodoro || 0) / 60);
        const m = (coureur.temps_total_pomodoro || 0) % 60;
        return {
          rang: idx + 1,
          nom: coureur.pseudo || 'Coureur',
          temps: `${h} h ${m.toString().padStart(2, '0')}`,
          sessions: Math.floor((coureur.temps_total_pomodoro || 0) / 25),
          streak: Math.min(Math.floor((coureur.temps_total_pomodoro || 0) / 50) + 1, 30),
          estMoi: coureur.estMoi,
          photo: coureur.photo_profil?.dataUrl || null,
          avatar: '🏃',
        };
      });
    }

    // Classement local avec l'utilisateur
    return [
      {
        rang: 1,
        nom: pseudo || 'Moi',
        temps: monTempsStr,
        sessions: statsPeriode.sessionsCompte || (activitesPomodoro || []).length,
        streak: (historiqueJoursPomodoro || []).length || 1,
        estMoi: true,
        photo: photoProfil?.dataUrl,
        avatar: '🏃',
      }
    ];
  }, [statsPeriode, leaderboardEnLigne, pseudo, activitesPomodoro, historiqueJoursPomodoro, photoProfil]);

  // 10. Calcul réel de la meilleure streak
  const streakCalcul = useMemo(() => {
    const joursTries = [...new Set(historiqueJoursPomodoro || [])].sort();
    if (joursTries.length === 0) {
      return {
        maxStreak: 0,
        actuelle: 0,
        debut: null,
        fin: null,
      };
    }

    let maxStreak = 1;
    let tempStreak = 1;
    let debutMax = joursTries[0];
    let finMax = joursTries[0];
    let debutTemp = joursTries[0];

    for (let i = 1; i < joursTries.length; i++) {
      const dPrec = new Date(joursTries[i - 1]);
      const dCour = new Date(joursTries[i]);
      const diffJours = Math.round((dCour - dPrec) / (1000 * 60 * 60 * 24));

      if (diffJours === 1) {
        tempStreak += 1;
        if (tempStreak > maxStreak) {
          maxStreak = tempStreak;
          debutMax = debutTemp;
          finMax = joursTries[i];
        }
      } else if (diffJours > 1) {
        tempStreak = 1;
        debutTemp = joursTries[i];
      }
    }

    return {
      maxStreak,
      actuelle: tempStreak,
      debut: debutMax,
      fin: finMax,
    };
  }, [historiqueJoursPomodoro]);

  return (
    <div className="profil_onglet_panneau stats_onglet">
      {/* ======================================================================
          1. En-tête de l'onglet Statistiques
         ====================================================================== */}
      <div className="stats_header">
        <div className="stats_header_textes">
          <h3 className="stats_titre">Statistiques</h3>
          <p className="stats_sous_titre">
            Suivez votre progression et découvrez vos habitudes de concentration.
          </p>
        </div>

        <div className="stats_header_controles">
          {/* Sélecteur de période */}
          <div className="stats_periode_pills" role="tablist" aria-label="Sélecteur de période">
            <button
              type="button"
              className={`stats_periode_btn ${periode === 'jour' ? 'stats_periode_btn--actif' : ''}`}
              onClick={() => setPeriode('jour')}
            >
              Jour
            </button>
            <button
              type="button"
              className={`stats_periode_btn ${periode === 'semaine' ? 'stats_periode_btn--actif' : ''}`}
              onClick={() => setPeriode('semaine')}
            >
              Semaine
            </button>
            <button
              type="button"
              className={`stats_periode_btn ${periode === 'mois' ? 'stats_periode_btn--actif' : ''}`}
              onClick={() => setPeriode('mois')}
            >
              Mois
            </button>
          </div>

          {/* Navigation temporelle avec flèches */}
          <div className="stats_nav_temporelle">
            <button
              type="button"
              className="stats_nav_fleche"
              onClick={() => changerDate(-1)}
              aria-label="Période précédente"
              title="Précédent"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="stats_nav_label">{labelPeriode}</span>
            <button
              type="button"
              className="stats_nav_fleche"
              onClick={() => changerDate(1)}
              aria-label="Période suivante"
              title="Suivant"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================================
          2. Ligne 1 : Cartes principales récapitulatives (4 KPIs)
         ====================================================================== */}
      <div className="stats_kpis_grille">
        {/* KPI 1 : Temps de concentration */}
        <div className="stats_kpi_carte">
          <div className="stats_kpi_entete">
            <span className="stats_kpi_icone stats_kpi_icone--chrono">
              <Clock size={18} />
            </span>
            <span className="stats_kpi_badge stats_kpi_badge--positif">
              {statsPeriode.minutesTotales > 0 ? 'Actif' : '0 %'}
            </span>
          </div>
          <span className="stats_kpi_valeur">{statsPeriode.tempsAffiche}</span>
          <span className="stats_kpi_label">Temps de concentration</span>
        </div>

        {/* KPI 2 : Sessions */}
        <div className="stats_kpi_carte">
          <div className="stats_kpi_entete">
            <span className="stats_kpi_icone stats_kpi_icone--cible">
              <Target size={18} />
            </span>
            <span className="stats_kpi_badge stats_kpi_badge--neutre">
              {statsPeriode.sessionsCompte > 0 ? `${statsPeriode.sessionsCompte} faites` : 'En attente'}
            </span>
          </div>
          <span className="stats_kpi_valeur">
            {statsPeriode.sessionsCompte} session{statsPeriode.sessionsCompte > 1 ? 's' : ''}
          </span>
          <span className="stats_kpi_label">Sessions terminées</span>
        </div>

        {/* KPI 3 : Tours */}
        <div className="stats_kpi_carte">
          <div className="stats_kpi_entete">
            <span className="stats_kpi_icone stats_kpi_icone--tours">
              <Repeat size={18} />
            </span>
            <span className="stats_kpi_badge stats_kpi_badge--violet">
              {statsPeriode.toursTotaux > 0 ? '🔥 En cours' : '0 tour'}
            </span>
          </div>
          <span className="stats_kpi_valeur">
            {statsPeriode.toursTotaux} tour{statsPeriode.toursTotaux > 1 ? 's' : ''}
          </span>
          <span className="stats_kpi_label">Tours Pomodoro</span>
        </div>

        {/* KPI 4 : Money */}
        <div className="stats_kpi_carte">
          <div className="stats_kpi_entete">
            <span className="stats_kpi_icone stats_kpi_icone--money">
              <Coins size={18} />
            </span>
            <span className="stats_kpi_badge stats_kpi_badge--or">
              +{statsPeriode.coinsGagnes}
            </span>
          </div>
          <span className="stats_kpi_valeur">{coins} 🪙</span>
          <span className="stats_kpi_label">Money récoltés</span>
        </div>
      </div>

      {/* ======================================================================
          3. Ligne 2 : Graphique principal du temps de concentration
         ====================================================================== */}
      <div className="stats_carte stats_graphique_carte">
        <div className="stats_carte_entete">
          <div>
            <h4 className="stats_carte_titre">Temps de concentration</h4>
            <p className="stats_carte_desc">
              Volume d'heures et régularité sur la période sélectionnée
            </p>
          </div>
          <span className="stats_graphique_total_badge">
            Total : <strong>{statsPeriode.tempsAffiche}</strong>
          </span>
        </div>

        <div className="stats_graphique_corps">
          <div className="stats_graphique_barres_wrap">
            {donneesGraphique.map((col, idx) => {
              const hauteurPct = col.valeur > 0
                ? Math.round((col.valeur / maxValeurGraphique) * 100)
                : 4;
              const heures = Math.floor(col.valeur / 60);
              const minutes = col.valeur % 60;
              const formatDuree = `${heures > 0 ? `${heures}h ` : ''}${minutes}m`;

              return (
                <div
                  key={idx}
                  className={`stats_barre_colonne ${col.actif ? 'stats_barre_colonne--actif' : ''}`}
                  onMouseEnter={() => setBarSurvolee(col)}
                  onMouseLeave={() => setBarSurvolee(null)}
                >
                  <div className="stats_barre_piste">
                    <div
                      className="stats_barre_remplissage"
                      style={{ height: `${hauteurPct}%`, opacity: col.valeur > 0 ? 1 : 0.25 }}
                    >
                      <span className="stats_barre_val_bulle">{formatDuree}</span>
                    </div>
                  </div>
                  <span className="stats_barre_label">{col.label}</span>
                </div>
              );
            })}
          </div>

          {/* Message discret si aucune activité sur cette période */}
          {!aDesDonneesGraphique && (
            <div className="stats_etat_vide_discret">
              <span>🌱 Commence une session pour voir apparaître tes statistiques.</span>
            </div>
          )}

          {/* Infobulle de survol détaillée */}
          {barSurvolee && (
            <div className="stats_graphique_infobulle">
              <strong>{barSurvolee.label}</strong> : {Math.floor(barSurvolee.valeur / 60)}h{' '}
              {barSurvolee.valeur % 60}min ({barSurvolee.tours} tour{barSurvolee.tours > 1 ? 's' : ''})
            </div>
          )}
        </div>
      </div>

      {/* ======================================================================
          4. Ligne 3 : Temps moyen par thème & Money récolté
         ====================================================================== */}
      <div className="stats_grille_deux_cols">
        {/* Temps moyen par thème */}
        <div className="stats_carte">
          <div className="stats_carte_entete">
            <h4 className="stats_carte_titre">Temps moyen par thème</h4>
          </div>

          {themesStats.length > 0 ? (
            <div className="stats_themes_liste">
              {themesStats.map((th, i) => (
                <div key={i} className="stats_theme_item">
                  <div className="stats_theme_ligne_haut">
                    <div className="stats_theme_identite">
                      <span className="stats_theme_icone">{th.icone}</span>
                      <span className="stats_theme_nom">{th.nom}</span>
                    </div>
                    <span className="stats_theme_duree">{th.duree}</span>
                  </div>

                  <div className="stats_theme_barre_fond">
                    <div
                      className="stats_theme_barre_fill"
                      style={{
                        width: `${th.pourcentage}%`,
                        backgroundColor: th.couleur,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="stats_etat_vide_panneau">
              <span className="stats_etat_vide_icone">🏷️</span>
              <p className="stats_etat_vide_texte">
                Aucun thème pour cette période. Ajoute des tags à tes notes pour suivre ton temps par sujet.
              </p>
            </div>
          )}
        </div>

        {/* Money récolté */}
        <div className="stats_carte">
          <div className="stats_carte_entete">
            <h4 className="stats_carte_titre">Money récolté</h4>
          </div>

          <div className="stats_money_recap_grille">
            <div className="stats_money_recap_item">
              <span className="stats_money_recap_label">Aujourd'hui</span>
              <span className="stats_money_recap_valeur">🪙 +{moneyRecap.aujourdhui}</span>
            </div>
            <div className="stats_money_recap_item">
              <span className="stats_money_recap_label">Cette semaine</span>
              <span className="stats_money_recap_valeur">🪙 +{moneyRecap.semaine}</span>
            </div>
            <div className="stats_money_recap_item">
              <span className="stats_money_recap_label">Ce mois</span>
              <span className="stats_money_recap_valeur">🪙 +{moneyRecap.mois}</span>
            </div>
            <div className="stats_money_recap_item stats_money_recap_item--total">
              <span className="stats_money_recap_label">Total historique</span>
              <span className="stats_money_recap_valeur">🪙 {moneyRecap.totalHistorique}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================================
          5. Ligne 4 : Épisodes les plus écoutés & Fonds d'écran préférés
         ====================================================================== */}
      <div className="stats_grille_deux_cols">
        {/* Épisodes les plus écoutés */}
        <div className="stats_carte">
          <div className="stats_carte_entete">
            <h4 className="stats_carte_titre">Épisodes les plus écoutés</h4>
          </div>

          {episodesTop.length > 0 ? (
            <div className="stats_musiques_liste">
              {episodesTop.map((ep) => (
                <div key={ep.id} className="stats_musique_item">
                  <span className="stats_musique_rang">#{ep.rang}</span>
                  <MiniatureMusique
                    className="stats_musique_vignette"
                    iconeClassName="stats_musique_vignette_icone"
                    type={ep.type}
                    thumbnail={ep.thumbnail}
                  />
                  <div className="stats_musique_details">
                    <span className="stats_musique_titre" title={ep.titre}>
                      {ep.titre}
                    </span>
                    <span className="stats_musique_meta">
                      {ep.artiste} • {ep.ecoutes} écoute{ep.ecoutes > 1 ? 's' : ''} • {ep.duree}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="stats_etat_vide_panneau">
              <span className="stats_etat_vide_icone">🎧</span>
              <p className="stats_etat_vide_texte">
                Aucune musique écoutée. Lancez une ambiance sonore pour la voir apparaître ici.
              </p>
            </div>
          )}
        </div>

        {/* Fonds d'écran préférés */}
        <div className="stats_carte">
          <div className="stats_carte_entete">
            <h4 className="stats_carte_titre">Fonds d'écran préférés</h4>
          </div>

          <div className="stats_fonds_grille">
            {fondsTop.map((fond) => (
              <div key={fond.id} className="stats_fond_carte">
                <div
                  className="stats_fond_apercu"
                  style={{ backgroundImage: `url(${fond.image})` }}
                />
                <div className="stats_fond_infos">
                  <span className="stats_fond_nom">{fond.nom}</span>
                  <span className="stats_fond_meta">
                    {fond.sessions} session{fond.sessions > 1 ? 's' : ''} ({fond.pourcentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================================
          6. Ligne 5 : Sessions les plus longues du mois
         ====================================================================== */}
      <div className="stats_carte">
        <div className="stats_carte_entete">
          <h4 className="stats_carte_titre">Sessions les plus longues</h4>
        </div>

        {sessionsLongues.length > 0 ? (
          <div className="stats_sessions_longues_liste">
            {sessionsLongues.map((s, idx) => (
              <div key={idx} className="stats_session_longue_item">
                <span className="stats_session_medaille">{s.medaille}</span>
                <div className="stats_session_info_principale">
                  <h5 className="stats_session_titre">{s.titre}</h5>
                  <span className="stats_session_meta">
                    {s.theme} • {s.date} • {s.tours} tours Pomodoro
                  </span>
                </div>
                <div className="stats_session_duree_badge">
                  <span>⏱️ {s.duree}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="stats_etat_vide_panneau">
            <span className="stats_etat_vide_icone">📝</span>
            <p className="stats_etat_vide_texte">
              Aucune session archivée pour cette période. Sauvegardez une session pour la retrouver ici.
            </p>
          </div>
        )}
      </div>

      {/* ======================================================================
          7. Ligne 6 : Classement des amis & Meilleure streak
         ====================================================================== */}
      <div className="stats_grille_deux_cols">
        {/* Classement des amis */}
        <div className="stats_carte">
          <div className="stats_carte_entete">
            <h4 className="stats_carte_titre">Classement des amis</h4>
          </div>

          <div className="stats_leaderboard_liste">
            {classementAmis.map((ami) => (
              <div
                key={ami.rang}
                className={`stats_leaderboard_item ${ami.estMoi ? 'stats_leaderboard_item--moi' : ''}`}
              >
                <span className="stats_leaderboard_rang">#{ami.rang}</span>
                <div className="stats_leaderboard_avatar">
                  {ami.photo ? (
                    <img src={ami.photo} alt={ami.nom} />
                  ) : (
                    <span>{ami.avatar || '🏃'}</span>
                  )}
                </div>
                <div className="stats_leaderboard_nom_wrap">
                  <span className="stats_leaderboard_nom">
                    {ami.nom} {ami.estMoi && <span className="stats_badge_moi">(Toi)</span>}
                  </span>
                  <span className="stats_leaderboard_sessions">{ami.sessions} sessions</span>
                </div>
                <div className="stats_leaderboard_scores">
                  <span className="stats_leaderboard_temps">{ami.temps}</span>
                  <span className="stats_leaderboard_streak">🔥 {ami.streak} j</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Meilleure streak */}
        <div className="stats_carte stats_carte--streak">
          <div className="stats_carte_entete">
            <h4 className="stats_carte_titre">Meilleure streak</h4>
          </div>

          <div className="stats_streak_contenu">
            <div className="stats_streak_flamme_cadre">
              <span className="stats_streak_emoticon">🔥</span>
            </div>
            <div className="stats_streak_valeur">{streakCalcul.maxStreak} jour{streakCalcul.maxStreak > 1 ? 's' : ''}</div>
            <p className="stats_streak_phrase">
              {streakCalcul.maxStreak > 0
                ? '« Ta plus longue série de jours consécutifs avec au moins une session terminée. »'
                : '« Termine un tour de Pomodoro aujourd\'hui pour débuter ta première série ! »'}
            </p>
            {streakCalcul.debut && streakCalcul.fin && (
              <div className="stats_streak_dates">
                <span>{streakCalcul.debut} au {streakCalcul.fin}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OngletStats;
