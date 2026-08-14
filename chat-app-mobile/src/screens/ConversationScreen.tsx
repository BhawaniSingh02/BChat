import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import { mockThread } from '../data/mockChats';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;

export default function ConversationScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const { name, initials, avatarColor } = route.params;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={tokens.text} />
        </TouchableOpacity>
        <Avatar initials={initials} color={avatarColor} size={34} />
        <View style={styles.who}>
          <Text style={[styles.name, { color: tokens.text }]} numberOfLines={1}>{name}</Text>
          <Text style={[styles.status, { color: tokens.accentStrong }]}>online</Text>
        </View>
        <View style={styles.actions}>
          <Feather name="video" size={18} color={tokens.accentStrong} />
          <Feather name="phone" size={17} color={tokens.accentStrong} />
        </View>
      </View>

      <FlatList
        data={mockThread}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.thread}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              {
                alignSelf: item.mine ? 'flex-end' : 'flex-start',
                backgroundColor: item.mine ? tokens.accent : tokens.surface,
                borderRadius: radii.bubble,
              },
            ]}
          >
            <Text style={{ color: item.mine ? tokens.onAccent : tokens.text, fontSize: 14, lineHeight: 20 }}>
              {item.text}
            </Text>
            <Text
              style={{
                color: item.mine ? tokens.onAccent : tokens.textMuted,
                opacity: item.mine ? 0.75 : 1,
                fontSize: 10,
                marginTop: 4,
                textAlign: 'right',
              }}
            >
              {item.time}
            </Text>
          </View>
        )}
      />

      <View style={[styles.composer, { backgroundColor: tokens.background, borderTopColor: tokens.border }]}>
        <Feather name="plus" size={20} color={tokens.textMuted} />
        <View style={[styles.field, { backgroundColor: tokens.surface }]}>
          <TextInput placeholder="Message" placeholderTextColor={tokens.textMuted} style={{ color: tokens.text, fontSize: 14 }} />
        </View>
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: tokens.accent }]}>
          <Feather name="arrow-right" size={16} color={tokens.onAccent} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  who: { flex: 1 },
  name: { fontFamily: fonts.heading, fontSize: 15, letterSpacing: -0.2 },
  status: { fontSize: 11, fontFamily: fonts.label, marginTop: 1 },
  actions: { flexDirection: 'row', gap: 16 },
  thread: { padding: 14, gap: 8 },
  bubble: { maxWidth: '78%', paddingVertical: 10, paddingHorizontal: 13 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  field: { flex: 1, borderRadius: radii.control, paddingVertical: 11, paddingHorizontal: 15 },
  sendBtn: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
