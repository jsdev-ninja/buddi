import { CreateGroupModal } from '@/components/CreateGroupModal';
import { LogoIcon } from '@/components/LogoIcon';
import { SettingsDropdown } from '@/components/SettingsDropdown';
import { buddiColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import type { Group, GroupInput } from '@/entities/group';
import { completedGroupsAtom, userGroupsAtom } from '@/lib/atoms/groups';
import { Card } from '@/lib/components/Card';
import type { AdventureGroup } from '@/lib/data/mockData';
import { firebaseApi } from '@/services/firebase';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabType = 'adventure' | 'myGroups' | 'completed';

function formatGroupDate(date?: number | string): string {
  if (!date) return '';
  if (typeof date === 'number') return new Date(date).toLocaleDateString();
  return new Date(date).toLocaleDateString();
}

function groupToAdventureGroup(group: Group): AdventureGroup {
  return {
    id: group.id,
    name: group.groupName || 'Unnamed Group',
    destination: group.destination || 'TBA',
    description: group.description || '',
    coverPhoto: group.groupPhoto
      ? { uri: group.groupPhoto }
      : require('@/assets/images/react-logo.png'),
    startDate: formatGroupDate(group.startDate),
    endDate: formatGroupDate(group.endDate),
    currentMembers: (group.participants?.length || 0) + 1,
    maxMembers: group.maxMembers || 10,
    tags: group.tags || [],
    activityType: group.activityType || 'Other',
    difficulty: group.difficulty,
  };
}

function GroupCard({ group, onPress }: { group: AdventureGroup; onPress: () => void }) {
  const [liked, setLiked] = React.useState(false);
  const dateLabel = group.startDate && group.endDate
    ? `${group.startDate} – ${group.endDate}`
    : group.startDate || group.endDate || null;

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.adventureCard}>
        <ImageBackground
          source={group.coverPhoto}
          resizeMode="cover"
          style={styles.cardImage}
        >
          <View style={styles.cardImageOverlay}>
            <View style={styles.badgeActivity}>
              <Text style={styles.badgeActivityText}>{group.activityType}</Text>
            </View>
            {group.difficulty ? (
              <View style={styles.badgeDifficulty}>
                <Text style={styles.badgeDifficultyText}>{group.difficulty}</Text>
              </View>
            ) : null}
          </View>
        </ImageBackground>

        <View style={styles.cardContent}>
          <Text style={styles.adventureName}>{group.name}</Text>

          <View style={styles.adventureMeta}>
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={14} color={buddiColors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>{group.destination}</Text>
            </View>
            <View style={styles.metaRow}>
              <Feather name="users" size={14} color={buddiColors.textSecondary} />
              <Text style={styles.metaText}>{group.currentMembers}/{group.maxMembers}</Text>
            </View>
          </View>

          {group.description ? (
            <Text style={styles.groupDescription} numberOfLines={3}>{group.description}</Text>
          ) : null}

          {group.tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {group.tags.slice(0, 4).map((tag, idx) => (
                <View key={idx} style={styles.tagPill}>
                  <Feather name="tag" size={11} color={buddiColors.textSecondary} />
                  <Text style={styles.tagPillText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.cardFooter}>
            {dateLabel ? (
              <View style={styles.metaRow}>
                <Feather name="calendar" size={14} color={buddiColors.textSecondary} />
                <Text style={styles.dateText}>{dateLabel}</Text>
              </View>
            ) : <View />}
            <Pressable onPress={() => setLiked((v) => !v)} hitSlop={8}>
              <Feather
                name="heart"
                size={20}
                color={liked ? buddiColors.primary : buddiColors.textSecondary}
              />
            </Pressable>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export default function AdventuresScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('adventure');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [userGroups, setUserGroups] = useAtom(userGroupsAtom);
  const [completedGroups, setCompletedGroups] = useAtom(completedGroupsAtom);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [discoverGroups, setDiscoverGroups] = useState<AdventureGroup[]>([]);
  const [isLoadingDiscover, setIsLoadingDiscover] = useState(false);

  // Fetch user groups (active + completed) from Firestore
  useEffect(() => {
    const fetchUserGroups = async () => {
      if (!user?.uid) {
        setUserGroups([]);
        setCompletedGroups([]);
        return;
      }

      try {
        setIsLoadingGroups(true);
        const groups = await firebaseApi.groups.getUserGroups(user.uid);
        const active: AdventureGroup[] = [];
        const completed: AdventureGroup[] = [];
        groups.forEach((group: Group) => {
          const converted = groupToAdventureGroup(group);
          if (group.status === 'completed') {
            completed.push(converted);
          } else {
            active.push(converted);
          }
        });
        setUserGroups(active);
        setCompletedGroups(completed);
      } catch (error) {
        console.error('Error fetching user groups:', error);
        Alert.alert('Error', 'Failed to load your groups. Please try again.');
      } finally {
        setIsLoadingGroups(false);
      }
    };

    fetchUserGroups();
  }, [user?.uid, setUserGroups, setCompletedGroups]);

  // Fetch discover groups for Adventure tab
  const fetchDiscoverGroups = useCallback(async () => {
    if (!user?.uid) {
      setDiscoverGroups([]);
      return;
    }
    try {
      setIsLoadingDiscover(true);
      const hides = await firebaseApi.likes.getUserHides(user.uid);
      const firestoreGroups = await firebaseApi.groups.getDiscoverGroups(user.uid, hides.groups);
      setDiscoverGroups(firestoreGroups.map((g: Group) => groupToAdventureGroup(g)));
    } catch (error) {
      console.error('Error fetching discover groups:', error);
    } finally {
      setIsLoadingDiscover(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (activeTab === 'adventure') fetchDiscoverGroups();
  }, [activeTab, fetchDiscoverGroups]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.logoContainer}>
          <LogoIcon size={32} />
          <Text style={styles.logoText}>Buddi</Text>
        </View>
        <Pressable onPress={() => setShowSettingsDropdown(true)}>
          <Feather name="settings" size={24} color={buddiColors.textPrimary} />
        </Pressable>
      </View>

      <SettingsDropdown
        visible={showSettingsDropdown}
        onClose={() => setShowSettingsDropdown(false)}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* My Adventures Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Adventures</Text>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable 
              style={[styles.actionButton, styles.discoverButton]}
              onPress={() => router.push('/(tabs)/index' as any)}
            >
              <Feather name="compass" size={20} color={buddiColors.textPrimary} />
              <Text style={styles.actionButtonText}>Discover</Text>
            </Pressable>
            <Pressable 
              style={[styles.actionButton, styles.createButton]}
              onPress={() => setShowCreateGroup(true)}
            >
              <Feather name="plus" size={20} color={buddiColors.textOnDark} />
              <Text style={[styles.actionButtonText, styles.createButtonText]}>Create Group</Text>
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <Pressable
              style={[styles.tab, activeTab === 'adventure' && styles.activeTab]}
              onPress={() => setActiveTab('adventure')}
            >
              <Text style={[styles.tabText, activeTab === 'adventure' && styles.activeTabText]}>
                Adventure
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'myGroups' && styles.activeTab]}
              onPress={() => setActiveTab('myGroups')}
            >
              <Text style={[styles.tabText, activeTab === 'myGroups' && styles.activeTabText]}>
                My Groups
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
              onPress={() => setActiveTab('completed')}
            >
              <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
                Completed
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Tab Content */}
        {activeTab === 'adventure' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="trending-up" size={20} color={buddiColors.primary} />
              <Text style={styles.sectionTitle}>Discover Groups</Text>
            </View>

            {isLoadingDiscover ? (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Loading...</Text>
                </View>
              </Card>
            ) : discoverGroups.length === 0 ? (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyState}>
                  <Feather name="compass" size={48} color={buddiColors.surfaceBorder} />
                  <Text style={styles.emptyTitle}>No groups to discover</Text>
                  <Text style={styles.emptySubtitle}>
                    Check back later or create your own group.
                  </Text>
                </View>
              </Card>
            ) : (
              discoverGroups.map((adventure) => (
                <GroupCard
                  key={adventure.id}
                  group={adventure}
                  onPress={() => router.push(`/group/${adventure.id}` as any)}
                />
              ))
            )}
          </View>
        )}

        {activeTab === 'myGroups' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="users" size={20} color={buddiColors.primary} />
              <Text style={styles.sectionTitle}>My Groups ({userGroups.length})</Text>
            </View>

            {isLoadingGroups ? (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Loading groups...</Text>
                </View>
              </Card>
            ) : userGroups.length === 0 ? (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyState}>
                  <Feather name="users" size={48} color={buddiColors.surfaceBorder} />
                  <Text style={styles.emptyTitle}>No groups yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Create your first group to start planning adventures!
                  </Text>
                  <Pressable 
                    style={styles.createGroupEmptyButton}
                    onPress={() => setShowCreateGroup(true)}
                  >
                    <Feather name="plus" size={20} color={buddiColors.textOnDark} />
                    <Text style={styles.createGroupEmptyText}>Create Group</Text>
                  </Pressable>
                </View>
              </Card>
            ) : (
              userGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onPress={() => router.push(`/group/${group.id}` as any)}
                />
              ))
            )}
          </View>
        )}

        {activeTab === 'completed' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="check-circle" size={20} color={buddiColors.primary} />
              <Text style={styles.sectionTitle}>Completed Adventures</Text>
            </View>

            {completedGroups.length === 0 ? (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyState}>
                  <Feather name="check-circle" size={48} color={buddiColors.surfaceBorder} />
                  <Text style={styles.emptyTitle}>No completed adventures yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Your completed adventures will appear here.
                  </Text>
                </View>
              </Card>
            ) : (
              completedGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onPress={() => router.push(`/group/${group.id}` as any)}
                />
              ))
            )}
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
          if (user?.uid) {
            const groups = await firebaseApi.groups.getUserGroups(user.uid);
            const active: AdventureGroup[] = [];
            const completed: AdventureGroup[] = [];
            groups.forEach((group: Group) => {
              const converted = groupToAdventureGroup(group);
              if (group.status === 'completed') completed.push(converted);
              else active.push(converted);
            });
            setUserGroups(active);
            setCompletedGroups(completed);
          }
          setActiveTab('myGroups');
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: buddiColors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  discoverButton: {
    backgroundColor: buddiColors.surface,
    borderColor: buddiColors.surfaceBorder,
  },
  createButton: {
    backgroundColor: buddiColors.primary,
    borderColor: buddiColors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: buddiColors.textPrimary,
  },
  createButtonText: {
    color: buddiColors.textOnDark,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: buddiColors.surfaceBorder,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: buddiColors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: buddiColors.textSecondary,
  },
  activeTabText: {
    color: buddiColors.primary,
    fontWeight: '600',
  },
  adventureCard: {
    marginBottom: 16,
    overflow: 'hidden',
    padding: 0,
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
  },
  badgeActivity: {
    backgroundColor: 'rgba(20,20,20,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeActivityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  badgeDifficulty: {
    backgroundColor: buddiColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeDifficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  cardContent: {
    padding: 16,
    gap: 10,
  },
  adventureName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: buddiColors.textPrimary,
  },
  adventureMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    color: buddiColors.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: buddiColors.surfaceBorder,
    backgroundColor: buddiColors.surfaceMuted,
  },
  tagPillText: {
    fontSize: 12,
    color: buddiColors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: buddiColors.textPrimary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: buddiColors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  createGroupEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: buddiColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  createGroupEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: buddiColors.textOnDark,
  },
  groupDescription: {
    fontSize: 14,
    color: buddiColors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  dateText: {
    fontSize: 12,
    color: buddiColors.textSecondary,
  },
});
