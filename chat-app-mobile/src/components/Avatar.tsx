import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { fonts, radii } from '../theme/tokens';

interface AvatarProps {
  initials: string;
  color: string;
  textColor?: string;
  size?: number;
  imageUrl?: string;
  online?: boolean;
  ringColor?: string;
  /** Full circle instead of the app's default rounded-square avatar — for use inside a
   * circular ring (e.g. the Stories tile), where a squircle avatar reads as visibly square. */
  circle?: boolean;
}

export default function Avatar({ initials, color, textColor = '#FFFFFF', size = 46, imageUrl, online, ringColor = '#FFFFFF', circle }: AvatarProps) {
  const dotSize = Math.max(10, Math.round(size * 0.28));
  const borderRadius = circle ? size / 2 : radii.avatar;

  const content = imageUrl ? (
    <Image source={{ uri: imageUrl }} style={{ width: size, height: size, borderRadius }} />
  ) : (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: color,
        },
      ]}
    >
      <Text style={[styles.letters, { color: textColor, fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );

  if (online === undefined) return content;

  return (
    <View style={{ width: size, height: size }}>
      {content}
      <View
        style={{
          position: 'absolute',
          bottom: -1,
          right: -1,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: online ? '#34D399' : '#9CA3AF',
          borderWidth: 2,
          borderColor: ringColor,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  letters: { fontFamily: fonts.display, letterSpacing: -0.5 },
});
