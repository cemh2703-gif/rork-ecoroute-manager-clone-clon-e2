import { CollectionLocation, DaySchedule, FillLevel, ScheduledStop } from '@/types';

export function getDateString(date?: Date): string {
  const d = date ?? new Date();
  return d.toISOString().split('T')[0];
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return getDateString(d);
}

export function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T12:00:00');
  const b = new Date(dateB + 'T12:00:00');
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function isToday(dateStr: string): boolean {
  return dateStr === getDateString();
}

export function isBefore(dateA: string, dateB: string): boolean {
  return dateA < dateB;
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
}

export function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return days[d.getDay()];
}

export function suggestFrequency(fillHistory: { level: FillLevel; date: string }[]): number {
  if (fillHistory.length < 2) return 7;

  const recentLevels = fillHistory.slice(-5);
  const avgFill = recentLevels.reduce((sum, r) => sum + r.level, 0) / recentLevels.length;

  if (avgFill >= 4) return 3;
  if (avgFill >= 3) return 7;
  if (avgFill >= 2) return 10;
  if (avgFill >= 1) return 14;
  return 21;
}

export function getStopsForDate(
  locations: CollectionLocation[],
  date: string,
  schedules: DaySchedule[]
): ScheduledStop[] {
  const existing = schedules.find(s => s.date === date);
  if (existing) return existing.stops;

  const dueLocations = locations.filter(loc => {
    if (!loc.active) return false;
    if (!loc.nextCollection) return false;
    return loc.nextCollection <= date;
  });

  const sorted = [...dueLocations].sort((a, b) => b.currentFillLevel - a.currentFillLevel);

  return sorted.map((loc, index) => ({
    locationId: loc.id,
    materialIds: loc.materialIds,
    order: index,
    completed: false,
  }));
}

export function getMonthDates(year: number, month: number): string[] {
  const dates: string[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    dates.push(getDateString(d));
  }
  return dates;
}

export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function detectUrgency(
  fillHistory: { level: number; date: string }[],
  frequencyDays: number
): { isUrgent: boolean; weeksFullCount: number; suggestedExtraDay: string } {
  if (fillHistory.length < 2) {
    return { isUrgent: false, weeksFullCount: 0, suggestedExtraDay: '' };
  }

  const sorted = [...fillHistory].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-6);

  let consecutiveHighWeeks = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].level >= 4) {
      consecutiveHighWeeks++;
    } else {
      break;
    }
  }

  const isUrgent = consecutiveHighWeeks >= 2;

  let suggestedExtraDay = '';
  if (isUrgent) {
    const halfFreq = Math.max(1, Math.floor(frequencyDays / 2));
    suggestedExtraDay = addDays(getDateString(), halfFreq);
  }

  return { isUrgent, weeksFullCount: consecutiveHighWeeks, suggestedExtraDay };
}

export function getWeekDates(startDate: string, days: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(addDays(startDate, i));
  }
  return dates;
}

export function getDayNameFull(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[d.getDay()];
}
