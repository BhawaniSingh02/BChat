import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii, ThemeTokens } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Help'>;

const FAQS: { question: string; answer: string }[] = [
  {
    question: 'How do I start a new chat?',
    answer: 'Go to the Chats tab and tap the pencil icon in the top-right corner to search for someone by their @handle.',
  },
  {
    question: 'What happens when I "delete" a chat?',
    answer:
      'It removes the conversation from your own list only — the other person keeps it, and it comes back to your list if they message you again.',
  },
  {
    question: 'Who can see my Story?',
    answer: 'Anyone you have an accepted DM conversation with. Stories disappear automatically after 24 hours.',
  },
  {
    question: 'How do I block someone?',
    answer: "Open their contact info from a chat (tap their name at the top), then choose Block. You can review and unblock people any time from Settings → Privacy → Blocked users.",
  },
  {
    question: 'Why did a photo/video take a while to send?',
    answer: 'Baaat\'s backend runs on a free-tier server that can take 30-70 seconds to "wake up" after being idle — the first message or upload after a while can be slower than usual.',
  },
  {
    question: 'Can I change my @handle?',
    answer: 'Yes — Settings → Account lets you change your public @handle at any time.',
  },
];

function FaqRow({ question, answer, tokens }: { question: string; answer: string; tokens: ThemeTokens }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      style={[styles.faqRow, { backgroundColor: tokens.surface, borderRadius: radii.control }]}
      onPress={() => setOpen((o) => !o)}
      activeOpacity={0.8}
    >
      <View style={styles.faqHeader}>
        <Text style={[styles.faqQuestion, { color: tokens.text }]}>{question}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={tokens.textMuted} />
      </View>
      {open ? <Text style={[styles.faqAnswer, { color: tokens.textMuted }]}>{answer}</Text> : null}
    </TouchableOpacity>
  );
}

export default function HelpScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={tokens.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: tokens.text }]}>Help</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={{ color: tokens.textMuted, fontSize: 11, fontFamily: fonts.label, letterSpacing: 1, marginBottom: 2 }}>
          FREQUENTLY ASKED
        </Text>
        <View style={{ gap: 8 }}>
          {FAQS.map((faq) => (
            <FaqRow key={faq.question} question={faq.question} answer={faq.answer} tokens={tokens} />
          ))}
        </View>

        <View style={styles.aboutBlock}>
          <Text style={{ color: tokens.textMuted, fontSize: 12 }}>Baaat version {version}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontFamily: fonts.heading, fontSize: 16, letterSpacing: -0.2 },
  body: { padding: 20, paddingBottom: 40, gap: 8 },
  faqRow: { padding: 14 },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  faqQuestion: { flex: 1, fontFamily: fonts.label, fontSize: 13.5 },
  faqAnswer: { fontSize: 12.5, lineHeight: 18, marginTop: 8 },
  aboutBlock: { alignItems: 'center', marginTop: 20 },
});
