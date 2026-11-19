/** MILKONTROL role definitions */

export type AppRole = 'rep' | 'rd' | 'sd' | 'ceo';

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: AppRole;
  region_id: number | null;
  employee_id: number | null;
}

export interface SessionContext {
  userId: string | null;
  role: AppRole | null;
  regionId: number | null;
  employeeId: number | null;
  loading: boolean;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  rep: 'Торгпред',
  rd: 'Региональный директор',
  sd: 'Директор продаж',
  ceo: 'Генеральный директор',
};

/** Roles that can see all regions */
export function isManager(role: AppRole | null): boolean {
  return role === 'sd' || role === 'ceo';
}

/** Roles that can review photos */
export function canReviewPhotos(role: AppRole | null): boolean {
  return role === 'rd' || role === 'sd' || role === 'ceo';
}

/** Roles that can download reports */
export function canDownloadReports(role: AppRole | null): boolean {
  return role === 'rd' || role === 'sd' || role === 'ceo';
}

/** Roles that can assign tasks */
export function canAssignTasks(role: AppRole | null): boolean {
  return role === 'rd' || role === 'sd' || role === 'ceo';
}

/** Nav items for each role */
export const ROLE_NAV: Record<AppRole, { key: string; label: string; icon: string }[]> = {
  rep: [
    { key: 'itinerary', label: 'Маршрут', icon: 'truck' },
    { key: 'plan', label: 'План', icon: 'target' },
    { key: 'ranking', label: 'Рейтинг', icon: 'trophy' },
  ],
  rd: [
    { key: '', label: 'Обзор', icon: 'layout-dashboard' },
    { key: 'map', label: 'Карта', icon: 'map' },
    { key: 'employees', label: 'Сотрудники', icon: 'users' },
    { key: 'photos', label: 'Фото', icon: 'camera' },
  ],
  sd: [
    { key: '', label: 'Обзор', icon: 'layout-dashboard' },
    { key: 'map', label: 'Карта', icon: 'map' },
    { key: 'employees', label: 'Сотрудники', icon: 'users' },
    { key: 'alerts', label: 'Сигналы', icon: 'bell' },
  ],
  ceo: [
    { key: '', label: 'Обзор', icon: 'layout-dashboard' },
    { key: 'map', label: 'Карта', icon: 'map' },
    { key: 'employees', label: 'Сотрудники', icon: 'users' },
    { key: 'alerts', label: 'Сигналы', icon: 'bell' },
  ],
};

/**
 * KPI formula (configurable business assumption):
 * KPI = 50% plan achievement + 30% visit coverage + 20% photo discipline
 * Bonus = KPI × 3000 ₸ if KPI ≥ 70  (configurable threshold and multiplier)
 */
export const KPI_WEIGHTS = { plan: 0.5, visits: 0.3, photo: 0.2 };
export const KPI_BONUS_THRESHOLD = 70; // configurable
export const KPI_BONUS_MULTIPLIER = 3000; // ₸ per KPI point (configurable)

export function calculateKPI(planPct: number, visitsPct: number, photoPct: number): number {
  return Math.round(
    Math.min(planPct, 120) * KPI_WEIGHTS.plan +
      visitsPct * KPI_WEIGHTS.visits +
      photoPct * KPI_WEIGHTS.photo,
  );
}

export function calculateBonus(kpi: number): number {
  return kpi >= KPI_BONUS_THRESHOLD ? kpi * KPI_BONUS_MULTIPLIER : 0;
}
