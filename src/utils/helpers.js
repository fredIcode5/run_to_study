export const PHOTO_PROFIL_VIDE = { dataUrl: null, position: { x: 50, y: 50 } };

export function positionParDefautLecteur() {
  if (typeof window === 'undefined') return { x: 24, y: 300 };
  return {
    x: 24,
    y: Math.max(100, window.innerHeight - 320),
  };
}

export function formaterJourIso(date) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

export function formaterDateNote(dateIso) {
  try {
    const d = new Date(dateIso);
    if (isNaN(d.getTime())) return '';
    const jour = d.toLocaleDateString('fr-FR');
    const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${jour} ${heure}`;
  } catch {
    return '';
  }
}

export function genererIdTache() {
  return `tache_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export function genererNumeroSession(sessionsExistantes) {
  const numeros = sessionsExistantes
    .map((s) => parseInt(s.numero, 10))
    .filter((n) => !Number.isNaN(n));

  const suivant = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
  return String(suivant).padStart(4, '0');
}

export function extraireIdYoutube(lien) {
  try {
    const url = new URL(lien.trim());
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1) || null;
    if (url.searchParams.get('v')) return url.searchParams.get('v');
    const correspondance = url.pathname.match(/\/embed\/([^/?]+)/);
    if (correspondance) return correspondance[1];
    return null;
  } catch {
    return null;
  }
}

export function formaterTempsPiste(s) {
  if (!isFinite(s) || s < 0) s = 0;
  const minutes = Math.floor(s / 60);
  const secondes = Math.floor(s % 60).toString().padStart(2, '0');
  return `${minutes}:${secondes}`;
}

export function genererIdPrereglage() {
  return `prereglage_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}
