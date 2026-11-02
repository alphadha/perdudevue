/** Libellé Figma : « Dernière synchronisation à 17h10 le 07/09. » */
export function formatSyncLabel(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `Dernière synchronisation à ${hours}h${minutes} le ${day}/${month}.`;
}
