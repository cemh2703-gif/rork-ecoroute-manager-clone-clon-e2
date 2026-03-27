import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FillLevel } from '@/types';
import { FILL_COLORS } from '@/constants/colors';

interface FillLevelBarProps {
  level: FillLevel;
  height?: number;
  width?: number;
}

export default function FillLevelBar({ level, height = 8, width }: FillLevelBarProps) {
  const percentage = (level / 5) * 100;
  const color = FILL_COLORS[level] || FILL_COLORS[0];

  return (
    <View style={[styles.track, { height }, width ? { width } : { flex: 1 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${percentage}%` as unknown as number,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
  },
});
