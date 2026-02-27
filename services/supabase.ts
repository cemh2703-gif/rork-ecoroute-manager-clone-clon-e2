import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Material,
  CollectionLocation,
  DaySchedule,
  ScheduleOverride,
  FillRecord,
  ScheduledStop,
  FillLevel,
} from '@/types';

const SUPABASE_URL = 'https://nbtzzysnqezxuypmrmrm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cnERxv6y_HWk5jY0oStt3w_wfh6izQF';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

interface MaterialRow {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

interface LocationRow {
  id: string;
  name: string;
  address: string;
  type: string;
  latitude?: number;
  longitude?: number;
  material_ids: string[];
  frequency_days: number;
  last_collected?: string;
  next_collection?: string;
  fill_history: FillRecord[];
  current_fill_level: number;
  notes?: string;
  photo_uri?: string;
  active: boolean;
}

interface ScheduleRow {
  id: string;
  date: string;
  stops: ScheduledStop[];
  completed: boolean;
}

interface OverrideRow {
  id: string;
  location_id: string;
  original_date?: string;
  new_date: string;
  reason: string;
  created_at: string;
}

function rowToMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
  };
}

function materialToRow(m: Material): MaterialRow {
  return {
    id: m.id,
    name: m.name,
    color: m.color,
    icon: m.icon,
  };
}

function rowToLocation(row: LocationRow): CollectionLocation {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    type: row.type as CollectionLocation['type'],
    latitude: row.latitude,
    longitude: row.longitude,
    materialIds: Array.isArray(row.material_ids) ? row.material_ids : [],
    frequencyDays: row.frequency_days ?? 7,
    lastCollected: row.last_collected,
    nextCollection: row.next_collection,
    fillHistory: Array.isArray(row.fill_history) ? row.fill_history : [],
    currentFillLevel: (row.current_fill_level ?? 0) as FillLevel,
    notes: row.notes,
    photoUri: row.photo_uri,
    active: row.active ?? true,
  };
}

function locationToRow(loc: CollectionLocation): LocationRow {
  return {
    id: loc.id,
    name: loc.name,
    address: loc.address,
    type: loc.type,
    latitude: loc.latitude,
    longitude: loc.longitude,
    material_ids: loc.materialIds,
    frequency_days: loc.frequencyDays,
    last_collected: loc.lastCollected,
    next_collection: loc.nextCollection,
    fill_history: loc.fillHistory,
    current_fill_level: loc.currentFillLevel,
    notes: loc.notes,
    photo_uri: loc.photoUri,
    active: loc.active,
  };
}

function rowToSchedule(row: ScheduleRow): DaySchedule {
  return {
    date: row.date,
    stops: Array.isArray(row.stops) ? row.stops : [],
    completed: row.completed ?? false,
  };
}

function scheduleToRow(s: DaySchedule): ScheduleRow {
  return {
    id: s.date,
    date: s.date,
    stops: s.stops,
    completed: s.completed,
  };
}

function rowToOverride(row: OverrideRow): ScheduleOverride {
  return {
    id: row.id,
    locationId: row.location_id,
    originalDate: row.original_date,
    newDate: row.new_date,
    reason: row.reason as ScheduleOverride['reason'],
    createdAt: row.created_at,
  };
}

function overrideToRow(o: ScheduleOverride): OverrideRow {
  return {
    id: o.id,
    location_id: o.locationId,
    original_date: o.originalDate,
    new_date: o.newDate,
    reason: o.reason,
    created_at: o.createdAt,
  };
}

export async function fetchMaterials(): Promise<Material[]> {
  console.log('[Supabase] Fetching materials...');
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('name');
  if (error) {
    console.error('[Supabase] Error fetching materials:', error.message);
    return [];
  }
  const result = ((data ?? []) as MaterialRow[]).map(rowToMaterial);
  console.log('[Supabase] Fetched materials:', result.length);
  return result;
}

export async function upsertMaterial(material: Material): Promise<void> {
  console.log('[Supabase] Upserting material:', material.id);
  const { error } = await supabase
    .from('materials')
    .upsert(materialToRow(material));
  if (error) {
    console.error('[Supabase] Error upserting material:', error.message);
    throw error;
  }
}

export async function deleteMaterialById(id: string): Promise<void> {
  console.log('[Supabase] Deleting material:', id);
  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[Supabase] Error deleting material:', error.message);
    throw error;
  }
}

export async function fetchLocations(): Promise<CollectionLocation[]> {
  console.log('[Supabase] Fetching locations...');
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('name');
  if (error) {
    console.error('[Supabase] Error fetching locations:', error.message);
    return [];
  }
  const result = ((data ?? []) as LocationRow[]).map(rowToLocation);
  console.log('[Supabase] Fetched locations:', result.length);
  return result;
}

export async function upsertLocation(location: CollectionLocation): Promise<void> {
  console.log('[Supabase] Upserting location:', location.id);
  const { error } = await supabase
    .from('locations')
    .upsert(locationToRow(location));
  if (error) {
    console.error('[Supabase] Error upserting location:', error.message);
    throw error;
  }
}

export async function deleteLocationById(id: string): Promise<void> {
  console.log('[Supabase] Deleting location:', id);
  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[Supabase] Error deleting location:', error.message);
    throw error;
  }
}

export async function fetchSchedules(): Promise<DaySchedule[]> {
  console.log('[Supabase] Fetching schedules...');
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .order('date');
  if (error) {
    console.error('[Supabase] Error fetching schedules:', error.message);
    return [];
  }
  const result = ((data ?? []) as ScheduleRow[]).map(rowToSchedule);
  console.log('[Supabase] Fetched schedules:', result.length);
  return result;
}

export async function upsertSchedules(schedules: DaySchedule[]): Promise<void> {
  if (schedules.length === 0) return;
  console.log('[Supabase] Upserting schedules:', schedules.length);
  const { error } = await supabase
    .from('schedules')
    .upsert(schedules.map(scheduleToRow));
  if (error) {
    console.error('[Supabase] Error upserting schedules:', error.message);
    throw error;
  }
}

export async function deleteScheduleById(id: string): Promise<void> {
  console.log('[Supabase] Deleting schedule:', id);
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[Supabase] Error deleting schedule:', error.message);
    throw error;
  }
}

export async function fetchOverrides(): Promise<ScheduleOverride[]> {
  console.log('[Supabase] Fetching overrides...');
  const { data, error } = await supabase
    .from('overrides')
    .select('*')
    .order('created_at');
  if (error) {
    console.error('[Supabase] Error fetching overrides:', error.message);
    return [];
  }
  const result = ((data ?? []) as OverrideRow[]).map(rowToOverride);
  console.log('[Supabase] Fetched overrides:', result.length);
  return result;
}

export async function insertOverrideRecord(override: ScheduleOverride): Promise<void> {
  console.log('[Supabase] Inserting override:', override.id);
  const { error } = await supabase
    .from('overrides')
    .insert(overrideToRow(override));
  if (error) {
    console.error('[Supabase] Error inserting override:', error.message);
    throw error;
  }
}
