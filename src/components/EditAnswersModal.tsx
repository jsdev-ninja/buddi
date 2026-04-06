import { buddiColors } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type Prompt = { question: string; answer: string };

const QUESTIONS = [
  'Where would you love to travel next?',
  "What's your favorite travel tip or hack?",
  "What's the most unforgettable trip you've ever taken?",
];

interface EditAnswersModalProps {
  visible: boolean;
  onClose: () => void;
  initialPrompts?: Prompt[];
  onSave: (prompts: Prompt[]) => Promise<void>;
}

export function EditAnswersModal({ visible, onClose, initialPrompts, onSave }: EditAnswersModalProps) {
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      const filled = QUESTIONS.map((q) => {
        const found = initialPrompts?.find((p) => p.question === q);
        return found?.answer ?? '';
      });
      setAnswers(filled);
    }
  }, [visible, initialPrompts]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const prompts: Prompt[] = QUESTIONS.map((q, i) => ({ question: q, answer: answers[i] }));
      await onSave(prompts);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onPress={() => {}}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Edit Your Answers</Text>
                <Text style={styles.subtitle}>
                  Let your personality shine. Your answers appear between your photos.
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <Feather name="x" size={20} color={buddiColors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {QUESTIONS.map((q, i) => (
                <View key={i} style={styles.questionBlock}>
                  <Text style={styles.questionText}>{q}</Text>
                  <TextInput
                    style={styles.input}
                    multiline
                    placeholder="Your answer..."
                    placeholderTextColor={buddiColors.textTertiary}
                    value={answers[i]}
                    onChangeText={(v) => setAnswers((prev) => { const next = [...prev]; next[i] = v; return next; })}
                    textAlignVertical="top"
                  />
                </View>
              ))}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  kav: {
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: buddiColors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    direction: 'ltr',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: buddiColors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: buddiColors.textSecondary,
    maxWidth: '90%',
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 20,
  },
  questionBlock: {
    gap: 8,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
    color: buddiColors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: buddiColors.surfaceBorder,
    borderRadius: 8,
    padding: 12,
    minHeight: 90,
    fontSize: 14,
    color: buddiColors.textPrimary,
    backgroundColor: buddiColors.background,
  },
  footer: {
    flexDirection: 'row',
    direction: 'ltr',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: buddiColors.surfaceBorder,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 15,
    color: buddiColors.textSecondary,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: buddiColors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
