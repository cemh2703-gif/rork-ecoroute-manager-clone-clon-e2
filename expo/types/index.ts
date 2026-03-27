export interface Material {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export type FillLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface FillRecord {
  date: string;
  level: FillLevel;
  photoUri?: string;
  materialId: string;
}

export interface CollectionLocation {
  id: string;
  name: string;
  address: string;
  type: 'centro_acopio' | 'casa' | 'empresa' | 'escuela' | 'otro';
  latitude?: number;
  longitude?: number;
  materialIds: string[];
  frequencyDays: number;
  lastCollected?: string;
  nextCollection?: string;
  fillHistory: FillRecord[];
  currentFillLevel: FillLevel;
  notes?: string;
  photoUri?: string;
  active: boolean;
}

export interface ScheduledStop {
  locationId: string;
  materialIds: string[];
  order: number;
  completed: boolean;
  fillLevelBefore?: FillLevel;
  fillLevelAfter?: FillLevel;
  photoUri?: string;
  collectedAt?: string;
  previousLocationSnapshot?: {
    lastCollected?: string;
    nextCollection?: string;
    currentFillLevel: FillLevel;
    frequencyDays: number;
    fillHistoryLength: number;
  };
}

export interface DaySchedule {
  date: string;
  stops: ScheduledStop[];
  completed: boolean;
}

export interface ScheduleOverride {
  id: string;
  locationId: string;
  originalDate?: string;
  newDate: string;
  reason: 'client_request' | 'urgency_auto' | 'manual';
  createdAt: string;
}

export interface UrgencyAlert {
  locationId: string;
  type: 'consistent_full' | 'rapid_fill';
  message: string;
  suggestedExtraDay: string;
  weeksFullCount: number;
  dismissed: boolean;
}

export type LocationType = CollectionLocation['type'];

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  centro_acopio: 'Centro de Acopio',
  casa: 'Casa',
  empresa: 'Empresa',
  escuela: 'Escuela',
  otro: 'Otro',
};
