import { buddiColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import { firebaseApi } from '@/services/firebase';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Chat screen best practices (React Native, Stream, GetStream, keyboard-controller):
// - KeyboardAvoidingView with behavior on both iOS (padding) and Android (height)
// - keyboardVerticalOffset from actual header height (safe area + headers), not hardcoded
// - Keyboard listeners for scroll padding and scroll-to-end when keyboard opens
// - keyboardShouldPersistTaps="handled" so taps on input/buttons don't dismiss keyboard
// - keyboardDismissMode: interactive (iOS) / on-drag (Android)
// - LayoutAnimation when keyboard shows for smoother transitions
// - For 100+ messages, consider FlatList (virtualization); avoid inverted+reverse together

type ChatMessage = {
  id: string;
  text: string;
  timestamp: string;
  isSent: boolean;
};

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const nameParam = typeof params.name === 'string' ? params.name : params.name?.[0];
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatName, setChatName] = useState(nameParam ? decodeURIComponent(nameParam) : 'Chat');
  const [members, setMembers] = useState(1);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Header heights: app header (~120) + chat header (~60)
  const headerHeight = 120 + 60;
  const keyboardVerticalOffset = insets.top + headerHeight;

  // Track keyboard: add bottom padding, scroll to end, and animate layout (best practice)
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        if (Platform.OS === 'ios') {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (Platform.OS === 'ios') {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Fetch conversation and messages from Firebase
  useEffect(() => {
    if (!id || !user?.uid) return;

    const fetchConversation = async () => {
      try {
        setIsLoading(true);
        const conversations = await firebaseApi.chat.getConversations(user.uid);
        const conversation = conversations.find((c) => c.id === id);

        if (conversation) {
          setChatName(conversation.name);
          setMembers(conversation.members || 1);
          setIsGroupChat(conversation.isGroup ?? false);
          if (!conversation.isGroup && conversation.participantIds?.length >= 2) {
            const other = conversation.participantIds.find((p: string) => p !== user.uid);
            setOtherUserId(other ?? null);
          }
        } else {
          const conv = await firebaseApi.chat.getConversation(id, user.uid);
          if (conv) {
            setChatName(conv.name);
            setMembers(conv.participants.length);
            setIsGroupChat(conv.isGroup);
            if (!conv.isGroup && conv.participants.length >= 2) {
              const other = conv.participants.find((p: string) => p !== user.uid);
              setOtherUserId(other ?? null);
            }
          }
        }

        const fetchedMessages = await firebaseApi.chat.getMessages(id);
        setMessages(fetchedMessages);
      } catch (error) {
        console.error('Error fetching conversation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversation();

    const unsubscribe = firebaseApi.chat.subscribeToMessages(id, (updatedMessages) => {
      setMessages(updatedMessages);
    });

    return () => {
      unsubscribe();
    };
  }, [id, user?.uid]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !id) return;

    try {
      await firebaseApi.chat.sendMessage(id, message.trim());
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardVerticalOffset : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Feather name="map-pin" size={20} color={buddiColors.textOnDark} />
          </View>
          <Text style={styles.logoText}>Buddia</Text>
        </View>
        <Pressable onPress={() => {}}>
          <Feather name="settings" size={24} color={buddiColors.textPrimary} />
        </Pressable>
      </View>

      {/* Chat Header */}
      <View style={styles.chatHeader}>
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

      {/* More menu modal (Unmatch for 1-1) */}
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
          </View>
        </Pressable>
      )}

      {/* Messages Area */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={buddiColors.primary} />
        </View>
      ) : (
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesArea}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingBottom: 8 + keyboardHeight },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageContainer,
              msg.isSent ? styles.sentMessageContainer : styles.receivedMessageContainer,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                msg.isSent ? styles.sentBubble : styles.receivedBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  msg.isSent ? styles.sentMessageText : styles.receivedMessageText,
                ]}
              >
                {msg.text}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  msg.isSent ? styles.sentMessageTime : styles.receivedMessageTime,
                ]}
              >
                {msg.timestamp}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <Pressable style={styles.attachButton}>
          <Feather name="image" size={20} color={buddiColors.textSecondary} />
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={buddiColors.textTertiary}
          value={message}
          onChangeText={setMessage}
          multiline
          onSubmitEditing={handleSend}
        />
        <Pressable 
          style={[styles.sendButton, message.trim() && styles.sendButtonActive]}
          onPress={handleSend}
          disabled={!message.trim()}
        >
          <Feather 
            name={message.trim() ? "send" : "mic"} 
            size={20} 
            color={message.trim() ? buddiColors.textOnDark : buddiColors.textSecondary} 
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: buddiColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: buddiColors.surface,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: buddiColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '600',
    color: buddiColors.textPrimary,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  messagesArea: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  sentMessageContainer: {
    alignItems: 'flex-end',
  },
  receivedMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sentBubble: {
    backgroundColor: buddiColors.primary,
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: buddiColors.surfaceMuted,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  sentMessageText: {
    color: buddiColors.textOnDark,
  },
  receivedMessageText: {
    color: buddiColors.textPrimary,
  },
  messageTime: {
    fontSize: 11,
  },
  sentMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  receivedMessageTime: {
    color: buddiColors.textTertiary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: buddiColors.surface,
    borderTopWidth: 1,
    borderTopColor: buddiColors.surfaceBorder,
    gap: 12,
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: buddiColors.surfaceMuted,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: buddiColors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: buddiColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: buddiColors.primary,
  },
});

