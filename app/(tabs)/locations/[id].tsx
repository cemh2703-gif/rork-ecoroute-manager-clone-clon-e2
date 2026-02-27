import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MapPin, Clock, Trash2, Edit3, Save, Camera, TrendingUp, CalendarDays, Minus, Plus, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useApp } from '@/providers/AppProvider';
import Colors, { FILL_COLORS, FILL_LABELS } from '@/constants/colors';
import { LOCATION_TYPE_LABELS, FillLevel } from '@/types';
import MaterialBadge from '@/components/MaterialBadge';
import FillLevelBar from '@/components/FillLevelBar';
import { formatDateShort, formatDateFull, suggestFrequency } from '@/utils/dates';

const PRESET_FREQUENCIES = [1, 2, 3, 5, 7, 10, 14, 21, 30];

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getLocationById, materials, updateLocation, deleteLocation, updateLocationFrequency, getOverridesForLocation } = useApp();
  const router = useRouter();

  const location = useMemo(() => getLocationById(id ?? ''), [id, getLocationById]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(location?.name ?? '');
  const [editAddress, setEditAddress] = useState(location?.address ?? '');
  const [editingFrequency, setEditingFrequency] = useState(false);
  const [customFreq, setCustomFreq] = useState(location?.frequencyDays ?? 7);

  const overrides = useMemo(() => getOverridesForLocation(id ?? ''), [id, getOverridesForLocation]);

  const locMats = useMemo(() => {
    if (!location) return [];
    return location.materialIds
      .map(mid => materials.find(m => m.id === mid))
      .filter(Boolean);
  }, [location, materials]);

  const recentHistory = useMemo(() => {
    if (!location) return [];
    return [...location.fillHistory].reverse().slice(0, 10);
  }, [location]);

  const suggestedFreq = useMemo(() => {
    if (!location || location.fillHistory.length < 2) return null;
    return suggestFrequency(location.fillHistory);
  }, [location]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Eliminar ubicación',
      '¿Estás seguro de que quieres eliminar esta ubicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            if (id) {
              deleteLocation(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              router.back();
            }
          },
        },
      ]
    );
  }, [id, deleteLocation, router]);

  const handleSaveEdit = useCallback(() => {
    if (!location) return;
    updateLocation({ ...location, name: editName.trim(), address: editAddress.trim() });
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [location, editName, editAddress, updateLocation]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0] && location) {
        updateLocation({ ...location, photoUri: result.assets[0].uri });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.log('[LocationDetail] Camera error:', e);
    }
  }, [location, updateLocation]);

  const handleSaveFrequency = useCallback(() => {
    if (!id || customFreq < 1) return;
    updateLocationFrequency(id, customFreq);
    setEditingFrequency(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [id, customFreq, updateLocationFrequency]);

  const handleReschedule = useCallback(() => {
    if (!id) return;
    Haptics.selectionAsync();
    router.push({ pathname: '/reschedule' as any, params: { locationId: id } });
  }, [id, router]);

  if (!location) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'No encontrado' }} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Ubicación no encontrada</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: location.name }} />

      {location.photoUri && (
        <View style={styles.photoContainer}>
          <Image source={{ uri: location.photoUri }} style={styles.photo} contentFit="cover" />
        </View>
      )}

      <View style={styles.headerCard}>
        {editing ? (
          <View style={styles.editFields}>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nombre"
              placeholderTextColor={Colors.textTertiary}
            />
            <TextInput
              style={styles.editInput}
              value={editAddress}
              onChangeText={setEditAddress}
              placeholder="Dirección"
              placeholderTextColor={Colors.textTertiary}
            />
            <TouchableOpacity style={styles.saveEditBtn} onPress={handleSaveEdit}>
              <Save size={16} color={Colors.textInverse} />
              <Text style={styles.saveEditBtnText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Text style={styles.locationName}>{location.name}</Text>
                <Text style={styles.locationType}>{LOCATION_TYPE_LABELS[location.type]}</Text>
              </View>
              <TouchableOpacity onPress={() => { setEditing(true); Haptics.selectionAsync(); }}>
                <Edit3 size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.addressRow}>
              <MapPin size={14} color={Colors.textTertiary} />
              <Text style={styles.addressText}>{location.address}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => { setEditingFrequency(true); setCustomFreq(location.frequencyDays); Haptics.selectionAsync(); }}
          activeOpacity={0.7}
        >
          <Text style={styles.statValue}>{location.frequencyDays}d</Text>
          <Text style={styles.statLabel}>Frecuencia</Text>
          <Edit3 size={10} color={Colors.textTertiary} style={{ marginTop: 2 }} />
        </TouchableOpacity>
        <View style={styles.statCard}>
          <View style={[styles.statDot, { backgroundColor: FILL_COLORS[location.currentFillLevel] }]} />
          <Text style={styles.statValueSmall}>
            {FILL_LABELS[location.currentFillLevel]}
          </Text>
          <Text style={styles.statLabel}>Nivel actual</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{location.fillHistory.length}</Text>
          <Text style={styles.statLabel}>Visitas</Text>
        </View>
      </View>

      {editingFrequency && (
        <View style={styles.frequencyEditor}>
          <Text style={styles.frequencyEditorTitle}>Frecuencia de recolección</Text>
          <Text style={styles.frequencyEditorSubtitle}>
            Cada cuántos días se debe visitar este lugar
          </Text>

          <View style={styles.freqControl}>
            <TouchableOpacity
              style={styles.freqBtn}
              onPress={() => { if (customFreq > 1) { setCustomFreq(customFreq - 1); Haptics.selectionAsync(); } }}
            >
              <Minus size={18} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.freqValueWrap}>
              <Text style={styles.freqValue}>{customFreq}</Text>
              <Text style={styles.freqUnit}>días</Text>
            </View>
            <TouchableOpacity
              style={styles.freqBtn}
              onPress={() => { setCustomFreq(customFreq + 1); Haptics.selectionAsync(); }}
            >
              <Plus size={18} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.freqPresets}>
            {PRESET_FREQUENCIES.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.freqPreset, customFreq === f && styles.freqPresetActive]}
                onPress={() => { setCustomFreq(f); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.freqPresetText, customFreq === f && styles.freqPresetTextActive]}>
                  {f}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.freqActions}>
            <TouchableOpacity
              style={styles.freqCancelBtn}
              onPress={() => setEditingFrequency(false)}
            >
              <Text style={styles.freqCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.freqSaveBtn} onPress={handleSaveFrequency}>
              <Save size={14} color={Colors.textInverse} />
              <Text style={styles.freqSaveText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.rescheduleBtn} onPress={handleReschedule} activeOpacity={0.7}>
        <View style={styles.rescheduleIcon}>
          <CalendarDays size={18} color={Colors.accent} />
        </View>
        <View style={styles.rescheduleInfo}>
          <Text style={styles.rescheduleBtnText}>Reprogramar visita</Text>
          <Text style={styles.rescheduleSubtext}>
            Próxima: {location.nextCollection ? formatDateFull(location.nextCollection) : 'Sin programar'}
          </Text>
        </View>
        <RotateCcw size={16} color={Colors.textTertiary} />
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nivel de llenado</Text>
        <View style={styles.fillCard}>
          <FillLevelBar level={location.currentFillLevel} height={12} />
          <Text style={styles.fillText}>
            {FILL_LABELS[location.currentFillLevel]} ({location.currentFillLevel}/5)
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Materiales</Text>
        <View style={styles.materialsWrap}>
          {locMats.map(mat => mat && (
            <MaterialBadge key={mat.id} name={mat.name} color={mat.color} />
          ))}
        </View>
      </View>

      {suggestedFreq && suggestedFreq !== location.frequencyDays && (
        <View style={styles.suggestionCard}>
          <TrendingUp size={18} color={Colors.accent} />
          <View style={styles.suggestionText}>
            <Text style={styles.suggestionTitle}>Frecuencia sugerida</Text>
            <Text style={styles.suggestionDesc}>
              Basado en el historial, se recomienda recolectar cada {suggestedFreq} días
              (actualmente cada {location.frequencyDays} días)
            </Text>
          </View>
          <TouchableOpacity
            style={styles.suggestionBtn}
            onPress={() => {
              updateLocationFrequency(id ?? '', suggestedFreq);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
          >
            <Text style={styles.suggestionBtnText}>Aplicar</Text>
          </TouchableOpacity>
        </View>
      )}

      {overrides.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cambios recientes</Text>
          {overrides.slice(-5).reverse().map((ovr) => (
            <View key={ovr.id} style={styles.overrideItem}>
              <RotateCcw size={12} color={Colors.accent} />
              <Text style={styles.overrideText}>
                {ovr.reason === 'client_request' ? 'Solicitud cliente' :
                 ovr.reason === 'urgency_auto' ? 'Urgencia automática' : 'Manual'}
                {' → '}
                {formatDateShort(ovr.newDate)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {recentHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial reciente</Text>
          {recentHistory.map((record, idx) => {
            const mat = materials.find(m => m.id === record.materialId);
            return (
              <View key={idx} style={styles.historyItem}>
                <View style={styles.historyDate}>
                  <Clock size={12} color={Colors.textTertiary} />
                  <Text style={styles.historyDateText}>{formatDateShort(record.date)}</Text>
                </View>
                <View style={styles.historyLevel}>
                  <FillLevelBar level={record.level} height={6} width={60} />
                  <Text style={styles.historyLevelText}>{record.level}/5</Text>
                </View>
                {mat && (
                  <View style={[styles.historyMat, { backgroundColor: mat.color + '22' }]}>
                    <View style={[styles.historyMatDot, { backgroundColor: mat.color }]} />
                    <Text style={[styles.historyMatText, { color: mat.color }]}>{mat.name}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
          <Camera size={18} color={Colors.primary} />
          <Text style={styles.photoBtnText}>Tomar foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Trash2 size={18} color={Colors.danger} />
          <Text style={styles.deleteBtnText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.textTertiary,
    fontSize: 16,
  },
  photoContainer: {
    height: 180,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  headerCard: {
    margin: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  locationName: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  locationType: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  addressText: {
    color: Colors.textTertiary,
    fontSize: 13,
    flex: 1,
  },
  editFields: {
    gap: 10,
  },
  editInput: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 10,
    padding: 12,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveEditBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  saveEditBtnText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  statValue: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statValueSmall: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  statLabel: {
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  frequencyEditor: {
    margin: 16,
    marginTop: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.info + '44',
  },
  frequencyEditorTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  frequencyEditorSubtitle: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 16,
  },
  freqControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  freqBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  freqValueWrap: {
    alignItems: 'center',
    minWidth: 80,
  },
  freqValue: {
    color: Colors.text,
    fontSize: 36,
    fontWeight: '800' as const,
  },
  freqUnit: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginTop: -2,
  },
  freqPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  freqPreset: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  freqPresetActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primary,
  },
  freqPresetText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  freqPresetTextActive: {
    color: Colors.primary,
  },
  freqActions: {
    flexDirection: 'row',
    gap: 10,
  },
  freqCancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  freqCancelText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  freqSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  freqSaveText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  rescheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginTop: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.accent + '33',
  },
  rescheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescheduleInfo: {
    flex: 1,
  },
  rescheduleBtnText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  rescheduleSubtext: {
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  fillCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fillText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  materialsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: Colors.accentBg,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  suggestionText: {
    flex: 1,
  },
  suggestionTitle: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  suggestionDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  suggestionBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  suggestionBtnText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  overrideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overrideText: {
    color: Colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  historyDateText: {
    color: Colors.textTertiary,
    fontSize: 12,
  },
  historyLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  historyLevelText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  historyMat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  historyMatDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  historyMatText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 24,
    gap: 10,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.primaryBg,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  photoBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.dangerBg,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.danger + '44',
  },
  deleteBtnText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
