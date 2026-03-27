import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Plus, Search, MapPin, Building2, Home, GraduationCap, Warehouse, HelpCircle, Info, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/providers/AppProvider';
import { useTutorial } from '@/providers/TutorialProvider';
import Colors, { FILL_COLORS, FILL_LABELS } from '@/constants/colors';
import { CollectionLocation, LOCATION_TYPE_LABELS } from '@/types';
import MaterialBadge from '@/components/MaterialBadge';
import FillLevelBar from '@/components/FillLevelBar';
import TutorialOverlay, { TutorialStep } from '@/components/TutorialOverlay';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  centro_acopio: <Warehouse size={16} color={Colors.accent} />,
  casa: <Home size={16} color={Colors.info} />,
  empresa: <Building2 size={16} color={Colors.primary} />,
  escuela: <GraduationCap size={16} color={Colors.warning} />,
  otro: <MapPin size={16} color={Colors.textSecondary} />,
};

export default function LocationsScreen() {
  const { locations, materials } = useApp();
  const { hasSeen, markSeen, isLoaded } = useTutorial();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (isLoaded && !hasSeen('locations')) {
      const timer = setTimeout(() => setShowTutorial(true), 400);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
    markSeen('locations');
  }, [markSeen]);

  const reopenTutorial = useCallback(() => {
    Haptics.selectionAsync();
    setShowTutorial(true);
  }, []);

  const tutorialSteps = useMemo((): TutorialStep[] => [
    {
      icon: <MapPin size={36} color="#fff" />,
      iconBg: Colors.info,
      title: 'Puntos de Recolección',
      description: 'Aquí ves todos tus puntos de recolección activos con su tipo, materiales y nivel de llenado actual.',
    },
    {
      icon: <Search size={36} color="#fff" />,
      iconBg: Colors.cardElevated,
      title: 'Buscar Ubicación',
      description: 'Usa la barra de búsqueda para encontrar rápidamente cualquier ubicación por nombre o dirección.',
    },
    {
      icon: <Plus size={36} color="#fff" />,
      iconBg: Colors.primary,
      title: 'Agregar Ubicación',
      description: 'Toca el botón verde "+" para agregar un nuevo punto de recolección con su dirección, materiales y frecuencia de visita.',
    },
    {
      icon: <ChevronRight size={36} color="#fff" />,
      iconBg: Colors.accent,
      title: 'Ver Detalles',
      description: 'Toca cualquier tarjeta para ver el historial completo de recolecciones, ajustar la frecuencia y más detalles.',
    },
  ], []);

  const filtered = useMemo(() => {
    if (!search.trim()) return locations.filter(l => l.active);
    const q = search.toLowerCase();
    return locations.filter(
      l => l.active && (l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q))
    );
  }, [locations, search]);

  const handleAdd = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/locations/add' as never);
  }, [router]);

  const handlePress = useCallback((id: string) => {
    Haptics.selectionAsync();
    router.push(`/locations/${id}` as never);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: CollectionLocation }) => {
    const locMats = item.materialIds
      .map(id => materials.find(m => m.id === id))
      .filter(Boolean);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handlePress(item.id)}
        activeOpacity={0.7}
        testID={`location-${item.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.typeIcon}>
            {TYPE_ICONS[item.type] || TYPE_ICONS.otro}
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardType}>{LOCATION_TYPE_LABELS[item.type]}</Text>
          </View>
          <View style={[styles.fillBadge, { backgroundColor: FILL_COLORS[item.currentFillLevel] + '33' }]}>
            <View style={[styles.fillBadgeDot, { backgroundColor: FILL_COLORS[item.currentFillLevel] }]} />
            <Text style={[styles.fillBadgeText, { color: FILL_COLORS[item.currentFillLevel] }]}>
              {FILL_LABELS[item.currentFillLevel]}
            </Text>
          </View>
        </View>

        <View style={styles.cardAddress}>
          <MapPin size={12} color={Colors.textTertiary} />
          <Text style={styles.cardAddressText} numberOfLines={1}>{item.address}</Text>
        </View>

        <View style={styles.cardMaterials}>
          {locMats.map(mat => mat && (
            <MaterialBadge key={mat.id} name={mat.name} color={mat.color} small />
          ))}
        </View>

        <View style={styles.cardFooter}>
          <FillLevelBar level={item.currentFillLevel} height={4} />
          <Text style={styles.frequencyText}>Cada {item.frequencyDays} días</Text>
        </View>
      </TouchableOpacity>
    );
  }, [materials, handlePress]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Ubicaciones',
          headerRight: () => (
            <TouchableOpacity onPress={reopenTutorial} style={styles.helpBtn} testID="open-tutorial-locations">
              <HelpCircle size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar ubicación..."
              placeholderTextColor={Colors.textTertiary}
              value={search}
              onChangeText={setSearch}
              testID="search-input"
            />
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd} testID="add-location-btn">
            <Plus size={22} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MapPin size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No se encontraron ubicaciones</Text>
            </View>
          }
        />
      </View>

      <TutorialOverlay
        visible={showTutorial}
        steps={tutorialSteps}
        onClose={handleCloseTutorial}
        screenTitle="Tutorial — Ubicaciones"
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  cardType: {
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 1,
  },
  fillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  fillBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  fillBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  cardAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  cardAddressText: {
    color: Colors.textTertiary,
    fontSize: 12,
    flex: 1,
  },
  cardMaterials: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  cardFooter: {
    marginTop: 10,
    gap: 6,
  },
  frequencyText: {
    color: Colors.textTertiary,
    fontSize: 11,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: Colors.textTertiary,
    fontSize: 15,
    marginTop: 12,
  },
});
