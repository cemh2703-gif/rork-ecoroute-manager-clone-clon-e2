import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/providers/AppProvider';
import Colors from '@/constants/colors';
import { getDateString, getMonthDates, getFirstDayOfWeek, formatDateFull, getDayNameFull } from '@/utils/dates';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function RescheduleScreen() {
  const { locationId } = useLocalSearchParams<{ locationId: string }>();
  const { getLocationById, rescheduleLocation } = useApp();
  const router = useRouter();

  const location = useMemo(() => getLocationById(locationId ?? ''), [locationId, getLocationById]);

  const today = getDateString();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthDates = useMemo(
    () => getMonthDates(currentMonth.year, currentMonth.month),
    [currentMonth]
  );
  const firstDayOfWeek = useMemo(
    () => getFirstDayOfWeek(currentMonth.year, currentMonth.month),
    [currentMonth]
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
    if (date < today) return;
    Haptics.selectionAsync();
    setSelectedDate(date);
  }, [today]);

  const handleConfirm = useCallback(() => {
    if (!selectedDate || !locationId) return;

    Alert.alert(
      'Reprogramar visita',
      `¿Mover la recolección de ${location?.name ?? ''} al ${getDayNameFull(selectedDate)} ${new Date(selectedDate + 'T12:00:00').getDate()}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            rescheduleLocation(locationId, selectedDate, 'client_request');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          },
        },
      ]
    );
  }, [selectedDate, locationId, location, rescheduleLocation, router]);

  if (!location) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Reprogramar', presentation: 'modal' }} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Ubicación no encontrada</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Reprogramar', presentation: 'modal' }} />

      <View style={styles.locationCard}>
        <View style={styles.locationIconWrap}>
          <CalendarDays size={22} color={Colors.accent} />
        </View>
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{location.name}</Text>
          <View style={styles.currentSchedule}>
            <Clock size={12} color={Colors.textTertiary} />
            <Text style={styles.currentScheduleText}>
              Programado: {location.nextCollection ? formatDateFull(location.nextCollection) : 'Sin programar'}
            </Text>
          </View>
        </View>
      </View>

      {selectedDate && (
        <View style={styles.changePreview}>
          <View style={styles.changeFrom}>
            <Text style={styles.changeLabel}>De</Text>
            <Text style={styles.changeDate}>
              {location.nextCollection ? getDayNameFull(location.nextCollection) : '—'}
            </Text>
          </View>
          <ArrowRight size={20} color={Colors.accent} />
          <View style={styles.changeTo}>
            <Text style={styles.changeLabel}>A</Text>
            <Text style={[styles.changeDate, { color: Colors.accent }]}>
              {getDayNameFull(selectedDate)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={prevMonth} style={styles.monthNav}>
            <ChevronLeft size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.monthNav}>
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
            const isPast = date < today;
            const isOriginal = date === location.nextCollection;
            const dayNum = new Date(date + 'T12:00:00').getDate();

            return (
              <TouchableOpacity
                key={date}
                style={[
                  styles.dateCell,
                  isSelected && styles.dateCellSelected,
                  isCurrentDay && !isSelected && styles.dateCellToday,
                  isOriginal && !isSelected && styles.dateCellOriginal,
                  isPast && styles.dateCellPast,
                ]}
                onPress={() => handleDateSelect(date)}
                disabled={isPast}
              >
                <Text
                  style={[
                    styles.dateText,
                    isSelected && styles.dateTextSelected,
                    isCurrentDay && !isSelected && styles.dateTextToday,
                    isOriginal && !isSelected && styles.dateTextOriginal,
                    isPast && styles.dateTextPast,
                  ]}
                >
                  {dayNum}
                </Text>
                {isOriginal && !isSelected && (
                  <View style={styles.originalDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={styles.hint}>
        Selecciona la nueva fecha para la recolección. El punto naranja indica la fecha programada actual.
      </Text>

      <TouchableOpacity
        style={[styles.confirmBtn, !selectedDate && styles.confirmBtnDisabled]}
        onPress={handleConfirm}
        disabled={!selectedDate}
        testID="confirm-reschedule-btn"
      >
        <CalendarDays size={18} color={selectedDate ? Colors.textInverse : Colors.textTertiary} />
        <Text style={[styles.confirmBtnText, !selectedDate && styles.confirmBtnTextDisabled]}>
          Reprogramar visita
        </Text>
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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.textTertiary,
    fontSize: 16,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  locationIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  currentSchedule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  currentScheduleText: {
    color: Colors.textTertiary,
    fontSize: 12,
  },
  changePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentBg,
    borderRadius: 14,
    padding: 14,
    gap: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.accent + '33',
  },
  changeFrom: {
    alignItems: 'center',
  },
  changeTo: {
    alignItems: 'center',
  },
  changeLabel: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  changeDate: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  calendarCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
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
    backgroundColor: Colors.accent,
    borderRadius: 12,
  },
  dateCellToday: {
    backgroundColor: Colors.primaryBg,
    borderRadius: 12,
  },
  dateCellOriginal: {
    backgroundColor: Colors.accentBg,
    borderRadius: 12,
  },
  dateCellPast: {
    opacity: 0.3,
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
  dateTextOriginal: {
    color: Colors.accent,
    fontWeight: '700' as const,
  },
  dateTextPast: {
    color: Colors.textTertiary,
  },
  originalDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.accent,
    marginTop: 1,
  },
  hint: {
    color: Colors.textTertiary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  confirmBtn: {
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  confirmBtnDisabled: {
    backgroundColor: Colors.cardElevated,
  },
  confirmBtnText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  confirmBtnTextDisabled: {
    color: Colors.textTertiary,
  },
});
