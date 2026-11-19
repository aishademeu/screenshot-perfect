/** MILKONTROL formatting utilities */

/** Format a number as millions with Kazakh tenge: "12,3 млн ₸" */
export function fmMln(n: number): string {
  return (n / 1_000_000).toFixed(1).replace('.', ',') + ' млн ₸';
}

/** Format thousands: "450 тыс ₸" */
export function fmThs(n: number): string {
  return Math.round(n).toLocaleString('ru') + ' тыс ₸';
}

/** Format percentage change: "+12%" or "−5%" */
export function fPercent(n: number, digits = 0): string {
  const abs = Math.abs(n * 100).toFixed(digits);
  return (n > 0 ? '+' : n < 0 ? '−' : '') + abs + '%';
}

/** Format a plain percentage: "87%" */
export function fPct(n: number): string {
  return Math.round(n) + '%';
}

/** Format date as "19.11.2026" */
export function formatDate(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('ru-KZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Format time as "14:32" */
export function formatTime(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleTimeString('ru-KZ', { hour: '2-digit', minute: '2-digit' });
}

/** Haversine distance in meters between two lat/lng points */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Clamp a number between min and max */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
