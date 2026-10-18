// Service Audio Web Audio API pour les Sonneries Pomodoro et les Bruits d'Ambiance

class ServiceAudio {
  constructor() {
    this.ctx = null;
    this.initialise = false;

    // Bruits d'ambiance actifs
    this.bruitsActifs = false;
    this.volumesBruits = {
      ocean: 0.5,
      pluie: 0.5,
      nuit: 0.4,
    };

    // Noeuds audio pour les bruits d'ambiance
    this.noeudsBruits = {
      ocean: null,
      pluie: null,
      nuit: null,
    };

    // Réglages sonneries
    this.sonneries = {
      finTravail: 'cloche_zen',
      debutPause: 'marimba',
      finCycle: 'carillon_celeste',
    };

    this.volumeSonneries = 0.7;
    this.volumeMusique = 0.8;

    this.chargerPreferences();
  }

  chargerPreferences() {
    try {
      const savedSonneries = localStorage.getItem('pomodoro_sonneries');
      if (savedSonneries) {
        this.sonneries = { ...this.sonneries, ...JSON.parse(savedSonneries) };
      }
      const savedBruits = localStorage.getItem('pomodoro_bruits_config');
      if (savedBruits) {
        const parsed = JSON.parse(savedBruits);
        this.bruitsActifs = Boolean(parsed.actifs);
        if (parsed.volumes) this.volumesBruits = { ...this.volumesBruits, ...parsed.volumes };
      }
      const savedVol = localStorage.getItem('pomodoro_volume_musique');
      if (savedVol) {
        this.volumeMusique = parseFloat(savedVol) || 0.8;
      }
    } catch {
      // Ignorer
    }
  }

  sauvegarderPreferences() {
    try {
      localStorage.setItem('pomodoro_sonneries', JSON.stringify(this.sonneries));
      localStorage.setItem('pomodoro_bruits_config', JSON.stringify({
        actifs: this.bruitsActifs,
        volumes: this.volumesBruits,
      }));
      localStorage.setItem('pomodoro_volume_musique', this.volumeMusique.toString());
    } catch {
      // Ignorer
    }
  }

  getAudioContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. SONNERIES SYNTHÉTISÉES DE HAUTE QUALITÉ
  // ─────────────────────────────────────────────────────────────────────────
  
  jouerSonnerie(typeSonnerie, volume = this.volumeSonneries) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const gainMaster = ctx.createGain();
    gainMaster.gain.setValueAtTime(volume, t);
    gainMaster.connect(ctx.destination);

    switch (typeSonnerie) {
      case 'cloche_zen': {
        // Cloche / Bol Tibétain méditatif avec harmoniques riches
        const frequences = [440, 880, 1320, 1760];
        const gains = [0.6, 0.3, 0.15, 0.08];
        frequences.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(gains[idx], t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
          osc.connect(g);
          g.connect(gainMaster);
          osc.start(t);
          osc.stop(t + 2.8);
        });
        break;
      }

      case 'marimba': {
        // Marimba joyeux et dynamique (arpège doux C5 - E5 - G5 - C6)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
          const startTime = t + i * 0.12;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);
          g.gain.setValueAtTime(0.5, startTime);
          g.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);
          osc.connect(g);
          g.connect(gainMaster);
          osc.start(startTime);
          osc.stop(startTime + 0.6);
        });
        break;
      }

      case 'carillon_celeste': {
        // Carillon céleste féerique (G4 - C5 - D5 - G5 - B5 - D6)
        const notes = [392.00, 523.25, 587.33, 783.99, 987.77, 1174.66];
        notes.forEach((freq, i) => {
          const startTime = t + i * 0.14;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          g.gain.setValueAtTime(0.4, startTime);
          g.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.6);
          osc.connect(g);
          g.connect(gainMaster);
          osc.start(startTime);
          osc.stop(startTime + 1.6);
        });
        break;
      }

      case 'bip_digital': {
        // Bip digital moderne et propre (double beep style montre sportive)
        [0, 0.15].forEach((offset) => {
          const startTime = t + offset;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(880, startTime);
          g.gain.setValueAtTime(0.25, startTime);
          g.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.09);
          osc.connect(g);
          g.connect(gainMaster);
          osc.start(startTime);
          osc.stop(startTime + 0.09);
        });
        break;
      }

      case 'gong_dore': {
        // Gong grave et chaleureux
        const freqs = [180, 270, 360, 540];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.5 / (idx + 1), t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
          osc.connect(g);
          g.connect(gainMaster);
          osc.start(t);
          osc.stop(t + 3.5);
        });
        break;
      }

      case 'goutte_rosee': {
        // Son de goutte d'eau pure avec glissando montant rapide
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(1400, t + 0.15);
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        osc.connect(g);
        g.connect(gainMaster);
        osc.start(t);
        osc.stop(t + 0.45);
        break;
      }

      default: {
        // Son de secours simple
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.setValueAtTime(660, t);
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        osc.connect(g);
        g.connect(gainMaster);
        osc.start(t);
        osc.stop(t + 0.5);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. MOTEUR DE BRUITS D'AMBIANCE (Génération Procédurale Web Audio)
  // ─────────────────────────────────────────────────────────────────────────

  creerBufferBruitBlanc(ctx, dureeSecondes = 5) {
    const bufferSize = ctx.sampleRate * dureeSecondes;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const output = buffer.getChannelData(channel);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }
    return buffer;
  }

  creerBufferBruitRose(ctx, dureeSecondes = 5) {
    const bufferSize = ctx.sampleRate * dureeSecondes;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const output = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  demarrerBruits() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.arreterBruits();

    // 1. Océan / Vagues (Bruit rose + Filtre passe-bas modulé par un LFO lent pour le flux & reflux)
    try {
      const sourceOcean = ctx.createBufferSource();
      sourceOcean.buffer = this.creerBufferBruitRose(ctx, 6);
      sourceOcean.loop = true;

      const filtreOcean = ctx.createBiquadFilter();
      filtreOcean.type = 'lowpass';
      filtreOcean.frequency.setValueAtTime(320, ctx.currentTime);

      const gainOcean = ctx.createGain();
      gainOcean.gain.setValueAtTime(this.volumesBruits.ocean * 0.6, ctx.currentTime);

      // LFO pour simuler le ressac des vagues (0.12 Hz)
      const lfoOcean = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfoOcean.frequency.setValueAtTime(0.12, ctx.currentTime);
      lfoGain.gain.setValueAtTime(220, ctx.currentTime);
      lfoOcean.connect(lfoGain);
      lfoGain.connect(filtreOcean.frequency);

      sourceOcean.connect(filtreOcean);
      filtreOcean.connect(gainOcean);
      gainOcean.connect(ctx.destination);

      sourceOcean.start();
      lfoOcean.start();

      this.noeudsBruits.ocean = { source: sourceOcean, gain: gainOcean, lfo: lfoOcean };
    } catch (e) {
      console.warn('Erreur audio ocean:', e);
    }

    // 2. Pluie (Bruit rose et blanc à spectre filtré simulant une averse continue et douce)
    try {
      const sourcePluie = ctx.createBufferSource();
      sourcePluie.buffer = this.creerBufferBruitBlanc(ctx, 5);
      sourcePluie.loop = true;

      const filtrePluie = ctx.createBiquadFilter();
      filtrePluie.type = 'bandpass';
      filtrePluie.frequency.setValueAtTime(1100, ctx.currentTime);
      filtrePluie.Q.setValueAtTime(0.6, ctx.currentTime);

      const gainPluie = ctx.createGain();
      gainPluie.gain.setValueAtTime(this.volumesBruits.pluie * 0.35, ctx.currentTime);

      sourcePluie.connect(filtrePluie);
      filtrePluie.connect(gainPluie);
      gainPluie.connect(ctx.destination);

      sourcePluie.start();

      this.noeudsBruits.pluie = { source: sourcePluie, gain: gainPluie };
    } catch (e) {
      console.warn('Erreur audio pluie:', e);
    }

    // 3. Nuit (Grillons d'ambiance + Brise nocturne douce)
    try {
      const sourceNuitBruit = ctx.createBufferSource();
      sourceNuitBruit.buffer = this.creerBufferBruitRose(ctx, 6);
      sourceNuitBruit.loop = true;

      const filtreNuit = ctx.createBiquadFilter();
      filtreNuit.type = 'lowpass';
      filtreNuit.frequency.setValueAtTime(200, ctx.currentTime);

      const gainNuitBruit = ctx.createGain();
      gainNuitBruit.gain.setValueAtTime(this.volumesBruits.nuit * 0.25, ctx.currentTime);

      sourceNuitBruit.connect(filtreNuit);
      filtreNuit.connect(gainNuitBruit);
      gainNuitBruit.connect(ctx.destination);
      sourceNuitBruit.start();

      // Oscillateurs harmoniques pour grillons modulés
      const oscGrillon1 = ctx.createOscillator();
      const oscGrillon2 = ctx.createOscillator();
      const gainGrillons = ctx.createGain();
      const modGrillon = ctx.createOscillator();
      const modGain = ctx.createGain();

      oscGrillon1.type = 'sine';
      oscGrillon1.frequency.setValueAtTime(4600, ctx.currentTime);
      oscGrillon2.type = 'sine';
      oscGrillon2.frequency.setValueAtTime(4950, ctx.currentTime);

      modGrillon.type = 'sine';
      modGrillon.frequency.setValueAtTime(8, ctx.currentTime); // Trille de grillon
      modGain.gain.setValueAtTime(this.volumesBruits.nuit * 0.08, ctx.currentTime);

      modGrillon.connect(gainGrillons.gain);
      oscGrillon1.connect(gainGrillons);
      oscGrillon2.connect(gainGrillons);
      gainGrillons.connect(ctx.destination);

      oscGrillon1.start();
      oscGrillon2.start();
      modGrillon.start();

      this.noeudsBruits.nuit = {
        source: sourceNuitBruit,
        gain: gainNuitBruit,
        osc1: oscGrillon1,
        osc2: oscGrillon2,
        mod: modGrillon,
        gainGrillons,
      };
    } catch (e) {
      console.warn('Erreur audio nuit:', e);
    }
  }

  arreterBruits() {
    Object.keys(this.noeudsBruits).forEach((cle) => {
      const noeud = this.noeudsBruits[cle];
      if (noeud) {
        try {
          if (noeud.source) noeud.source.stop();
          if (noeud.lfo) noeud.lfo.stop();
          if (noeud.osc1) noeud.osc1.stop();
          if (noeud.osc2) noeud.osc2.stop();
          if (noeud.mod) noeud.mod.stop();
        } catch {
          // Ignorer si déjà arrêté
        }
        this.noeudsBruits[cle] = null;
      }
    });
  }

  setBruitsActifs(actifs) {
    this.bruitsActifs = actifs;
    this.sauvegarderPreferences();
    if (actifs) {
      this.demarrerBruits();
    } else {
      this.arreterBruits();
    }
  }

  setVolumeBruit(cle, volume) {
    this.volumesBruits[cle] = volume;
    this.sauvegarderPreferences();

    const ctx = this.ctx;
    if (!ctx) return;

    if (cle === 'ocean' && this.noeudsBruits.ocean?.gain) {
      this.noeudsBruits.ocean.gain.gain.setTargetAtTime(volume * 0.6, ctx.currentTime, 0.05);
    } else if (cle === 'pluie' && this.noeudsBruits.pluie?.gain) {
      this.noeudsBruits.pluie.gain.gain.setTargetAtTime(volume * 0.35, ctx.currentTime, 0.05);
    } else if (cle === 'nuit' && this.noeudsBruits.nuit) {
      if (this.noeudsBruits.nuit.gain) {
        this.noeudsBruits.nuit.gain.gain.setTargetAtTime(volume * 0.25, ctx.currentTime, 0.05);
      }
      if (this.noeudsBruits.nuit.gainGrillons) {
        // modulé
      }
    }
  }

  setSonnerie(type, valeur) {
    this.sonneries[type] = valeur;
    this.sauvegarderPreferences();
  }

  setVolumeMusique(volume) {
    this.volumeMusique = volume;
    this.sauvegarderPreferences();
    window.dispatchEvent(new CustomEvent('pomodoroVolumeMusiqueChange', { detail: { volume } }));
  }
}

export const serviceAudio = new ServiceAudio();
export default serviceAudio;
