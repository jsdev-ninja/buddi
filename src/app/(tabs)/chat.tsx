import { buddiColors } from '@/constants/theme';
import type { ChatMessage } from '@/lib/data/mockData';
import { chatMessages, conversations } from '@/lib/data/mockData';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const conversation = id ? conversations.find(c => c.id === id) : null;
  const chatName = conversation?.name || 'Chat';
  const members = conversation?.members || 1;

  // Initialize messages from mockData
  useEffect(() => {
    if (id) {
      setMessages(chatMessages[id] || []);
    }
  }, [id]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (message.trim() && id) {
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        text: message.trim(),
        timestamp: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        isSent: true,
      };
      
      // Add message to state
      setMessages(prev => [...prev, newMessage]);
      
      // Clear input
      setMessage('');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
        <Pressable onPress={() => {}}>
          <Feather name="more-vertical" size={24} color={buddiColors.textPrimary} />
        </Pressable>
      </View>

      {/* Messages Area */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesArea}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
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

