import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import {
  Material,
  CollectionLocation,
  DaySchedule,
  FillLevel,
  ScheduledStop,
  ScheduleOverride,
  UrgencyAlert,
} from '@/types';
import {
  fetchMaterials,
  upsertMaterial,
  deleteMaterialById,
  fetchLocations,
  upsertLocation,
  deleteLocationById,
  fetchSchedules,
  upsertSchedules,
  deleteScheduleById,
  fetchOverrides,
  insertOverrideRecord,
} from '@/services/supabase';
import { getDateString, addDays, suggestFrequency, getStopsForDate, detectUrgency } from '@/utils/dates';

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [locations, setLocations] = useState<CollectionLocation[]>([]);
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [urgencyAlerts, setUrgencyAlerts] = useState<UrgencyAlert[]>([]);

  const materialsQuery = useQuery({
    queryKey: ['materials'],
    queryFn: fetchMaterials,
  });

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });

  const schedulesQuery = useQuery({
    queryKey: ['schedules'],
    queryFn: fetchSchedules,
  });

  const overridesQuery = useQuery({
    queryKey: ['overrides'],
    queryFn: fetchOverrides,
  });

  useEffect(() => {
    if (materialsQuery.data) {
      console.log('[AppProvider] Syncing materials from Supabase:', materialsQuery.data.length);
      setMaterials(materialsQuery.data);
    }
  }, [materialsQuery.data]);

  useEffect(() => {
    if (locationsQuery.data) {
      console.log('[AppProvider] Syncing locations from Supabase:', locationsQuery.data.length);
      setLocations(locationsQuery.data);
    }
  }, [locationsQuery.data]);

  useEffect(() => {
    if (schedulesQuery.data) {
      console.log('[AppProvider] Syncing schedules from Supabase:', schedulesQuery.data.length);
      setSchedules(schedulesQuery.data);
    }
  }, [schedulesQuery.data]);

  useEffect(() => {
    if (overridesQuery.data) {
      console.log('[AppProvider] Syncing overrides from Supabase:', overridesQuery.data.length);
      setOverrides(overridesQuery.data);
    }
  }, [overridesQuery.data]);

  const upsertMaterialMutation = useMutation({
    mutationFn: (mat: Material) => upsertMaterial(mat),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }),
    onError: (err) => console.error('[AppProvider] upsertMaterial error:', err),
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: (id: string) => deleteMaterialById(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }),
    onError: (err) => console.error('[AppProvider] deleteMaterial error:', err),
  });

  const upsertLocationMutation = useMutation({
    mutationFn: (loc: CollectionLocation) => upsertLocation(loc),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locations'] }),
    onError: (err) => console.error('[AppProvider] upsertLocation error:', err),
  });

  const deleteLocationMutation = useMutation({
    mutationFn: (id: string) => deleteLocationById(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locations'] }),
    onError: (err) => console.error('[AppProvider] deleteLocation error:', err),
  });

  const upsertSchedulesMutation = useMutation({
    mutationFn: async (params: { toUpsert: DaySchedule[]; toDelete: string[] }) => {
      await Promise.all([
        params.toUpsert.length > 0 ? upsertSchedules(params.toUpsert) : Promise.resolve(),
        ...params.toDelete.map((id) => deleteScheduleById(id)),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
    onError: (err) => console.error('[AppProvider] upsertSchedules error:', err),
  });

  const insertOverrideMutation = useMutation({
    mutationFn: (override: ScheduleOverride) => insertOverrideRecord(override),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['overrides'] }),
    onError: (err) => console.error('[AppProvider] insertOverride error:', err),
  });

  useEffect(() => {
    if (locations.length === 0) return;
    console.log('[AppProvider] Running urgency detection...');
    const alerts: UrgencyAlert[] = [];

    locations.forEach((loc) => {
      if (!loc.active) return;
      const { isUrgent, weeksFullCount, suggestedExtraDay } = detectUrgency(
        loc.fillHistory,
        loc.frequencyDays
      );

      if (isUrgent) {
        const existingDismissed = urgencyAlerts.find(
          (a) => a.locationId === loc.id && a.dismissed && a.weeksFullCount === weeksFullCount
        );
        if (!existingDismissed) {
          console.log(`[AppProvider] Urgency detected for ${loc.name}: ${weeksFullCount} weeks full`);
          alerts.push({
            locationId: loc.id,
            type: 'consistent_full',
            message: `${loc.name} ha estado lleno ${weeksFullCount} visitas consecutivas. Se recomienda una visita adicional.`,
            suggestedExtraDay,
            weeksFullCount,
            dismissed: false,
          });
        }
      }
    });

    if (alerts.length > 0) {
      setUrgencyAlerts((prev) => {
        const existingIds = new Set(prev.filter((a) => !a.dismissed).map((a) => a.locationId));
        const newAlerts = alerts.filter((a) => !existingIds.has(a.locationId));
        return [
          ...prev.filter((a) => a.dismissed),
          ...alerts.filter((a) => existingIds.has(a.locationId)).length > 0
            ? alerts
            : [...prev.filter((a) => !a.dismissed), ...newAlerts],
        ];
      });
    }
  }, [locations]);

  const addMaterial = useCallback(
    (material: Material) => {
      const updated = [...materials, material];
      setMaterials(updated);
      upsertMaterialMutation.mutate(material);
    },
    [materials]
  );

  const updateMaterial = useCallback(
    (material: Material) => {
      const updated = materials.map((m) => (m.id === material.id ? material : m));
      setMaterials(updated);
      upsertMaterialMutation.mutate(material);
    },
    [materials]
  );

  const deleteMaterial = useCallback(
    (id: string) => {
      const updated = materials.filter((m) => m.id !== id);
      setMaterials(updated);
      deleteMaterialMutation.mutate(id);
    },
    [materials]
  );

  const addLocation = useCallback(
    (location: CollectionLocation) => {
      const updated = [...locations, location];
      setLocations(updated);
      upsertLocationMutation.mutate(location);
    },
    [locations]
  );

  const updateLocation = useCallback(
    (location: CollectionLocation) => {
      const updated = locations.map((l) => (l.id === location.id ? location : l));
      setLocations(updated);
      upsertLocationMutation.mutate(location);
    },
    [locations]
  );

  const deleteLocation = useCallback(
    (id: string) => {
      const updated = locations.filter((l) => l.id !== id);
      setLocations(updated);
      deleteLocationMutation.mutate(id);
    },
    [locations]
  );

  const updateLocationFrequency = useCallback(
    (locationId: string, newFrequency: number) => {
      console.log(`[AppProvider] Updating frequency for ${locationId} to ${newFrequency} days`);
      const loc = locations.find((l) => l.id === locationId);
      if (!loc) return;

      const updatedLocation: CollectionLocation = {
        ...loc,
        frequencyDays: newFrequency,
        nextCollection: loc.lastCollected
          ? addDays(loc.lastCollected, newFrequency)
          : loc.nextCollection,
      };

      const updatedLocations = locations.map((l) => (l.id === locationId ? updatedLocation : l));
      setLocations(updatedLocations);
      upsertLocationMutation.mutate(updatedLocation);
    },
    [locations]
  );

  const rescheduleLocation = useCallback(
    (
      locationId: string,
      newDate: string,
      reason: ScheduleOverride['reason'] = 'client_request'
    ) => {
      console.log(`[AppProvider] Rescheduling ${locationId} to ${newDate}, reason: ${reason}`);
      const loc = locations.find((l) => l.id === locationId);
      if (!loc) return;

      const override: ScheduleOverride = {
        id: `ovr_${Date.now()}`,
        locationId,
        originalDate: loc.nextCollection,
        newDate,
        reason,
        createdAt: new Date().toISOString(),
      };

      const updatedOverrides = [...overrides, override];
      setOverrides(updatedOverrides);
      insertOverrideMutation.mutate(override);

      const updatedLocation: CollectionLocation = { ...loc, nextCollection: newDate };
      const updatedLocations = locations.map((l) => (l.id === locationId ? updatedLocation : l));
      setLocations(updatedLocations);
      upsertLocationMutation.mutate(updatedLocation);

      const toUpsert: DaySchedule[] = [];
      const toDelete: string[] = [];

      const oldSchedule = schedules.find(
        (s) => s.date === loc.nextCollection && s.stops.some((st) => st.locationId === locationId)
      );

      let updatedSchedules = [...schedules];

      if (oldSchedule) {
        const updatedOldStops = oldSchedule.stops.filter((st) => st.locationId !== locationId);
        if (updatedOldStops.length === 0) {
          updatedSchedules = updatedSchedules.filter((s) => s.date !== oldSchedule.date);
          toDelete.push(oldSchedule.date);
        } else {
          const updated = { ...oldSchedule, stops: updatedOldStops };
          updatedSchedules = updatedSchedules.map((s) =>
            s.date === oldSchedule.date ? updated : s
          );
          toUpsert.push(updated);
        }
      }

      let newDaySchedule = updatedSchedules.find((s) => s.date === newDate);
      const newStop: ScheduledStop = {
        locationId,
        materialIds: loc.materialIds,
        order: newDaySchedule ? newDaySchedule.stops.length : 0,
        completed: false,
      };

      if (newDaySchedule) {
        const alreadyExists = newDaySchedule.stops.some((st) => st.locationId === locationId);
        if (!alreadyExists) {
          const updated = { ...newDaySchedule, stops: [...newDaySchedule.stops, newStop], completed: false };
          updatedSchedules = updatedSchedules.map((s) => (s.date === newDate ? updated : s));
          toUpsert.push(updated);
        }
      } else {
        const created: DaySchedule = { date: newDate, stops: [newStop], completed: false };
        updatedSchedules.push(created);
        toUpsert.push(created);
      }

      setSchedules(updatedSchedules);
      upsertSchedulesMutation.mutate({ toUpsert, toDelete });
    },
    [locations, schedules, overrides]
  );

  const addExtraVisit = useCallback(
    (locationId: string, date: string) => {
      console.log(`[AppProvider] Adding extra visit for ${locationId} on ${date}`);
      const loc = locations.find((l) => l.id === locationId);
      if (!loc) return;

      const override: ScheduleOverride = {
        id: `ovr_${Date.now()}`,
        locationId,
        newDate: date,
        reason: 'urgency_auto',
        createdAt: new Date().toISOString(),
      };

      const updatedOverrides = [...overrides, override];
      setOverrides(updatedOverrides);
      insertOverrideMutation.mutate(override);

      let updatedSchedules = [...schedules];
      const daySchedule = updatedSchedules.find((s) => s.date === date);
      const newStop: ScheduledStop = {
        locationId,
        materialIds: loc.materialIds,
        order: daySchedule ? daySchedule.stops.length : 0,
        completed: false,
      };

      let toUpsert: DaySchedule;

      if (daySchedule) {
        const alreadyExists = daySchedule.stops.some((st) => st.locationId === locationId);
        if (!alreadyExists) {
          toUpsert = { ...daySchedule, stops: [...daySchedule.stops, newStop], completed: false };
          updatedSchedules = updatedSchedules.map((s) => (s.date === date ? toUpsert : s));
        } else {
          return;
        }
      } else {
        toUpsert = { date, stops: [newStop], completed: false };
        updatedSchedules.push(toUpsert);
      }

      setSchedules(updatedSchedules);
      upsertSchedulesMutation.mutate({ toUpsert: [toUpsert], toDelete: [] });
    },
    [locations, schedules, overrides]
  );

  const dismissUrgencyAlert = useCallback((locationId: string) => {
    setUrgencyAlerts((prev) =>
      prev.map((a) => (a.locationId === locationId ? { ...a, dismissed: true } : a))
    );
  }, []);

  const acceptUrgencyAlert = useCallback(
    (locationId: string) => {
      const alert = urgencyAlerts.find((a) => a.locationId === locationId && !a.dismissed);
      if (alert) {
        addExtraVisit(locationId, alert.suggestedExtraDay);
        dismissUrgencyAlert(locationId);
      }
    },
    [urgencyAlerts, addExtraVisit, dismissUrgencyAlert]
  );

  const completeStop = useCallback(
    (date: string, locationId: string, fillLevel: FillLevel, photoUri?: string) => {
      console.log(`[AppProvider] Completing stop: ${locationId} on ${date} with fill level ${fillLevel}`);

      const loc = locations.find((l) => l.id === locationId);
      if (!loc) return;

      const previousLocationSnapshot = {
        lastCollected: loc.lastCollected,
        nextCollection: loc.nextCollection,
        currentFillLevel: loc.currentFillLevel,
        frequencyDays: loc.frequencyDays,
        fillHistoryLength: loc.fillHistory.length,
      };

      const newFrequency = suggestFrequency([
        ...loc.fillHistory.map((h) => ({ level: h.level, date: h.date })),
        { level: fillLevel, date },
      ]);

      const updatedLocation: CollectionLocation = {
        ...loc,
        lastCollected: date,
        nextCollection: addDays(date, newFrequency),
        currentFillLevel: fillLevel,
        frequencyDays: newFrequency,
        fillHistory: [
          ...loc.fillHistory,
          { date, level: fillLevel, materialId: loc.materialIds[0] ?? '', photoUri },
        ],
        photoUri: photoUri ?? loc.photoUri,
      };

      const updatedLocations = locations.map((l) => (l.id === locationId ? updatedLocation : l));
      setLocations(updatedLocations);
      upsertLocationMutation.mutate(updatedLocation);

      let daySchedule = schedules.find((s) => s.date === date);
      if (!daySchedule) {
        const stops = getStopsForDate(locations, date, schedules);
        daySchedule = { date, stops, completed: false };
      }

      const updatedStops = daySchedule.stops.map((stop) =>
        stop.locationId === locationId
          ? {
              ...stop,
              completed: true,
              fillLevelAfter: fillLevel,
              photoUri,
              collectedAt: new Date().toISOString(),
              previousLocationSnapshot,
            }
          : stop
      );

      const allCompleted = updatedStops.every((s) => s.completed);
      const updatedSchedule: DaySchedule = { ...daySchedule, stops: updatedStops, completed: allCompleted };

      const updatedSchedules = schedules.some((s) => s.date === date)
        ? schedules.map((s) => (s.date === date ? updatedSchedule : s))
        : [...schedules, updatedSchedule];

      setSchedules(updatedSchedules);
      upsertSchedulesMutation.mutate({ toUpsert: [updatedSchedule], toDelete: [] });
    },
    [locations, schedules]
  );

  const uncompleteStop = useCallback(
    (date: string, locationId: string) => {
      console.log(`[AppProvider] Undoing stop completion: ${locationId} on ${date}`);

      const daySchedule = schedules.find((s) => s.date === date);
      if (!daySchedule) return;

      const stop = daySchedule.stops.find((s) => s.locationId === locationId);
      if (!stop || !stop.completed || !stop.previousLocationSnapshot) return;

      const snapshot = stop.previousLocationSnapshot;
      const loc = locations.find((l) => l.id === locationId);
      if (!loc) return;

      const restoredLocation: CollectionLocation = {
        ...loc,
        lastCollected: snapshot.lastCollected,
        nextCollection: snapshot.nextCollection,
        currentFillLevel: snapshot.currentFillLevel,
        frequencyDays: snapshot.frequencyDays,
        fillHistory: loc.fillHistory.slice(0, snapshot.fillHistoryLength),
      };

      const updatedLocations = locations.map((l) => (l.id === locationId ? restoredLocation : l));
      setLocations(updatedLocations);
      upsertLocationMutation.mutate(restoredLocation);

      const updatedStops = daySchedule.stops.map((s) =>
        s.locationId === locationId
          ? { locationId: s.locationId, materialIds: s.materialIds, order: s.order, completed: false }
          : s
      );

      const updatedSchedule: DaySchedule = { ...daySchedule, stops: updatedStops, completed: false };
      const updatedSchedules = schedules.map((s) => (s.date === date ? updatedSchedule : s));
      setSchedules(updatedSchedules);
      upsertSchedulesMutation.mutate({ toUpsert: [updatedSchedule], toDelete: [] });
    },
    [locations, schedules]
  );

  const getTodayStops = useCallback((): ScheduledStop[] => {
    const today = getDateString();
    return getStopsForDate(locations, today, schedules);
  }, [locations, schedules]);

  const getStopsForDateFn = useCallback(
    (date: string): ScheduledStop[] => {
      return getStopsForDate(locations, date, schedules);
    },
    [locations, schedules]
  );

  const getLocationById = useCallback(
    (id: string): CollectionLocation | undefined => {
      return locations.find((l) => l.id === id);
    },
    [locations]
  );

  const getMaterialById = useCallback(
    (id: string): Material | undefined => {
      return materials.find((m) => m.id === id);
    },
    [materials]
  );

  const activeAlerts = useMemo(() => {
    return urgencyAlerts.filter((a) => !a.dismissed);
  }, [urgencyAlerts]);

  const getOverridesForLocation = useCallback(
    (locationId: string): ScheduleOverride[] => {
      return overrides.filter((o) => o.locationId === locationId);
    },
    [overrides]
  );

  const isLoading =
    materialsQuery.isLoading ||
    locationsQuery.isLoading ||
    schedulesQuery.isLoading;

  const hasError =
    !!materialsQuery.error ||
    !!locationsQuery.error ||
    !!schedulesQuery.error;

  return {
    materials,
    locations,
    schedules,
    overrides,
    urgencyAlerts: activeAlerts,
    isLoading,
    hasError,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addLocation,
    updateLocation,
    deleteLocation,
    updateLocationFrequency,
    rescheduleLocation,
    addExtraVisit,
    dismissUrgencyAlert,
    acceptUrgencyAlert,
    completeStop,
    uncompleteStop,
    getTodayStops,
    getStopsForDate: getStopsForDateFn,
    getLocationById,
    getMaterialById,
    getOverridesForLocation,
  };
});
