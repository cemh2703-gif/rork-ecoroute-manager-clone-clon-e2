import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { Stack } from 'expo-router';
import { Plus, Trash2, Edit3, Check, X, Palette, HelpCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/providers/AppProvider';
import { useTutorial } from '@/providers/TutorialProvider';
import Colors from '@/constants/colors';
import { Material } from '@/types';
import TutorialOverlay, { TutorialStep } from '@/components/TutorialOverlay';

const PRESET_COLORS = [
  '#C4813D', '#8C9BA5', '#5C9CE6', '#4CAF50', '#AB47BC', '#FF5722',
  '#FF9800', '#E91E63', '#00BCD4', '#795548', '#607D8B', '#FFEB3B',
  '#9C27B0', '#3F51B5', '#009688', '#F44336', '#2196F3', '#8BC34A',
];

export default function MaterialsScreen() {
  const { materials, addMaterial, updateMaterial, deleteMaterial } = useApp();
  const { hasSeen, markSeen, isLoaded } = useTutorial();

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (isLoaded && !hasSeen('materials')) {
      const timer = setTimeout(() => setShowTutorial(true), 400);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
    markSeen('materials');
  }, [markSeen]);

  const reopenTutorial = useCallback(() => {
    Haptics.selectionAsync();
    setShowTutorial(true);
  }, []);

  const tutorialSteps = useMemo((): TutorialStep[] => [
    {
      icon: <Palette size={36} color="#fff" />,
      iconBg: Colors.accent,
      title: 'Tipos de Materiales',
      description: 'Aquí configuras los tipos de materiales reciclables que recolectas en tus rutas, como cartón, PET, vidrio, etc.',
    },
    {
      icon: <Plus size={36} color="#fff" />,
      iconBg: Colors.primary,
      title: 'Crear Material',
      description: 'Toca "+" para agregar un nuevo tipo de material. Asígnale un nombre descriptivo y un color para identificarlo fácilmente en la ruta.',
    },
    {
      icon: <Edit3 size={36} color="#fff" />,
      iconBg: Colors.info,
      title: 'Editar y Eliminar',
      description: 'Usa el botón de lápiz para editar el nombre o color de cualquier material, o el de basura para eliminarlo si ya no lo necesitas.',
    },
  ], []);

  const handleAdd = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    const mat: Material = {
      id: `mat_${Date.now()}`,
      name: name.trim(),
      color,
    };
    addMaterial(mat);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false);
    setName('');
    setColor(PRESET_COLORS[0]);
  }, [name, color, addMaterial]);

  const handleEdit = useCallback((mat: Material) => {
    setEditingId(mat.id);
    setName(mat.name);
    setColor(mat.color);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId || !name.trim()) return;
    updateMaterial({ id: editingId, name: name.trim(), color });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditingId(null);
    setName('');
    setColor(PRESET_COLORS[0]);
  }, [editingId, name, color, updateMaterial]);

  const handleDelete = useCallback((id: string, matName: string) => {
    Alert.alert(
      'Eliminar material',
      `¿Eliminar "${matName}"? Las ubicaciones que lo usan ya no lo mostrarán.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteMaterial(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  }, [deleteMaterial]);

  const renderItem = useCallback(({ item }: { item: Material }) => {
    const isEditing = editingId === item.id;

    if (isEditing) {
      return (
        <View style={styles.editCard}>
          <TextInput
            style={styles.editInput}
            value={name}
            onChangeText={setName}
            placeholder="Nombre del material"
            placeholderTextColor={Colors.textTertiary}
            autoFocus
          />
          <View style={styles.colorGrid}>
            {PRESET_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorOption, { backgroundColor: c }, color === c && styles.colorOptionSelected]}
                onPress={() => { Haptics.selectionAsync(); setColor(c); }}
              />
            ))}
          </View>
          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.cancelEditBtn}
              onPress={() => { setEditingId(null); setName(''); }}
            >
              <X size={16} color={Colors.textSecondary} />
              <Text style={styles.cancelEditText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveEditBtnAction} onPress={handleSaveEdit}>
              <Check size={16} color={Colors.textInverse} />
              <Text style={styles.saveEditText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.materialCard}>
        <View style={[styles.materialColor, { backgroundColor: item.color }]} />
        <View style={styles.materialInfo}>
          <Text style={styles.materialName}>{item.name}</Text>
          <Text style={styles.materialHex}>{item.color}</Text>
        </View>
        <View style={styles.materialActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => handleEdit(item)}
          >
            <Edit3 size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => handleDelete(item.id, item.name)}
          >
            <Trash2 size={16} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [editingId, name, color, handleSaveEdit, handleEdit, handleDelete]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Materiales',
          headerRight: () => (
            <TouchableOpacity onPress={reopenTutorial} style={styles.helpBtn} testID="open-tutorial-materials">
              <HelpCircle size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Tipos de Material</Text>
            <Text style={styles.headerSubtitle}>{materials.length} materiales configurados</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAdd(true); }}
            testID="add-material-btn"
          >
            <Plus size={20} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={materials}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Palette size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No hay materiales</Text>
              <Text style={styles.emptySubtext}>Agrega materiales para comenzar</Text>
            </View>
          }
        />

        <Modal visible={showAdd} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nuevo Material</Text>
                <TouchableOpacity onPress={() => setShowAdd(false)}>
                  <X size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.fieldLabel}>Nombre</Text>
                <TextInput
                  style={styles.modalInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ej: Cartón, PET, Vidrio..."
                  placeholderTextColor={Colors.textTertiary}
                  testID="material-name-input"
                />

                <Text style={styles.fieldLabel}>Color</Text>
                <View style={styles.colorGrid}>
                  {PRESET_COLORS.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorOption, { backgroundColor: c }, color === c && styles.colorOptionSelected]}
                      onPress={() => { Haptics.selectionAsync(); setColor(c); }}
                    />
                  ))}
                </View>

                <View style={styles.previewRow}>
                  <View style={[styles.previewBadge, { backgroundColor: color + '22' }]}>
                    <View style={[styles.previewDot, { backgroundColor: color }]} />
                    <Text style={[styles.previewText, { color }]}>
                      {name.trim() || 'Material'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAdd} testID="save-material-btn">
                <Check size={20} color={Colors.textInverse} />
                <Text style={styles.modalSaveBtnText}>Agregar Material</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>

      <TutorialOverlay
        visible={showTutorial}
        steps={tutorialSteps}
        onClose={handleCloseTutorial}
        screenTitle="Tutorial — Materiales"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  helpBtn: {
    padding: 6,
    marginRight: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  headerSubtitle: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  materialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  materialColor: {
    width: 6,
    height: '100%',
  },
  materialInfo: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  materialName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  materialHex: {
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  materialActions: {
    flexDirection: 'row',
    paddingRight: 10,
    gap: 4,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
  },
  editCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editInput: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 10,
    padding: 12,
    color: Colors.text,
    fontSize: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  cancelEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.cardElevated,
    gap: 6,
  },
  cancelEditText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  saveEditBtnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    gap: 6,
  },
  saveEditText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: Colors.text,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 12,
  },
  emptySubtext: {
    color: Colors.textTertiary,
    fontSize: 13,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  modalBody: {
    gap: 12,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewRow: {
    alignItems: 'flex-start',
    marginTop: 4,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 20,
  },
  modalSaveBtnText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
