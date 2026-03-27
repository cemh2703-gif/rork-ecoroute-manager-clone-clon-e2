import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface MaterialBadgeProps {
  name: string;
  color: string;
  small?: boolean;
}

export default function MaterialBadge({ name, color, small }: MaterialBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }, small && styles.badgeSmall]}>
      <View style={[styles.dot, { backgroundColor: color }, small && styles.dotSmall]} />
      <Text style={[styles.text, small && styles.textSmall]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  text: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  textSmall: {
    fontSize: 10,
  },
});
