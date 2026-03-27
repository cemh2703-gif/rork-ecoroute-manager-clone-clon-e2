import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle, Camera, MapPin, Clock, ChevronRight, RotateCcw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Colors, { FILL_LABELS } from '@/constants/colors';
import { ScheduledStop, FillLevel, CollectionLocation, Material } from '@/types';
import FillLevelBar from './FillLevelBar';
import MaterialBadge from './MaterialBadge';

interface StopCardProps {
  stop: ScheduledStop;
  location: CollectionLocation | undefined;
  materials: Material[];
  onComplete: (locationId: string, fillLevel: FillLevel, photoUri?: string) => void;
  onUndo?: (locationId: string) => void;
  index: number;
}

export default function StopCard({ stop, location, materials, onComplete, onUndo, index }: StopCardProps) {
  const [selectingFill, setSelectingFill] = useState(false);

  const handleComplete = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectingFill(true);
  }, []);

  const handleSelectFill = useCallback(async (level: FillLevel) => {
    setSelectingFill(false);

    let photoUri: string | undefined;
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        photoUri = result.assets[0].uri;
      }
    } catch (e) {
      console.log('[StopCard] Camera not available:', e);
    }

    onComplete(stop.locationId, level, photoUri);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [stop.locationId, onComplete]);

  const handleUndo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUndo?.(stop.locationId);
  }, [stop.locationId, onUndo]);

  if (!location) return null;

  const stopMaterials = stop.materialIds
    .map(id => materials.find(m => m.id === id))
    .filter(Boolean) as Material[];

  return (
    <View style={[styles.card, stop.completed && styles.cardCompleted]}>
      <View style={styles.orderBadge}>
        <Text style={styles.orderText}>{index + 1}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.name} numberOfLines={1}>{location.name}</Text>
            <View style={styles.addressRow}>
              <MapPin size={12} color={Colors.textTertiary} />
              <Text style={styles.address} numberOfLines={1}>{location.address}</Text>
            </View>
          </View>
          {stop.completed ? (
            <CheckCircle size={24} color={Colors.primary} />
          ) : (
            <ChevronRight size={20} color={Colors.textTertiary} />
          )}
        </View>

        <View style={styles.materialsRow}>
          {stopMaterials.map(mat => (
            <MaterialBadge key={mat.id} name={mat.name} color={mat.color} small />
          ))}
        </View>

        <View style={styles.fillRow}>
          <Text style={styles.fillLabel}>Nivel: {FILL_LABELS[location.currentFillLevel]}</Text>
          <FillLevelBar level={location.currentFillLevel} />
        </View>

        {selectingFill ? (
          <View style={styles.fillSelector}>
            <Text style={styles.fillSelectorTitle}>¿Qué tan lleno está?</Text>
            <View style={styles.fillOptions}>
              {([0, 1, 2, 3, 4, 5] as FillLevel[]).map(level => (
                <TouchableOpacity
                  key={level}
                  style={styles.fillOption}
                  onPress={() => handleSelectFill(level)}
                  testID={`fill-option-${level}`}
                >
                  <View style={[styles.fillOptionDot, { backgroundColor: Colors.primary, opacity: 0.2 + (level / 5) * 0.8 }]} />
                  <Text style={styles.fillOptionText}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : !stop.completed ? (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.completeBtn} onPress={handleComplete} testID="complete-stop-btn">
              <CheckCircle size={16} color={Colors.textInverse} />
              <Text style={styles.completeBtnText}>Completar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.completedRow}>
            <View style={styles.completedInfo}>
              <Clock size={12} color={Colors.primary} />
              <Text style={styles.completedText}>Recolectado</Text>
            </View>
            {stop.previousLocationSnapshot && onUndo && (
              <TouchableOpacity
                style={styles.undoBtn}
                onPress={handleUndo}
                testID="undo-stop-btn"
                activeOpacity={0.7}
              >
                <RotateCcw size={12} color={Colors.accent} />
                <Text style={styles.undoBtnText}>Deshacer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardCompleted: {
    opacity: 0.7,
    borderColor: Colors.primaryDim,
  },
  orderBadge: {
    width: 40,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 3,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    color: Colors.textTertiary,
    fontSize: 12,
    flex: 1,
  },
  materialsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  fillRow: {
    marginTop: 10,
    gap: 4,
  },
  fillLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  fillSelector: {
    marginTop: 12,
    backgroundColor: Colors.cardElevated,
    borderRadius: 10,
    padding: 12,
  },
  fillSelectorTitle: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  fillOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fillOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    minWidth: 40,
  },
  fillOptionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginBottom: 4,
  },
  fillOptionText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
  },
  completeBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  completeBtnText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  completedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.accentBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  undoBtnText: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '600' as const,
  },
});
