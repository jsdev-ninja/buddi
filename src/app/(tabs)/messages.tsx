import { CreateGroupModal } from '@/components/CreateGroupModal';
import { SettingsDropdown } from '@/components/SettingsDropdown';
import { buddiColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import type { GroupInput } from '@/entities/group';
import { firebaseApi } from '@/services/firebase';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type ConversationItem = {
  id: string;
  name: string;
  lastMessage?: string;
  timestamp?: string;
  members?: number;
  isGroup?: boolean;
  isMatchOnly?: boolean;
  otherUserId?: string;
};

function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [matches, setMatches] = useState<Array<{ matchId: string; userId: string; createdAt: number }>>([]);
  const [matchNames, setMatchNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [convs, userMatches] = await Promise.all([
          firebaseApi.chat.getConversations(user.uid),
          firebaseApi.matches.getUserMatches(user.uid),
        ]);
        setConversations(convs);
        setMatches(userMatches);

        const names: Record<string, string> = {};
        await Promise.all(
          userMatches.map(async (m) => {
            const profile = await firebaseApi.profiles.getProfile(m.userId);
            names[m.userId] = profile?.name || 'Unknown';
          })
        );
        setMatchNames(names);
      } catch (error) {
        console.error('Error fetching messages data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  const conversationIds = useMemo(
    () => new Set(conversations.map((c) => c.id)),
    [conversations]
  );

  const matchesWithoutConversation = useMemo(() => {
    return matches.filter((m) => {
      const convId = getConversationId(user?.uid ?? '', m.userId);
      return !conversationIds.has(convId);
    });
  }, [matches, conversationIds, user?.uid]);

  const listItems: ConversationItem[] = useMemo(() => {
    const convItems: ConversationItem[] = conversations.map((c) => ({ ...c, isMatchOnly: false }));
    const matchOnlyItems: ConversationItem[] = matchesWithoutConversation.map((m) => ({
      id: getConversationId(user?.uid ?? '', m.userId),
      name: matchNames[m.userId] ?? 'Unknown',
      isMatchOnly: true,
      otherUserId: m.userId,
    }));
    return [...convItems, ...matchOnlyItems];
  }, [conversations, matchesWithoutConversation, matchNames, user?.uid]);

  const hasConversations = listItems.length > 0;

  const openChat = async (item: ConversationItem) => {
    if (!user?.uid) return;
    if (item.isMatchOnly && item.otherUserId) {
      try {
        await firebaseApi.chat.createConversation([item.otherUserId], false);
        const nameParam = encodeURIComponent(item.name);
        router.push(`/(tabs)/chat?id=${item.id}&name=${nameParam}`);
      } catch (error) {
        console.error('Error creating conversation:', error);
        Alert.alert('Error', 'Could not start chat. Please try again.');
      }
    } else {
      router.push(`/(tabs)/chat?id=${item.id}`);
    }
  };

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
        <Pressable onPress={() => setShowSettingsDropdown(true)}>
          <Feather name="settings" size={24} color={buddiColors.textPrimary} />
        </Pressable>
      </View>

      <SettingsDropdown
        visible={showSettingsDropdown}
        onClose={() => setShowSettingsDropdown(false)}
      />

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
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={buddiColors.primary} />
          </View>
        ) : hasConversations ? (
          <View style={styles.conversationsList}>
            {listItems.map((item) => (
              <Pressable
                key={item.id}
                style={styles.conversationItem}
                onPress={() => openChat(item)}
              >
                <View style={styles.conversationContent}>
                  <Text style={styles.conversationName}>{item.name}</Text>
                  {item.isMatchOnly ? (
                    <Text style={styles.conversationLastMessage} numberOfLines={1}>
                      Match — tap to say hi
                    </Text>
                  ) : item.lastMessage ? (
                    <Text style={styles.conversationLastMessage} numberOfLines={1}>
                      {item.lastMessage}
                    </Text>
                  ) : null}
                </View>
                {item.isMatchOnly ? (
                  <Feather name="message-circle" size={20} color={buddiColors.primary} />
                ) : item.timestamp ? (
                  <Text style={styles.conversationTime}>{item.timestamp}</Text>
                ) : null}
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
        onSubmit={async (data: GroupInput) => {
          const groupData = {
            userId: "",
            groupName: data.groupName,
            destination: data.destination,
            description: data.description,
            activityType: data.activityType,
            difficulty: data.difficulty,
            tags: data.tags,
            privacy: data.privacy,
            startDate: data.startDate,
            endDate: data.endDate,
            maxMembers: data.maxMembers,
            estimatedCost: data.estimatedCost,
            groupPhoto: data.groupPhoto || null,
            participants: data.participants,
          };
          await firebaseApi.groups.create(groupData);
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
