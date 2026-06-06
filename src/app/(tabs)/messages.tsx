import { CouplePill } from '@/components/CouplePill';
import { CreateGroupModal } from '@/components/CreateGroupModal';
import { LogoIcon } from '@/components/LogoIcon';
import { SettingsDropdown } from '@/components/SettingsDropdown';
import { buddiColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import type { GroupInput } from '@/entities/group';
import { firebaseApi } from '@/services/firebase';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ConversationItem = {
  id: string;
  name: string;
  lastMessage?: string;
  timestamp?: string;
  members?: number;
  isGroup?: boolean;
  isMatchOnly?: boolean;
  otherUserId?: string;
  partnerKind?: "solo" | "couple";
  unreadCount?: number;
};

function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [matches, setMatches] = useState<{ matchId: string; userId: string; createdAt: number }[]>([]);
  const [matchNames, setMatchNames] = useState<Record<string, string>>({});
  const [matchKinds, setMatchKinds] = useState<Record<string, "solo" | "couple">>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Subscribe to conversations in real-time
    const unsubscribeConversations = firebaseApi.chat.subscribeToConversations(user.uid, (convs) => {
      setConversations(convs);
      setIsLoading(false);
    });

    const fetchMatches = async () => {
      try {
        const userMatches = await firebaseApi.matches.getUserMatches(user.uid);
        setMatches(userMatches);

        const names: Record<string, string> = {};
        const kinds: Record<string, "solo" | "couple"> = {};
        await Promise.all(
          userMatches.map(async (m) => {
            const profile = await firebaseApi.profiles.getProfile(m.userId);
            names[m.userId] = profile?.name || 'Unknown';
            kinds[m.userId] = profile?.kind ?? "solo";
          })
        );
        setMatchNames(names);
        setMatchKinds(kinds);
      } catch (error) {
        console.error('Error fetching matches:', error);
      }
    };

    fetchMatches();

    return () => {
      unsubscribeConversations();
    };
  }, [user?.uid, refreshTrigger]);

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
      partnerKind: matchKinds[m.userId] ?? "solo",
    }));
    return [...convItems, ...matchOnlyItems];
  }, [conversations, matchesWithoutConversation, matchNames, matchKinds, user?.uid]);

  const hasConversations = listItems.length > 0;

  const openChat = async (item: ConversationItem) => {
    if (!user?.uid) return;
    if (item.isMatchOnly && item.otherUserId) {
      try {
        await firebaseApi.chat.createConversation([item.otherUserId], false);
        const nameParam = encodeURIComponent(item.name);
        router.push(`/chat?id=${item.id}&name=${nameParam}`);
      } catch (error) {
        console.error('Error creating conversation:', error);
        Alert.alert('Error', 'Could not start chat. Please try again.');
      }
    } else {
      router.push(`/chat?id=${item.id}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.logoContainer}>
          <LogoIcon size={32} />
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
            {listItems.map((item) => {
              const isGroup = item.id.startsWith('group_');
              return (
                <Pressable
                  key={item.id}
                  style={styles.conversationItem}
                  onPress={() => openChat(item)}
                >
                  {/* Avatar icon */}
                  <View style={[styles.conversationAvatar, isGroup && styles.conversationAvatarGroup]}>
                    <Feather
                      name={isGroup ? 'users' : 'user'}
                      size={18}
                      color={isGroup ? buddiColors.primary : buddiColors.textSecondary}
                    />
                  </View>

                  <View style={styles.conversationContent}>
                    <View style={styles.conversationNameRow}>
                      <Text style={styles.conversationName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
                      {item.partnerKind === "couple" && !isGroup && (
                        <CouplePill variant="compact" />
                      )}
                      {isGroup && (
                        <View style={styles.groupPill}>
                          <Text style={styles.groupPillText}>Group</Text>
                        </View>
                      )}
                    </View>
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
                   <View style={styles.conversationRight}>
                    {item.isMatchOnly ? (
                      <Feather name="message-circle" size={20} color={buddiColors.primary} />
                    ) : (
                      <>
                        {item.timestamp && (
                          <Text style={[
                            styles.conversationTime,
                            (item.unreadCount ?? 0) > 0 && styles.conversationTimeUnread
                          ]}>
                            {item.timestamp}
                          </Text>
                        )}
                        {(item.unreadCount ?? 0) > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>
                              {item.unreadCount}
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </Pressable>
              );
            })}
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
          const createdGroup = await firebaseApi.groups.create(groupData);
          setShowCreateGroup(false);
          setRefreshTrigger((t) => t + 1);
          // Open the new group chat
          router.push(`/chat?id=group_${createdGroup.id}`);
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
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: buddiColors.surface,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    direction: 'ltr',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: buddiColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: buddiColors.surfaceBorder,
    gap: 12,
  },
  conversationAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: buddiColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationAvatarGroup: {
    backgroundColor: buddiColors.primaryMuted,
  },
  conversationContent: {
    flex: 1,
    gap: 4,
  },
  conversationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: buddiColors.textPrimary,
  },
  groupPill: {
    backgroundColor: buddiColors.surfaceMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  groupPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: buddiColors.primary,
  },
  conversationLastMessage: {
    fontSize: 14,
    color: buddiColors.textSecondary,
  },
  conversationTime: {
    fontSize: 12,
    color: buddiColors.textTertiary,
  },
  conversationRight: {
    alignItems: 'flex-end',
    gap: 6,
    justifyContent: 'center',
    minWidth: 50,
  },
  conversationTimeUnread: {
    color: buddiColors.primary,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: buddiColors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
