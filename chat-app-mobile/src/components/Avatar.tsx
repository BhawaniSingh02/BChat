import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, radii } from '../theme/tokens';

interface AvatarProps {
  initials: string;
  color: string;
  textColor?: string;
  size?: number;
}

export default function Avatar({ initials, color, textColor = '#FFFFFF', size = 46 }: AvatarProps) {
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radii.avatar,
          backgroundColor: color,
        },
      ]}
    >
      <Text style={[styles.letters, { color: textColor, fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  letters: { fontFamily: fonts.display, letterSpacing: -0.5 },
});
