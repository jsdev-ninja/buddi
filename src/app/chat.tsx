import { CouplePill } from '@/components/CouplePill';
import { buddiColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import { setCurrentChatConversationId } from '@/context/NotificationProvider';
import { firebaseApi } from '@/services/firebase';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bubble, Composer, GiftedChat, IMessage, InputToolbar, Send, User } from 'react-native-gifted-chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FirebaseMessage = {
  id: string;
  text: string;
  image?: string;
  audio?: string;
  timestamp: string;
  isSent: boolean;
  createdAt: number;
  userId: string;
};

function toGiftedMessage(m: FirebaseMessage, currentUserId: string): IMessage {
  return {
    _id: m.id,
    text: m.text,
    image: m.image,
    audio: m.audio,
    createdAt: new Date(m.createdAt),
    user: {
      _id: m.userId,
      name: m.userId === currentUserId ? 'You' : undefined,
    },
  };
}

function AudioMessage({ uri, isMine }: { uri: string; isMine?: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const toggle = async () => {
    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setIsPlaying(false);
      } else {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync({ uri });
        soundRef.current = sound;
        setIsPlaying(true);
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            sound.unloadAsync();
            soundRef.current = null;
          }
        });
        await sound.playAsync();
      }
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  };

  useEffect(() => {
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  return (
    <Pressable style={styles.audioMsg} onPress={toggle}>
      <Feather
        name={isPlaying ? 'pause-circle' : 'play-circle'}
        size={28}
        color={isMine ? '#fff' : buddiColors.primary}
      />
      <View style={styles.audioWaveform}>
        {Array.from({ length: 12 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.audioBar,
              { height: 6 + Math.random() * 14, backgroundColor: isMine ? 'rgba(255,255,255,0.6)' : buddiColors.surfaceBorder },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.audioLabel, { color: isMine ? 'rgba(255,255,255,0.8)' : buddiColors.textSecondary }]}>
        Voice
      </Text>
    </Pressable>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const nameParam = typeof params.name === 'string' ? params.name : params.name?.[0];
  const [chatName, setChatName] = useState(nameParam ? decodeURIComponent(nameParam) : 'Chat');
  const [members, setMembers] = useState(1);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [partnerKind, setPartnerKind] = useState<"solo" | "couple" | undefined>();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseMessages, setFirebaseMessages] = useState<FirebaseMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const insets = useSafeAreaInsets();

  const giftedUser: User = useMemo(
    () => (user?.uid ? { _id: user.uid } : { _id: '' }),
    [user?.uid]
  );

  const headerHeight = insets.top + 64;

  // Suppress "new message" notifications while user is in this chat
  useEffect(() => {
    if (id) setCurrentChatConversationId(id);
    return () => setCurrentChatConversationId(null);
  }, [id]);

  // Fetch conversation meta and subscribe to messages
  useEffect(() => {
    if (!id || !user?.uid) return;

    const fetchConversation = async () => {
      try {
        setIsLoading(true);
        const [convs, convDoc] = await Promise.all([
          firebaseApi.chat.getConversations(user.uid),
          firebaseApi.chat.getConversation(id, user.uid),
        ]);
        const conversation = convs.find((c) => c.id === id);
        if (conversation) {
          setChatName(conversation.name);
          setMembers(conversation.members || 1);
          setIsGroupChat(conversation.isGroup ?? false);
          setPartnerKind(conversation.partnerKind);
          if (!conversation.isGroup && conversation.participantIds?.length >= 2) {
            const other = conversation.participantIds.find((p: string) => p !== user.uid);
            setOtherUserId(other ?? null);
          }
        } else if (convDoc) {
          setChatName(convDoc.name);
          setMembers(convDoc.participants.length);
          setIsGroupChat(convDoc.isGroup);
          setPartnerKind(convDoc.partnerKind);
          if (!convDoc.isGroup && convDoc.participants.length >= 2) {
            const other = convDoc.participants.find((p: string) => p !== user.uid);
            setOtherUserId(other ?? null);
          }
        }

        const fetched = await firebaseApi.chat.getMessages(id);
        setFirebaseMessages(fetched);
      } catch (error) {
        console.error('Error fetching conversation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversation();

    const unsubscribe = firebaseApi.chat.subscribeToMessages(id, (updated) => {
      setFirebaseMessages(updated);
    });

    return () => unsubscribe();
  }, [id, user?.uid]);

  // GiftedChat with inverted list expects newest first; list renders reversed so newest is at bottom
  const giftedMessages: IMessage[] = useMemo(() => {
    const mapped = firebaseMessages
      .filter((m) => m.text?.trim() !== '')
      .map((m) => toGiftedMessage(m, user?.uid ?? ''));
    return mapped.sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
  }, [firebaseMessages, user?.uid]);

  const onSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      if (!id || !user?.uid || newMessages.length === 0) return;
      const text = newMessages[0].text?.trim();
      if (!text) return;
      try {
        await firebaseApi.chat.sendMessage(id, text);
      } catch (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Could not send message. Please try again.');
      }
    },
    [id, user?.uid]
  );

  const pickImage = useCallback(async () => {
    if (!id || !user?.uid) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled) return;
    try {
      setIsSendingMedia(true);
      const url = await firebaseApi.storage.uploadChatMedia(result.assets[0].uri, id, 'image');
      await firebaseApi.chat.sendMessage(id, '', { image: url });
    } catch (e) {
      console.error('Error sending image:', e);
      Alert.alert('Error', 'Could not send image.');
    } finally {
      setIsSendingMedia(false);
    }
  }, [id, user?.uid]);

  const startRecording = useCallback(async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Microphone access is required for voice messages.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (e) {
      console.error('Error starting recording:', e);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current || !id || !user?.uid) return;
    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) return;
      setIsSendingMedia(true);
      const url = await firebaseApi.storage.uploadChatMedia(uri, id, 'audio');
      await firebaseApi.chat.sendMessage(id, '', { audio: url });
    } catch (e) {
      console.error('Error sending voice message:', e);
      Alert.alert('Error', 'Could not send voice message.');
    } finally {
      setIsSendingMedia(false);
    }
  }, [id, user?.uid]);

  const renderLoading = useCallback(
    () => (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={buddiColors.primary} />
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      {/* Chat header only (no logo bar — more space for conversation) */}
      <View style={[styles.chatHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={buddiColors.textPrimary} />
        </Pressable>
        <View style={styles.chatInfo}>
          <View style={styles.chatNameRow}>
            <Text style={styles.chatName} numberOfLines={1} ellipsizeMode="tail">{chatName}</Text>
            {partnerKind === "couple" && !isGroupChat && (
              <CouplePill variant="compact" />
            )}
          </View>
          <View style={styles.chatMeta}>
            <Feather name="users" size={14} color={buddiColors.textSecondary} />
            <Text style={styles.chatMetaText}>{members} members</Text>
            <View style={styles.onlineDot} />
          </View>
        </View>
        <Pressable onPress={() => setShowMoreMenu(true)}>
          <Feather name="more-vertical" size={24} color={buddiColors.textPrimary} />
        </Pressable>
      </View>

      {/* More menu modal */}
      <Modal
        visible={showMoreMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <Pressable style={styles.moreMenuOverlay} onPress={() => setShowMoreMenu(false)}>
          <View style={styles.moreMenuBox} onStartShouldSetResponder={() => true}>
            {!isGroupChat && otherUserId && (
              <Pressable
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreMenu(false);
                  Alert.alert(
                    'Unmatch',
                    'Remove this match? You will no longer see each other in matches.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Unmatch',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await firebaseApi.matches.unmatch(otherUserId);
                            router.back();
                          } catch {
                            Alert.alert('Error', 'Could not unmatch.');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Feather name="user-x" size={20} color={buddiColors.dangerText} />
                <Text style={styles.moreMenuUnmatchText}>Unmatch</Text>
              </Pressable>
            )}
            {isGroupChat && (
              <Text style={styles.moreMenuPlaceholder}>Group options coming soon</Text>
            )}
            {!isGroupChat && !otherUserId && (
              <Text style={styles.moreMenuPlaceholder}>No actions</Text>
            )}
            <Pressable
              style={styles.moreMenuItem}
              onPress={() => {
                setShowMoreMenu(false);
                router.push('/settings');
              }}
            >
              <Feather name="settings" size={20} color={buddiColors.textPrimary} />
              <Text style={styles.moreMenuItemText}>Settings</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Gifted Chat - handles keyboard, list, and input with best practices */}
      <View style={styles.chatWrapper}>
        <GiftedChat
          messages={giftedMessages}
          onSend={onSend}
          user={giftedUser}
          renderLoading={isLoading ? renderLoading : undefined}
          isInverted
          listProps={{
            style: styles.messageList,
            contentContainerStyle: styles.messageListContent,
          }}
          messagesContainerStyle={styles.messagesContainer}
          timeFormat="HH:mm"
          dateFormat="D MMM"
          minInputToolbarHeight={48}
          isSendButtonAlwaysVisible
          textInputProps={{
            placeholder: 'Type a message...',
            placeholderTextColor: buddiColors.textTertiary,
            style: styles.textInput,
          }}
          keyboardAvoidingViewProps={{
            keyboardVerticalOffset: Platform.OS === 'ios' ? headerHeight : 0,
          }}
          renderInputToolbar={(inputToolbarProps) => (
            <View style={[styles.inputToolbarWrapper, { paddingBottom: Math.max(insets.bottom, 6) }]}>
              {isSendingMedia && (
                <View style={styles.mediaUploading}>
                  <ActivityIndicator size="small" color={buddiColors.primary} />
                  <Text style={styles.mediaUploadingText}>Sending...</Text>
                </View>
              )}
              <View style={styles.toolbarRow}>
                <Pressable style={styles.mediaBtn} onPress={pickImage}>
                  <Feather name="image" size={22} color={buddiColors.primary} />
                </Pressable>
                <Pressable
                  style={[styles.mediaBtn, isRecording && styles.mediaBtnRecording]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  <Feather name="mic" size={22} color={isRecording ? '#fff' : buddiColors.primary} />
                </Pressable>
                <View style={styles.composerFlex}>
                  <InputToolbar
                    {...inputToolbarProps}
                    containerStyle={[styles.inputToolbar, styles.inputToolbarNoBorder]}
                    primaryStyle={styles.inputToolbarPrimary}
                    renderComposer={(composerProps) => (
                      <View style={styles.composerWrap}>
                        <Composer
                          {...composerProps}
                          textInputProps={{
                            ...composerProps.textInputProps,
                            style: [styles.textInput, composerProps.textInputProps?.style],
                          }}
                        />
                      </View>
                    )}
                    renderSend={(sendProps) => (
                      <Send
                        {...sendProps}
                        containerStyle={styles.sendWrap}
                        textStyle={styles.sendText}
                      />
                    )}
                  />
                </View>
              </View>
            </View>
          )}
          renderMessageImage={(props) => {
            const imgUrl = props.currentMessage?.image;
            if (!imgUrl) return null;
            return (
              <Pressable onPress={() => {}}>
                <Image
                  source={{ uri: imgUrl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </Pressable>
            );
          }}
          renderCustomView={(props) => {
            const audioUrl = (props.currentMessage as any)?.audio;
            if (!audioUrl) return null;
            return (
              <AudioMessage
                uri={audioUrl}
                isMine={props.currentMessage?.user?._id === user?.uid}
              />
            );
          }}
          renderBubble={(bubbleProps) => (
            <Bubble
              {...bubbleProps}
              wrapperStyle={{
                right: { backgroundColor: buddiColors.primary },
                left: { backgroundColor: buddiColors.surfaceMuted },
              }}
              textStyle={{
                right: { color: '#fff' },
                left: { color: buddiColors.textPrimary },
              }}
            />
          )}
          renderDay={({ createdAt }) => {
            const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
            const label =
              date.toDateString() === new Date().toDateString()
                ? 'Today'
                : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            return (
              <View style={styles.daySeparator}>
                <Text style={styles.daySeparatorText}>{label}</Text>
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: buddiColors.background,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: buddiColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: buddiColors.surfaceBorder,
  },
  backButton: {
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  chatName: {
    fontSize: 18,
    fontWeight: '600',
    color: buddiColors.textPrimary,
    flexShrink: 1,
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatMetaText: {
    fontSize: 12,
    color: buddiColors.textSecondary,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: buddiColors.badgeHighlight,
    marginLeft: 4,
  },
  chatWrapper: {
    flex: 1,
  },
  messageList: {
    backgroundColor: buddiColors.background,
    flexGrow: 1,
  },
  messageListContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  messagesContainer: {
    backgroundColor: buddiColors.background,
  },
  inputToolbarWrapper: {
    backgroundColor: buddiColors.surface,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  inputToolbar: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    minHeight: undefined,
  },
  inputToolbarNoBorder: {
    borderTopWidth: 0,
  },
  inputToolbarPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 0,
  },
  composerWrap: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 88,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: buddiColors.surfaceMuted,
    color: buddiColors.textPrimary,
    fontSize: 16,
    lineHeight: 20,
  },
  sendWrap: {
    justifyContent: 'center',
    paddingBottom: 0,
    marginBottom: 0,
    minWidth: 56,
  },
  sendText: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 16,
    fontWeight: '600',
  },
  daySeparator: {
    alignSelf: 'center',
    marginVertical: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: buddiColors.surfaceMuted,
    borderRadius: 14,
  },
  daySeparatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: buddiColors.textSecondary,
  },
  toolbarRow: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    gap: 4,
  },
  composerFlex: {
    flex: 1,
  },
  mediaBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: buddiColors.surfaceMuted,
  },
  mediaBtnRecording: {
    backgroundColor: buddiColors.dangerText || '#e53e3e',
  },
  mediaUploading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  mediaUploadingText: {
    fontSize: 12,
    color: buddiColors.textSecondary,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    margin: 4,
  },
  audioMsg: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  audioBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: buddiColors.surfaceBorder,
  },
  audioLabel: {
    fontSize: 11,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  moreMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20,
  },
  moreMenuBox: {
    backgroundColor: buddiColors.surface,
    borderRadius: 12,
    padding: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  moreMenuUnmatchText: {
    fontSize: 16,
    color: buddiColors.dangerText,
    fontWeight: '500',
  },
  moreMenuItemText: {
    fontSize: 16,
    color: buddiColors.textPrimary,
    fontWeight: '500',
  },
  moreMenuPlaceholder: {
    fontSize: 14,
    color: buddiColors.textSecondary,
    padding: 16,
  },
});
