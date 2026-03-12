export type DistanceUnit = 'km' | 'mi';

const KM_TO_MI = 0.621371;
const MI_TO_KM = 1.60934;

export function toDisplayUnit(km: number, unit: DistanceUnit): number {
  return unit === 'mi' ? Math.round(km * KM_TO_MI) : km;
}

export function toKm(value: number, unit: DistanceUnit): number {
  return unit === 'mi' ? Math.round(value * MI_TO_KM) : value;
}

export function unitLabel(unit: DistanceUnit): string {
  return unit === 'mi' ? 'mi' : 'km';
}
