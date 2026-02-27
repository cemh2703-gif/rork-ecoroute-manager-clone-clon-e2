import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Linking, Alert, Platform, ActionSheetIOS } from 'react-native';
import { Stack } from 'expo-router';
import { Truck, Navigation, Package, AlertTriangle, CalendarPlus, X, CalendarDays, MapPin, ExternalLink, HelpCircle, CheckCircle, RotateCcw, TrendingUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/providers/AppProvider';
import { useTutorial } from '@/providers/TutorialProvider';
import Colors, { FILL_COLORS } from '@/constants/colors';
import { formatDateFull, formatDateShort, getDateString } from '@/utils/dates';
import StopCard from '@/components/StopCard';
import TutorialOverlay, { TutorialStep, SpotlightArea } from '@/components/TutorialOverlay';
import { FillLevel } from '@/types';

export default function RouteScreen() {
  const {
    getTodayStops,
    getLocationById,
    materials,
    completeStop,
    uncompleteStop,
    isLoading,
    urgencyAlerts,
    acceptUrgencyAlert,
    dismissUrgencyAlert,
  } = useApp();
  const { hasSeen, markSeen, isLoaded } = useTutorial();
  const router = useRouter();

  const [showTutorial, setShowTutorial] = useState(false);

  const heroRef = useRef<View>(null);
  const navBtnRef = useRef<View>(null);
  const progressRef = useRef<View>(null);
  const stopsHeaderRef = useRef<View>(null);

  const [heroSpot, setHeroSpot] = useState<SpotlightArea | undefined>();
  const [navSpot, setNavSpot] = useState<SpotlightArea | undefined>();
  const [progressSpot, setProgressSpot] = useState<SpotlightArea | undefined>();
  const [stopsHeaderSpot, setStopsHeaderSpot] = useState<SpotlightArea | undefined>();

  const measureSpotlights = useCallback(() => {
    console.log('[RouteScreen] Measuring spotlight positions...');
    setTimeout(() => {
      heroRef.current?.measureInWindow((x, y, w, h) => {
        console.log('[RouteScreen] hero spot:', x, y, w, h);
        if (w > 0 && h > 0) setHeroSpot({ x, y, width: w, height: h });
      });
      navBtnRef.current?.measureInWindow((x, y, w, h) => {
        console.log('[RouteScreen] navBtn spot:', x, y, w, h);
        if (w > 0 && h > 0) setNavSpot({ x, y, width: w, height: h });
      });
      progressRef.current?.measureInWindow((x, y, w, h) => {
        console.log('[RouteScreen] progress spot:', x, y, w, h);
        if (w > 0 && h > 0) setProgressSpot({ x, y, width: w, height: h });
      });
      stopsHeaderRef.current?.measureInWindow((x, y, w, h) => {
        console.log('[RouteScreen] stopsHeader spot:', x, y, w, h);
        if (w > 0 && h > 0) setStopsHeaderSpot({ x, y, width: w, height: h });
      });
    }, 120);
  }, []);

  useEffect(() => {
    if (isLoaded && !hasSeen('route')) {
      const timer = setTimeout(() => {
        measureSpotlights();
        setShowTutorial(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
    markSeen('route');
  }, [markSeen]);

  const reopenTutorial = useCallback(() => {
    Haptics.selectionAsync();
    measureSpotlights();
    setTimeout(() => setShowTutorial(true), 160);
  }, [measureSpotlights]);

  const tutorialSteps = useMemo((): TutorialStep[] => [
    {
      icon: <Truck size={32} color="#fff" />,
      iconBg: Colors.primary,
      title: 'Ruta del Día',
      description: 'Aquí ves todas las paradas programadas para hoy, ordenadas por ruta de visita.',
      spotlight: heroSpot,
    },
    {
      icon: <MapPin size={32} color="#fff" />,
      iconBg: Colors.info,
      title: 'Abrir en Mapa',
      description: 'Toca este botón para abrir la ruta completa en Google Maps o Waze con todas las paradas.',
      spotlight: navSpot,
    },
    {
      icon: <TrendingUp size={32} color="#fff" />,
      iconBg: Colors.primaryDim,
      title: 'Progreso del Día',
      description: 'La barra verde muestra cuántas paradas llevas completadas. ¡Completa todas para terminar tu jornada!',
      spotlight: progressSpot,
    },
    {
      icon: <CheckCircle size={32} color="#fff" />,
      iconBg: Colors.primary,
      title: 'Orden de Paradas',
      description: 'Aquí aparecen las tarjetas de cada parada. Toca "Completar" y selecciona el nivel de llenado del recipiente.',
      spotlight: stopsHeaderSpot,
    },
    {
      icon: <RotateCcw size={32} color="#fff" />,
      iconBg: Colors.accent,
      title: 'Deshacer Acción',
      description: 'Después de completar una parada aparece el botón "Deshacer" para revertir la acción fácilmente.',
    },
  ], [heroSpot, navSpot, progressSpot, stopsHeaderSpot]);

  const today = getDateString();
  const stops = useMemo(() => getTodayStops(), [getTodayStops]);

  const completedCount = stops.filter(s => s.completed).length;
  const totalStops = stops.length;
  const progress = totalStops > 0 ? completedCount / totalStops : 0;

  const handleComplete = useCallback((locationId: string, fillLevel: FillLevel, photoUri?: string) => {
    completeStop(today, locationId, fillLevel, photoUri);
  }, [today, completeStop]);

  const handleUndo = useCallback((locationId: string) => {
    uncompleteStop(today, locationId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [today, uncompleteStop]);

  const materialsToday = useMemo(() => {
    const matIds = new Set<string>();
    stops.forEach(s => s.materialIds.forEach(id => matIds.add(id)));
    return materials.filter(m => matIds.has(m.id));
  }, [stops, materials]);

  const stopsWithLocations = useMemo(() => {
    return stops
      .filter(s => !s.completed)
      .map(s => {
        const loc = getLocationById(s.locationId);
        return loc ? { stop: s, location: loc } : null;
      })
      .filter(Boolean) as { stop: typeof stops[0]; location: NonNullable<ReturnType<typeof getLocationById>> }[];
  }, [stops, getLocationById]);

  const buildGoogleMapsUrl = useCallback(() => {
    const allStops = stops
      .map(s => getLocationById(s.locationId))
      .filter(Boolean) as NonNullable<ReturnType<typeof getLocationById>>[];

    if (allStops.length === 0) return null;

    const getLocationQuery = (loc: NonNullable<ReturnType<typeof getLocationById>>) => {
      if (loc.latitude && loc.longitude) return `${loc.latitude},${loc.longitude}`;
      return encodeURIComponent(loc.address);
    };

    const destination = getLocationQuery(allStops[allStops.length - 1]);
    const waypoints = allStops.slice(0, -1).map(getLocationQuery).join('|');

    let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    if (waypoints) url += `&waypoints=${waypoints}`;
    return url;
  }, [stops, getLocationById]);

  const buildWazeUrl = useCallback(() => {
    const nextStop = stopsWithLocations[0];
    if (!nextStop) {
      const firstStop = stops[0];
      if (!firstStop) return null;
      const loc = getLocationById(firstStop.locationId);
      if (!loc) return null;
      if (loc.latitude && loc.longitude) {
        return `https://waze.com/ul?ll=${loc.latitude},${loc.longitude}&navigate=yes`;
      }
      return `https://waze.com/ul?q=${encodeURIComponent(loc.address)}&navigate=yes`;
    }
    const loc = nextStop.location;
    if (loc.latitude && loc.longitude) {
      return `https://waze.com/ul?ll=${loc.latitude},${loc.longitude}&navigate=yes`;
    }
    return `https://waze.com/ul?q=${encodeURIComponent(loc.address)}&navigate=yes`;
  }, [stopsWithLocations, stops, getLocationById]);

  const handleOpenNavigation = useCallback(() => {
    Haptics.selectionAsync();
    const googleUrl = buildGoogleMapsUrl();
    const wazeUrl = buildWazeUrl();

    const options = [
      { label: 'Google Maps (ruta completa)', url: googleUrl },
      { label: 'Waze (siguiente parada)', url: wazeUrl },
    ].filter(o => o.url !== null);

    if (options.length === 0) {
      Alert.alert('Sin paradas', 'No hay paradas disponibles para navegar.');
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options.map(o => o.label), 'Cancelar'],
          cancelButtonIndex: options.length,
          title: 'Abrir ruta en...',
        },
        (buttonIndex) => {
          if (buttonIndex < options.length && options[buttonIndex].url) {
            Linking.openURL(options[buttonIndex].url!);
          }
        }
      );
    } else {
      Alert.alert(
        'Abrir ruta en...',
        'Selecciona tu app de navegación',
        [
          ...options.map(o => ({
            text: o.label,
            onPress: () => { if (o.url) Linking.openURL(o.url); },
          })),
          { text: 'Cancelar', style: 'cancel' as const },
        ]
      );
    }
  }, [buildGoogleMapsUrl, buildWazeUrl]);

  const handleReschedule = useCallback((locationId: string) => {
    Haptics.selectionAsync();
    router.push({ pathname: '/reschedule' as any, params: { locationId } });
  }, [router]);

  const handleAcceptAlert = useCallback((locationId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    acceptUrgencyAlert(locationId);
  }, [acceptUrgencyAlert]);

  const handleDismissAlert = useCallback((locationId: string) => {
    Haptics.selectionAsync();
    dismissUrgencyAlert(locationId);
  }, [dismissUrgencyAlert]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Ruta del Día',
          headerRight: () => (
            <TouchableOpacity onPress={reopenTutorial} style={styles.helpBtn} testID="open-tutorial-route">
              <HelpCircle size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={isLoading} tintColor={Colors.primary} />}
      >
        {urgencyAlerts.length > 0 && (
          <View style={styles.alertsSection}>
            {urgencyAlerts.map(alert => {
              const loc = getLocationById(alert.locationId);
              if (!loc) return null;
              return (
                <View key={alert.locationId} style={styles.alertCard}>
                  <View style={styles.alertHeader}>
                    <View style={styles.alertIconWrap}>
                      <AlertTriangle size={16} color={Colors.danger} />
                    </View>
                    <Text style={styles.alertTitle}>Alerta de urgencia</Text>
                    <TouchableOpacity
                      style={styles.alertDismiss}
                      onPress={() => handleDismissAlert(alert.locationId)}
                    >
                      <X size={14} color={Colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <Text style={styles.alertSuggestion}>
                    Visita adicional sugerida: {formatDateShort(alert.suggestedExtraDay)}
                  </Text>
                  <View style={styles.alertActions}>
                    <TouchableOpacity
                      style={styles.alertAcceptBtn}
                      onPress={() => handleAcceptAlert(alert.locationId)}
                    >
                      <CalendarPlus size={14} color={Colors.textInverse} />
                      <Text style={styles.alertAcceptText}>Agendar visita</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.alertCustomBtn}
                      onPress={() => handleReschedule(alert.locationId)}
                    >
                      <CalendarDays size={14} color={Colors.accent} />
                      <Text style={styles.alertCustomText}>Elegir fecha</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.hero} ref={heroRef} collapsable={false}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Truck size={28} color={Colors.primary} />
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroDate}>{formatDateFull(today)}</Text>
              <Text style={styles.heroTitle}>
                {totalStops === 0 ? 'Sin paradas hoy' : `${totalStops} parada${totalStops > 1 ? 's' : ''} programada${totalStops > 1 ? 's' : ''}`}
              </Text>
            </View>
          </View>

          {totalStops > 0 && (
            <>
              <View ref={navBtnRef} collapsable={false}>
                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={handleOpenNavigation}
                  activeOpacity={0.8}
                  testID="open-route-navigation"
                >
                  <MapPin size={18} color={Colors.textInverse} />
                  <Text style={styles.navigateButtonText}>Abrir ruta en mapa</Text>
                  <ExternalLink size={14} color={Colors.textInverse} style={{ opacity: 0.7 }} />
                </TouchableOpacity>
              </View>

              <View style={styles.progressContainer} ref={progressRef} collapsable={false}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` as unknown as number }]} />
                </View>
                <Text style={styles.progressText}>{completedCount}/{totalStops} completadas</Text>
              </View>

              <View style={styles.materialsSummary}>
                <Package size={14} color={Colors.textSecondary} />
                <Text style={styles.materialsSummaryText}>
                  {materialsToday.map(m => m.name).join(' · ')}
                </Text>
              </View>
            </>
          )}
        </View>

        {totalStops === 0 ? (
          <View style={styles.emptyState}>
            <Navigation size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No hay recolecciones hoy</Text>
            <Text style={styles.emptySubtitle}>
              Las próximas paradas aparecerán aquí cuando estén programadas
            </Text>
          </View>
        ) : (
          <View style={styles.stopsSection}>
            <View ref={stopsHeaderRef} collapsable={false}>
              <Text style={styles.sectionTitle}>Orden de ruta</Text>
            </View>
            {stops.map((stop, index) => (
              <StopCard
                key={stop.locationId}
                stop={stop}
                location={getLocationById(stop.locationId)}
                materials={materials}
                onComplete={handleComplete}
                onUndo={handleUndo}
                index={index}
              />
            ))}
          </View>
        )}

        {totalStops > 0 && (
          <View style={styles.routeInfo}>
            <View style={styles.routeInfoCard}>
              <View style={styles.routeInfoRow}>
                <View style={styles.routeInfoItem}>
                  <Text style={styles.routeInfoValue}>{totalStops}</Text>
                  <Text style={styles.routeInfoLabel}>Paradas</Text>
                </View>
                <View style={styles.routeInfoDivider} />
                <View style={styles.routeInfoItem}>
                  <Text style={styles.routeInfoValue}>{materialsToday.length}</Text>
                  <Text style={styles.routeInfoLabel}>Materiales</Text>
                </View>
                <View style={styles.routeInfoDivider} />
                <View style={styles.routeInfoItem}>
                  <View style={styles.fillDots}>
                    {stops.slice(0, 5).map((s, i) => {
                      const loc = getLocationById(s.locationId);
                      const lvl = loc?.currentFillLevel ?? 0;
                      return (
                        <View
                          key={i}
                          style={[styles.fillDot, { backgroundColor: FILL_COLORS[lvl] }]}
                        />
                      );
                    })}
                  </View>
                  <Text style={styles.routeInfoLabel}>Nivel</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <TutorialOverlay
        visible={showTutorial}
        steps={tutorialSteps}
        onClose={handleCloseTutorial}
        screenTitle="Tutorial — Ruta"
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
  alertsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  alertCard: {
    backgroundColor: Colors.dangerBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.danger + '33',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.danger + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '700' as const,
    flex: 1,
  },
  alertDismiss: {
    padding: 4,
  },
  alertMessage: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  alertSuggestion: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
  },
  alertAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  alertAcceptText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  alertCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accentBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.accent + '33',
  },
  alertCustomText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  hero: {
    margin: 16,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextContainer: {
    flex: 1,
  },
  heroDate: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 2,
  },
  heroTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  progressContainer: {
    marginTop: 16,
    gap: 6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  materialsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  materialsSummaryText: {
    color: Colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.info,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  navigateButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  emptySubtitle: {
    color: Colors.textTertiary,
    fontSize: 14,
    textAlign: 'center' as const,
    marginTop: 6,
    lineHeight: 20,
  },
  stopsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  routeInfo: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  routeInfoCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  routeInfoDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  routeInfoValue: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '700' as const,
  },
  routeInfoLabel: {
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  fillDots: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 2,
  },
  fillDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
