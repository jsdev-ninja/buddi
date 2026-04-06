import { buddiColors } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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

export type CompletedAdventure = {
  title: string;
  photo?: string;
  startDate?: string;
  endDate?: string;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  initialAdventures?: CompletedAdventure[];
  onSave: (adventures: CompletedAdventure[]) => Promise<void>;
}

const EMPTY_DRAFT: CompletedAdventure = { title: '', photo: undefined, startDate: '', endDate: '' };

export function EditCompletedAdventuresModal({ visible, onClose, initialAdventures, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<CompletedAdventure[]>([]);
  const [draft, setDraft] = useState<CompletedAdventure>({ ...EMPTY_DRAFT });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setList(initialAdventures ?? []);
      setDraft({ ...EMPTY_DRAFT });
    }
  }, [visible, initialAdventures]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setDraft((d) => ({ ...d, photo: result.assets[0].uri }));
    }
  };

  const addAdventure = () => {
    if (!draft.title.trim()) {
      Alert.alert('Title required', 'Please enter a title for this adventure.');
      return;
    }
    setList((prev) => [...prev, { ...draft, title: draft.title.trim() }]);
    setDraft({ ...EMPTY_DRAFT });
  };

  const removeAdventure = (index: number) => {
    setList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(list);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
          <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onPress={() => {}}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Edit Completed Adventures</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Feather name="x" size={20} color={buddiColors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Saved list */}
              {list.map((item, i) => (
                <View key={i} style={styles.listItem}>
                  {item.photo
                    ? <Image source={{ uri: item.photo }} style={styles.listPhoto} />
                    : <View style={styles.listPhotoPlaceholder}><Feather name="image" size={18} color={buddiColors.textTertiary} /></View>
                  }
                  <View style={styles.listInfo}>
                    <Text style={styles.listTitle}>{item.title}</Text>
                    {(item.startDate || item.endDate) && (
                      <Text style={styles.listDates}>
                        {item.startDate}{item.startDate && item.endDate ? ' • ' : ''}{item.endDate}
                      </Text>
                    )}
                  </View>
                  <Pressable onPress={() => removeAdventure(i)} style={styles.deleteBtn} hitSlop={8}>
                    <Feather name="trash-2" size={18} color={buddiColors.dangerText} />
                  </Pressable>
                </View>
              ))}

              {/* Add new adventure */}
              <Text style={styles.addTitle}>Add a new adventure</Text>

              {/* Photo + Title row */}
              <View style={styles.draftRow}>
                <Pressable style={styles.draftPhoto} onPress={pickPhoto}>
                  {draft.photo
                    ? <Image source={{ uri: draft.photo }} style={styles.draftPhotoImage} />
                    : <Feather name="image" size={22} color={buddiColors.textTertiary} />
                  }
                </Pressable>
                <TextInput
                  style={styles.draftTitleInput}
                  placeholder="Title"
                  placeholderTextColor={buddiColors.textTertiary}
                  value={draft.title}
                  onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))}
                />
              </View>

              {/* Date row */}
              <View style={styles.draftDatesRow}>
                <TextInput
                  style={styles.draftDateInput}
                  placeholder="Start (e.g. January)"
                  placeholderTextColor={buddiColors.textTertiary}
                  value={draft.startDate}
                  onChangeText={(v) => setDraft((d) => ({ ...d, startDate: v }))}
                />
                <TextInput
                  style={styles.draftDateInput}
                  placeholder="End (e.g. February)"
                  placeholderTextColor={buddiColors.textTertiary}
                  value={draft.endDate}
                  onChangeText={(v) => setDraft((d) => ({ ...d, endDate: v }))}
                />
              </View>

              {/* Add button */}
              <TouchableOpacity style={styles.addBtn} onPress={addAdventure}>
                <Feather name="plus" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
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
  kav: { justifyContent: 'center' },
  sheet: {
    backgroundColor: buddiColors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    direction: 'ltr',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: buddiColors.textPrimary,
  },
  scroll: { maxHeight: 420 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  // Saved items
  listItem: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    gap: 12,
    backgroundColor: buddiColors.surfaceMuted,
    borderRadius: 12,
    padding: 10,
  },
  listPhoto: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  listPhotoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: buddiColors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: { flex: 1 },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: buddiColors.textPrimary,
  },
  listDates: {
    fontSize: 12,
    color: buddiColors.textSecondary,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: buddiColors.surface,
    borderRadius: 8,
  },
  // Draft form
  addTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: buddiColors.textPrimary,
    marginTop: 4,
  },
  draftRow: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    gap: 10,
  },
  draftPhoto: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: buddiColors.surfaceMuted,
    borderWidth: 1,
    borderColor: buddiColors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  draftPhotoImage: {
    width: 52,
    height: 52,
  },
  draftTitleInput: {
    flex: 1,
    backgroundColor: buddiColors.surfaceMuted,
    borderWidth: 1,
    borderColor: buddiColors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: buddiColors.textPrimary,
  },
  draftDatesRow: {
    flexDirection: 'row',
    direction: 'ltr',
    gap: 10,
  },
  draftDateInput: {
    flex: 1,
    backgroundColor: buddiColors.surfaceMuted,
    borderWidth: 1,
    borderColor: buddiColors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: buddiColors.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: buddiColors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: buddiColors.surfaceBorder,
  },
  saveBtn: {
    backgroundColor: buddiColors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  cancelText: {
    fontSize: 15,
    color: buddiColors.textSecondary,
    textAlign: 'center',
    paddingVertical: 6,
  },
});
