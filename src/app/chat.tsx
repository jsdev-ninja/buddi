import { buddiColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import { setCurrentChatConversationId } from '@/context/NotificationProvider';
import { firebaseApi } from '@/services/firebase';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Composer, GiftedChat, IMessage, InputToolbar, Send, User } from 'react-native-gifted-chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FirebaseMessage = {
  id: string;
  text: string;
  timestamp: string;
  isSent: boolean;
  createdAt: number;
  userId: string;
};

function toGiftedMessage(m: FirebaseMessage, currentUserId: string): IMessage {
  return {
    _id: m.id,
    text: m.text,
    createdAt: new Date(m.createdAt),
    user: {
      _id: m.userId,
      name: m.userId === currentUserId ? 'You' : undefined,
    },
  };
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
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseMessages, setFirebaseMessages] = useState<FirebaseMessage[]>([]);
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
          if (!conversation.isGroup && conversation.participantIds?.length >= 2) {
            const other = conversation.participantIds.find((p: string) => p !== user.uid);
            setOtherUserId(other ?? null);
          }
        } else if (convDoc) {
          setChatName(convDoc.name);
          setMembers(convDoc.participants.length);
          setIsGroupChat(convDoc.isGroup);
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
          <Text style={styles.chatName}>{chatName}</Text>
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
      {showMoreMenu && (
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
              <Text style={styles.moreMenuUnmatchText}>Settings</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

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
  chatName: {
    fontSize: 18,
    fontWeight: '600',
    color: buddiColors.textPrimary,
    marginBottom: 4,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  moreMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
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
  moreMenuPlaceholder: {
    fontSize: 14,
    color: buddiColors.textSecondary,
    padding: 16,
  },
});
