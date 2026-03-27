import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { ChevronLeft, ChevronRight, MapPin, CalendarDays, Calendar, ArrowLeftRight, HelpCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/providers/AppProvider';
import { useTutorial } from '@/providers/TutorialProvider';
import Colors from '@/constants/colors';
import { getDateString, getMonthDates, getFirstDayOfWeek, formatDateShort } from '@/utils/dates';
import MaterialBadge from '@/components/MaterialBadge';
import FillLevelBar from '@/components/FillLevelBar';
import TutorialOverlay, { TutorialStep } from '@/components/TutorialOverlay';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function CalendarScreen() {
  const { locations, materials, getStopsForDate, getLocationById } = useApp();
  const { hasSeen, markSeen, isLoaded } = useTutorial();
  const router = useRouter();

  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (isLoaded && !hasSeen('calendar')) {
      const timer = setTimeout(() => setShowTutorial(true), 400);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
    markSeen('calendar');
  }, [markSeen]);

  const reopenTutorial = useCallback(() => {
    Haptics.selectionAsync();
    setShowTutorial(true);
  }, []);

  const tutorialSteps = useMemo((): TutorialStep[] => [
    {
      icon: <Calendar size={36} color="#fff" />,
      iconBg: Colors.accent,
      title: 'Vista Mensual',
      description: 'Navega entre meses con las flechas ‹ ›. Los puntos de colores en cada día indican los tipos de materiales programados.',
    },
    {
      icon: <MapPin size={36} color="#fff" />,
      iconBg: Colors.info,
      title: 'Seleccionar Día',
      description: 'Toca cualquier día del calendario para ver el detalle de las paradas programadas en esa fecha.',
    },
    {
      icon: <ArrowLeftRight size={36} color="#fff" />,
      iconBg: Colors.primary,
      title: 'Reprogramar Parada',
      description: 'En las paradas pendientes, toca "Reprogramar" para elegir una nueva fecha de recolección para esa ubicación.',
    },
  ], []);

  const today = getDateString();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const monthDates = useMemo(
    () => getMonthDates(currentMonth.year, currentMonth.month),
    [currentMonth]
  );
  const firstDayOfWeek = useMemo(
    () => getFirstDayOfWeek(currentMonth.year, currentMonth.month),
    [currentMonth]
  );

  const dateScheduleMap = useMemo(() => {
    const map: Record<string, { materialColors: string[] }> = {};
    monthDates.forEach(date => {
      const stops = getStopsForDate(date);
      if (stops.length > 0) {
        const colors = new Set<string>();
        stops.forEach(stop => {
          stop.materialIds.forEach(matId => {
            const mat = materials.find(m => m.id === matId);
            if (mat) colors.add(mat.color);
          });
        });
        map[date] = { materialColors: Array.from(colors) };
      }
    });
    return map;
  }, [monthDates, getStopsForDate, materials]);

  const selectedStops = useMemo(
    () => getStopsForDate(selectedDate),
    [selectedDate, getStopsForDate]
  );

  const prevMonth = useCallback(() => {
    Haptics.selectionAsync();
    setCurrentMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  }, []);

  const nextMonth = useCallback(() => {
    Haptics.selectionAsync();
    setCurrentMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  }, []);

  const handleDateSelect = useCallback((date: string) => {
    Haptics.selectionAsync();
    setSelectedDate(date);
  }, []);

  const handleReschedule = useCallback((locationId: string) => {
    Haptics.selectionAsync();
    router.push({ pathname: '/reschedule' as any, params: { locationId } });
  }, [router]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Calendario',
          headerRight: () => (
            <TouchableOpacity onPress={reopenTutorial} style={styles.helpBtn} testID="open-tutorial-calendar">
              <HelpCircle size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={prevMonth} style={styles.monthNav} testID="prev-month">
              <ChevronLeft size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.monthNav} testID="next-month">
              <ChevronRight size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.dayNamesRow}>
            {DAY_NAMES.map(d => (
              <View key={d} style={styles.dayNameCell}>
                <Text style={styles.dayNameText}>{d}</Text>
              </View>
            ))}
          </View>

          <View style={styles.datesGrid}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dateCell} />
            ))}
            {monthDates.map(date => {
              const isSelected = date === selectedDate;
              const isCurrentDay = date === today;
              const schedule = dateScheduleMap[date];
              const dayNum = new Date(date + 'T12:00:00').getDate();

              return (
                <TouchableOpacity
                  key={date}
                  style={[
                    styles.dateCell,
                    isSelected && styles.dateCellSelected,
                    isCurrentDay && !isSelected && styles.dateCellToday,
                  ]}
                  onPress={() => handleDateSelect(date)}
                >
                  <Text
                    style={[
                      styles.dateText,
                      isSelected && styles.dateTextSelected,
                      isCurrentDay && !isSelected && styles.dateTextToday,
                    ]}
                  >
                    {dayNum}
                  </Text>
                  {schedule && (
                    <View style={styles.dotRow}>
                      {schedule.materialColors.slice(0, 4).map((color, idx) => (
                        <View
                          key={idx}
                          style={[styles.materialDot, { backgroundColor: color }]}
                        />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.selectedSection}>
          <Text style={styles.selectedDateTitle}>
            {selectedDate === today ? 'Hoy' : formatDateShort(selectedDate)}
          </Text>
          {selectedStops.length === 0 ? (
            <View style={styles.noStops}>
              <Text style={styles.noStopsText}>Sin recolecciones programadas</Text>
            </View>
          ) : (
            selectedStops.map((stop, idx) => {
              const loc = getLocationById(stop.locationId);
              if (!loc) return null;
              const stopMats = stop.materialIds
                .map(id => materials.find(m => m.id === id))
                .filter(Boolean);

              return (
                <View key={stop.locationId} style={styles.stopItem}>
                  <View style={styles.stopOrder}>
                    <Text style={styles.stopOrderText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.stopContent}>
                    <Text style={styles.stopName}>{loc.name}</Text>
                    <View style={styles.stopAddress}>
                      <MapPin size={11} color={Colors.textTertiary} />
                      <Text style={styles.stopAddressText}>{loc.address}</Text>
                    </View>
                    <View style={styles.stopMaterials}>
                      {stopMats.map(mat => mat && (
                        <MaterialBadge key={mat.id} name={mat.name} color={mat.color} small />
                      ))}
                    </View>
                    <FillLevelBar level={loc.currentFillLevel} height={4} />
                    {!stop.completed && (
                      <TouchableOpacity
                        style={styles.rescheduleBtn}
                        onPress={() => handleReschedule(stop.locationId)}
                        activeOpacity={0.7}
                      >
                        <CalendarDays size={12} color={Colors.accent} />
                        <Text style={styles.rescheduleBtnText}>Reprogramar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {stop.completed && (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>✓</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <TutorialOverlay
        visible={showTutorial}
        steps={tutorialSteps}
        onClose={handleCloseTutorial}
        screenTitle="Tutorial — Calendario"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  helpBtn: {
    padding: 6,
    marginRight: 4,
  },
  calendarCard: {
    margin: 16,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthNav: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: Colors.cardElevated,
  },
  monthTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayNameText: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  datesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateCell: {
    width: '14.28%' as unknown as number,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dateCellSelected: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  dateCellToday: {
    backgroundColor: Colors.primaryBg,
    borderRadius: 12,
  },
  dateText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  dateTextSelected: {
    color: Colors.textInverse,
    fontWeight: '700' as const,
  },
  dateTextToday: {
    color: Colors.primary,
    fontWeight: '700' as const,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  materialDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  selectedSection: {
    paddingHorizontal: 16,
  },
  selectedDateTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  noStops: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noStopsText: {
    color: Colors.textTertiary,
    fontSize: 14,
  },
  stopItem: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stopOrder: {
    width: 36,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopOrderText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  stopContent: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  stopName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  stopAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stopAddressText: {
    color: Colors.textTertiary,
    fontSize: 11,
    flex: 1,
  },
  stopMaterials: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  rescheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.accentBg,
    borderWidth: 1,
    borderColor: Colors.accent + '33',
  },
  rescheduleBtnText: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  completedBadge: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryBg,
  },
  completedBadgeText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
