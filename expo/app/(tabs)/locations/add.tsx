import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { useApp } from '@/providers/AppProvider';
import Colors from '@/constants/colors';
import { CollectionLocation, LocationType, LOCATION_TYPE_LABELS } from '@/types';

const TYPES: LocationType[] = ['centro_acopio', 'empresa', 'escuela', 'casa', 'otro'];
const FREQUENCIES = [3, 7, 10, 14, 21];

export default function AddLocationScreen() {
  const { materials, addLocation } = useApp();
  const router = useRouter();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<LocationType>('empresa');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [frequency, setFrequency] = useState(7);
  const [notes, setNotes] = useState('');

  const toggleMaterial = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedMaterials(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Error', 'La dirección es requerida');
      return;
    }
    if (selectedMaterials.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un material');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const location: CollectionLocation = {
      id: `loc_${Date.now()}`,
      name: name.trim(),
      address: address.trim(),
      type,
      materialIds: selectedMaterials,
      frequencyDays: frequency,
      lastCollected: undefined,
      nextCollection: today,
      fillHistory: [],
      currentFillLevel: 0,
      notes: notes.trim() || undefined,
      active: true,
    };

    addLocation(location);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [name, address, type, selectedMaterials, frequency, notes, addLocation, router]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Centro de Acopio Municipal"
          placeholderTextColor={Colors.textTertiary}
          testID="name-input"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Dirección</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Ej: Av. Reforma 450, Centro"
          placeholderTextColor={Colors.textTertiary}
          testID="address-input"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.typeGrid}>
          {TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, type === t && styles.typeChipSelected]}
              onPress={() => { Haptics.selectionAsync(); setType(t); }}
            >
              <Text style={[styles.typeChipText, type === t && styles.typeChipTextSelected]}>
                {LOCATION_TYPE_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Materiales a recolectar</Text>
        <View style={styles.materialsGrid}>
          {materials.map(mat => {
            const isSelected = selectedMaterials.includes(mat.id);
            return (
              <TouchableOpacity
                key={mat.id}
                style={[
                  styles.materialChip,
                  { borderColor: isSelected ? mat.color : Colors.border },
                  isSelected && { backgroundColor: mat.color + '22' },
                ]}
                onPress={() => toggleMaterial(mat.id)}
              >
                <View style={[styles.materialDot, { backgroundColor: mat.color }]} />
                <Text style={[styles.materialChipText, isSelected && { color: mat.color }]}>
                  {mat.name}
                </Text>
                {isSelected && <Check size={14} color={mat.color} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Frecuencia de recolección</Text>
        <View style={styles.frequencyRow}>
          {FREQUENCIES.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.freqChip, frequency === f && styles.freqChipSelected]}
              onPress={() => { Haptics.selectionAsync(); setFrequency(f); }}
            >
              <Text style={[styles.freqChipText, frequency === f && styles.freqChipTextSelected]}>
                {f}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.frequencyHint}>
          Se ajustará automáticamente según el nivel de llenado
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Notas (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Información adicional..."
          placeholderTextColor={Colors.textTertiary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} testID="save-location-btn">
        <Check size={20} color={Colors.textInverse} />
        <Text style={styles.saveBtnText}>Guardar Ubicación</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipSelected: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primary,
  },
  typeChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  typeChipTextSelected: {
    color: Colors.primary,
  },
  materialsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  materialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    gap: 6,
  },
  materialDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  materialChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  freqChipSelected: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primary,
  },
  freqChipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  freqChipTextSelected: {
    color: Colors.primary,
  },
  frequencyHint: {
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 6,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
