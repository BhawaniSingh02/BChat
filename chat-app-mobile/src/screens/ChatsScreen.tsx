import { Feather } from '@expo/vector-icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import { mockChats } from '../data/mockChats';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Chats'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ChatsScreen({ navigation }: Props) {
  const { tokens } = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: tokens.text }]}>Chats</Text>
        <View style={styles.headerActions}>
          <View style={[styles.ghostBtn, { backgroundColor: tokens.surface }]}>
            <Feather name="search" size={16} color={tokens.text} />
          </View>
          <View style={[styles.ghostBtn, { backgroundColor: tokens.surface }]}>
            <Feather name="edit" size={16} color={tokens.text} />
          </View>
        </View>
      </View>

      <FlatList
        data={mockChats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('Conversation', { name: item.name, initials: item.initials, avatarColor: item.avatarColor })}
          >
            <Avatar initials={item.initials} color={item.avatarColor} />
            <View style={styles.mid}>
              <View style={styles.topLine}>
                <Text style={[styles.name, { color: tokens.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.time, { color: item.unread ? tokens.accentStrong : tokens.textMuted }]}>{item.time}</Text>
              </View>
              <View style={styles.bottomLine}>
                <Text
                  style={[styles.preview, { color: item.typing ? tokens.accentStrong : tokens.textMuted }]}
                  numberOfLines={1}
                >
                  {item.preview}
                </Text>
                {item.unread ? (
                  <View style={[styles.badge, { backgroundColor: tokens.accent }]}>
                    <Text style={[styles.badgeLabel, { color: tokens.onAccent }]}>{item.unread}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  ghostBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14 },
  mid: { flex: 1 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontFamily: fonts.heading, fontSize: 15, letterSpacing: -0.2, flexShrink: 1 },
  time: { fontSize: 12, fontFamily: fonts.label },
  bottomLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  preview: { fontSize: 13, flexShrink: 1 },
  badge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeLabel: { fontFamily: fonts.heading, fontSize: 11 },
});
