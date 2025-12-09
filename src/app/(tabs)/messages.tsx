import { CreateGroupModal } from '@/components/CreateGroupModal';
import { buddiColors } from '@/constants/theme';
import { conversations } from '@/lib/data/mockData';
import type { CreateGroupInput } from '@/lib/schemas/group';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function MessagesScreen() {
  const router = useRouter();
  const hasConversations = conversations.length > 0;
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  return (
    <View style={styles.container}>
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

      {/* Messages Header */}
      <View style={styles.messagesHeader}>
        <View style={styles.messagesTitleRow}>
          <Text style={styles.messagesTitle}>Messages</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>
        <Pressable style={styles.createGroupButton} onPress={() => setShowCreateGroup(true)}>
          <Text style={styles.createGroupText}>+ Create Group</Text>
        </Pressable>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {hasConversations ? (
          <View style={styles.conversationsList}>
            {conversations.map((conv) => (
              <Pressable
                key={conv.id}
                style={styles.conversationItem}
                onPress={() => router.push(`/(tabs)/chat?id=${conv.id}`)}
              >
                <View style={styles.conversationContent}>
                  <Text style={styles.conversationName}>{conv.name}</Text>
                  {conv.lastMessage && (
                    <Text style={styles.conversationLastMessage} numberOfLines={1}>
                      {conv.lastMessage}
                    </Text>
                  )}
                </View>
                {conv.timestamp && (
                  <Text style={styles.conversationTime}>{conv.timestamp}</Text>
                )}
              </Pressable>
            ))}
          </View>
        ) : (
          // Empty State
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="message-circle" size={64} color={buddiColors.surfaceBorder} />
            </View>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Start matching to connect with fellow trekkers!
            </Text>
            <Pressable 
              style={styles.discoverButton}
              onPress={() => router.push('/(tabs)/index')}
            >
              <Text style={styles.discoverButtonText}>Discover Adventurers</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <CreateGroupModal
        visible={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onSubmit={(data: CreateGroupInput) => {
          console.log('Group created:', data);
          // TODO: Implement group creation API call
          setShowCreateGroup(false);
        }}
      />
    </View>
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
  messagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: buddiColors.surface,
  },
  messagesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messagesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: buddiColors.textPrimary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: buddiColors.successBackground,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: buddiColors.badgeHighlight,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: buddiColors.successText,
  },
  createGroupButton: {
    backgroundColor: buddiColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  createGroupText: {
    fontSize: 14,
    fontWeight: '600',
    color: buddiColors.textOnDark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: buddiColors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: buddiColors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  discoverButton: {
    backgroundColor: buddiColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  discoverButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: buddiColors.textOnDark,
  },
  conversationsList: {
    gap: 0,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: buddiColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: buddiColors.surfaceBorder,
  },
  conversationContent: {
    flex: 1,
    gap: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: buddiColors.textPrimary,
  },
  conversationLastMessage: {
    fontSize: 14,
    color: buddiColors.textSecondary,
  },
  conversationTime: {
    fontSize: 12,
    color: buddiColors.textTertiary,
  },
});
