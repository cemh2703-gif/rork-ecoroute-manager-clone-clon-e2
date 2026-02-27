import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SP_PAD = 10;
const CARD_BG = '#1C2028';
const OVERLAY = 'rgba(0,0,0,0.82)';

export interface SpotlightArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TutorialStep {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  spotlight?: SpotlightArea;
}

interface TutorialOverlayProps {
  visible: boolean;
  steps: TutorialStep[];
  onClose: () => void;
  screenTitle: string;
}

export default function TutorialOverlay({ visible, steps, onClose, screenTitle }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const stepFade = useRef(new Animated.Value(1)).current;
  const stepSlide = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      stepFade.setValue(1);
      stepSlide.setValue(0);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();

      glowAnim.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 850, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 850, useNativeDriver: true }),
        ])
      );
      glowLoopRef.current = loop;
      loop.start();
    } else {
      if (glowLoopRef.current) {
        glowLoopRef.current.stop();
        glowLoopRef.current = null;
      }
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    return () => {
      if (glowLoopRef.current) {
        glowLoopRef.current.stop();
        glowLoopRef.current = null;
      }
    };
  }, [visible]);

  const animateToStep = useCallback((next: number, direction: number) => {
    Haptics.selectionAsync();
    Animated.parallel([
      Animated.timing(stepFade, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(stepSlide, { toValue: direction * -24, duration: 110, useNativeDriver: true }),
    ]).start(() => {
      setCurrentStep(next);
      stepSlide.setValue(direction * 24);
      Animated.parallel([
        Animated.timing(stepFade, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(stepSlide, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    });
  }, [stepFade, stepSlide]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      animateToStep(currentStep + 1, 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    }
  }, [currentStep, steps.length, animateToStep, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) animateToStep(currentStep - 1, -1);
  }, [currentStep, animateToStep]);

  const step = steps[currentStep];
  if (!step) return null;

  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const spotlight = step.spotlight;
  const sp = spotlight
    ? {
        x: spotlight.x - SP_PAD,
        y: spotlight.y - SP_PAD,
        width: spotlight.width + SP_PAD * 2,
        height: spotlight.height + SP_PAD * 2,
      }
    : null;

  const spBottom = sp ? sp.y + sp.height : 0;
  const spCenterX = sp ? sp.x + sp.width / 2 : SCREEN_W / 2;
  const tooltipWidth = SCREEN_W - 32;
  const arrowOffset = Math.max(8, Math.min(spCenterX - 16 - 10, tooltipWidth - 28));

  let showBelow = false;
  let showAbove = false;
  let tooltipPositionStyle: object = {};

  if (sp) {
    const spaceBelow = SCREEN_H - spBottom;
    if (spaceBelow >= 210) {
      showBelow = true;
      tooltipPositionStyle = { position: 'absolute' as const, top: spBottom + 8, left: 16, right: 16 };
    } else {
      showAbove = true;
      tooltipPositionStyle = { position: 'absolute' as const, bottom: SCREEN_H - sp.y + 8, left: 16, right: 16 };
    }
  } else {
    tooltipPositionStyle = styles.tooltipNoSpotlight;
  }

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.root, { opacity: fadeAnim }]} pointerEvents="box-none">

        {sp ? (
          <>
            <View style={[styles.panel, { top: 0, left: 0, right: 0, height: Math.max(0, sp.y) }]} />
            <View style={[styles.panel, { top: spBottom, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.panel, { top: sp.y, left: 0, width: Math.max(0, sp.x), height: sp.height }]} />
            <View style={[styles.panel, { top: sp.y, left: sp.x + sp.width, right: 0, height: sp.height }]} />

            <Animated.View
              style={[
                styles.spotlightBorder,
                {
                  top: sp.y,
                  left: sp.x,
                  width: sp.width,
                  height: sp.height,
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                },
              ]}
              pointerEvents="none"
            />

            <TouchableOpacity
              style={[styles.spotlightTap, { top: sp.y, left: sp.x, width: sp.width, height: sp.height }]}
              onPress={handleNext}
              activeOpacity={0.8}
            />
          </>
        ) : (
          <TouchableOpacity style={[styles.panel, styles.fullPanel]} onPress={onClose} activeOpacity={1} />
        )}

        <Animated.View
          style={[
            styles.tooltipContainer,
            tooltipPositionStyle,
            { opacity: stepFade, transform: [{ translateX: stepSlide }] },
          ]}
          pointerEvents="box-none"
        >
          {showBelow && (
            <View style={styles.arrowRow}>
              <View style={[styles.arrowUp, { marginLeft: arrowOffset }]} />
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: step.iconBg }]}>
                {step.icon}
              </View>
              <View style={styles.headerMeta}>
                <Text style={styles.titleText}>{step.title}</Text>
                <Text style={styles.counterText}>{currentStep + 1} de {steps.length}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.skipBtn} testID="tutorial-skip">
                <Text style={styles.skipText}>Saltar</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.descText}>{step.description}</Text>

            <View style={styles.dotsRow}>
              {steps.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    if (i > currentStep) animateToStep(i, 1);
                    else if (i < currentStep) animateToStep(i, -1);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <View
                    style={[
                      styles.dot,
                      i === currentStep && styles.dotActive,
                      i < currentStep && styles.dotPast,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.navRow}>
              {!isFirst ? (
                <TouchableOpacity style={styles.prevBtn} onPress={handlePrev} testID="tutorial-prev">
                  <Text style={styles.prevText}>← Anterior</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.navPlaceholder} />
              )}

              <TouchableOpacity
                style={[styles.nextBtn, isLast && styles.nextBtnFinish]}
                onPress={handleNext}
                testID="tutorial-next"
                activeOpacity={0.8}
              >
                <Text style={[styles.nextBtnText, isLast && styles.nextBtnTextFinish]}>
                  {isLast ? '¡Entendido! ✓' : 'Siguiente →'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showAbove && (
            <View style={styles.arrowRow}>
              <View style={[styles.arrowDown, { marginLeft: arrowOffset }]} />
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const BORDER_RADIUS = 18;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  panel: {
    position: 'absolute',
    backgroundColor: OVERLAY,
  },
  fullPanel: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  spotlightBorder: {
    position: 'absolute',
    borderRadius: BORDER_RADIUS,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 12,
  },
  spotlightTap: {
    position: 'absolute',
  },
  tooltipContainer: {
    zIndex: 100,
  },
  tooltipNoSpotlight: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 48,
  },
  arrowRow: {
    height: 10,
    overflow: 'visible',
  },
  arrowUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: CARD_BG,
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: CARD_BG,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerMeta: {
    flex: 1,
  },
  titleText: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  counterText: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  descText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  dotPast: {
    backgroundColor: Colors.primaryDim,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navPlaceholder: {
    width: 90,
  },
  prevBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  prevText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  nextBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nextBtnFinish: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  nextBtnText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  nextBtnTextFinish: {
    color: Colors.textInverse,
  },
});
