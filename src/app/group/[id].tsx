import { CreateGroupModal } from '@/components/CreateGroupModal';
import { buddiColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import type { Group, GroupInput } from '@/entities/group';
import type { Profile } from '@/entities/profile';
import { userGroupsAtom } from '@/lib/atoms/groups';
import { Card } from '@/lib/components/Card';
import type { AdventureGroup } from '@/lib/data/mockData';
import { firebaseApi } from '@/services/firebase';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
  };
}

type LikerWithProfile = { userId: string; createdAt: number; name: string };

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [groupLikes, setGroupLikes] = useState<LikerWithProfile[]>([]);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useAtom(userGroupsAtom);

  const fetchGroup = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const g = await firebaseApi.groups.getGroup(id);
      setGroup(g);
    } catch (error) {
      console.error('Error fetching group:', error);
      Alert.alert('Error', 'Failed to load group.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  // If current user is creator, fetch who liked the group
  useEffect(() => {
    if (!group || !user?.uid || group.userId !== user.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const likes = await firebaseApi.likes.getGroupLikes(group.id);
        const withNames: LikerWithProfile[] = [];
        for (const { userId, createdAt } of likes) {
          const profile: Profile | null = await firebaseApi.profiles.getProfile(userId);
          if (cancelled) return;
          withNames.push({
            userId,
            createdAt,
            name: profile?.name || 'Unknown',
          });
        }
        if (!cancelled) setGroupLikes(withNames);
      } catch (e) {
        console.error('Error fetching group likes:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [group?.id, group?.userId, user?.uid]);

  const isCreator = !!user?.uid && !!group && group.userId === user.uid;
  const isParticipant = !!user?.uid && !!group && (group.userId === user.uid || (group.participants ?? []).includes(user.uid));
  const isCompleted = group?.status === 'completed';
  const participants = group?.participants ?? [];
  const maxMembers = group?.maxMembers ?? 10;
  const canAddMore = (participants.length + 1) < maxMembers;

  const handleMarkCompleted = async () => {
    if (!group?.id) return;
    try {
      await firebaseApi.groups.markCompleted(group.id);
      await fetchGroup();
      if (user?.uid) {
        const groups = await firebaseApi.groups.getUserGroups(user.uid);
        const active: AdventureGroup[] = [];
        const completed: AdventureGroup[] = [];
        groups.forEach((g: Group) => {
          const converted = groupToAdventureGroup(g);
          if (g.status === 'completed') completed.push(converted);
          else active.push(converted);
        });
        setUserGroups(active);
      }
      Alert.alert('Done', 'Group marked as completed.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark as completed.');
    }
  };

  const handleAddToGroup = async (likerUserId: string) => {
    if (!group?.id || !canAddMore) return;
    try {
      setAddingUserId(likerUserId);
      await firebaseApi.groups.addParticipant(group.id, likerUserId);
      await fetchGroup();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not add to group.');
    } finally {
      setAddingUserId(null);
    }
  };

  const handleEditSubmit = async (data: GroupInput) => {
    if (!group?.id) return;
    await firebaseApi.groups.update(group.id, {
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
      groupPhoto: data.groupPhoto ?? undefined,
    });
    await fetchGroup();
    if (user?.uid) {
      const groups = await firebaseApi.groups.getUserGroups(user.uid);
      const active: AdventureGroup[] = [];
      groups.forEach((g: Group) => {
        if (g.status !== 'completed') active.push(groupToAdventureGroup(g));
      });
      setUserGroups(active);
    }
  };

  if (loading || !group) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={buddiColors.primary} />
      </View>
    );
  }

  const coverPhoto = group.groupPhoto
    ? { uri: group.groupPhoto }
    : require('@/assets/images/react-logo.png');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={buddiColors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Group</Text>
        {isCreator && !isCompleted && (
          <Pressable onPress={() => setShowEditModal(true)} style={styles.editButton}>
            <Feather name="edit-2" size={20} color={buddiColors.primary} />
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <ImageBackground source={coverPhoto} resizeMode="cover" style={styles.coverImage}>
            {isCompleted && (
              <View style={styles.completedBadge}>
                <Feather name="check-circle" size={20} color={buddiColors.textOnDark} />
                <Text style={styles.completedBadgeText}>Completed</Text>
              </View>
            )}
          </ImageBackground>
          <View style={styles.body}>
            <Text style={styles.name}>{group.groupName || 'Unnamed Group'}</Text>
            <View style={styles.meta}>
              <Feather name="map-pin" size={16} color={buddiColors.textSecondary} />
              <Text style={styles.metaText}>{group.destination || 'TBA'}</Text>
            </View>
            <View style={styles.meta}>
              <Feather name="users" size={16} color={buddiColors.textSecondary} />
              <Text style={styles.metaText}>
                {(group.participants?.length ?? 0) + 1} / {group.maxMembers ?? 10} members
              </Text>
            </View>
            {(group.startDate || group.endDate) && (
              <View style={styles.meta}>
                <Feather name="calendar" size={16} color={buddiColors.textSecondary} />
                <Text style={styles.metaText}>
                  {formatGroupDate(group.startDate)} – {formatGroupDate(group.endDate)}
                </Text>
              </View>
            )}
            {group.activityType && (
              <View style={styles.tagRow}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{group.activityType}</Text>
                </View>
                {group.difficulty && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{group.difficulty}</Text>
                  </View>
                )}
              </View>
            )}
            {group.description ? (
              <Text style={styles.description}>{group.description}</Text>
            ) : null}
            {group.tags && group.tags.length > 0 && (
              <View style={styles.tagRow}>
                {group.tags.map((tag, i) => (
                  <View key={i} style={styles.tagSmall}>
                    <Text style={styles.tagSmallText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Card>

        {isParticipant && (
          <Pressable
            style={styles.chatButton}
            onPress={() => router.push(`/chat?id=group_${group.id}`)}
          >
            <Feather name="message-circle" size={20} color={buddiColors.textOnDark} />
            <Text style={styles.chatButtonText}>Group chat</Text>
          </Pressable>
        )}

        {isCreator && !isCompleted && (
          <Pressable style={styles.primaryButton} onPress={handleMarkCompleted}>
            <Feather name="check-circle" size={20} color={buddiColors.textOnDark} />
            <Text style={styles.primaryButtonText}>Mark as completed</Text>
          </Pressable>
        )}

        {isCreator && groupLikes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who liked this group</Text>
            <Text style={styles.sectionSubtitle}>Add them to your group to accept their interest.</Text>
            {groupLikes.map((liker) => {
              const alreadyInGroup = participants.includes(liker.userId);
              const adding = addingUserId === liker.userId;
              return (
                <View key={liker.userId} style={styles.likerRow}>
                  <Text style={styles.likerName}>{liker.name}</Text>
                  {alreadyInGroup ? (
                    <View style={styles.addedBadge}>
                      <Text style={styles.addedBadgeText}>In group</Text>
                    </View>
                  ) : !canAddMore ? (
                    <Text style={styles.cannotAddText}>Full</Text>
                  ) : (
                    <Pressable
                      style={[styles.addButton, adding && styles.addButtonDisabled]}
                      onPress={() => handleAddToGroup(liker.userId)}
                      disabled={adding}
                    >
                      {adding ? (
                        <ActivityIndicator size="small" color={buddiColors.textOnDark} />
                      ) : (
                        <>
                          <Feather name="user-plus" size={16} color={buddiColors.textOnDark} />
                          <Text style={styles.addButtonText}>Add to group</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <CreateGroupModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        mode="edit"
        initialData={{
          groupName: group.groupName,
          destination: group.destination,
          description: group.description,
          activityType: group.activityType,
          difficulty: group.difficulty,
          tags: group.tags,
          privacy: group.privacy,
          startDate: group.startDate
            ? new Date(group.startDate).toISOString().slice(0, 10)
            : undefined,
          endDate: group.endDate ? new Date(group.endDate).toISOString().slice(0, 10) : undefined,
          maxMembers: group.maxMembers,
          estimatedCost: group.estimatedCost,
          groupPhoto: group.groupPhoto ?? undefined,
          participants: group.participants,
        }}
        onSubmit={handleEditSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: buddiColors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: buddiColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: buddiColors.surfaceBorder,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: buddiColors.textPrimary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  editButtonText: {
    fontSize: 16,
    color: buddiColors.primary,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    overflow: 'hidden',
    padding: 0,
    marginBottom: 20,
  },
  coverImage: {
    width: '100%',
    height: 200,
  },
  completedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  completedBadgeText: {
    color: buddiColors.textOnDark,
    fontWeight: '600',
    fontSize: 14,
  },
  body: {
    padding: 16,
    gap: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: buddiColors.textPrimary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: buddiColors.textSecondary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: buddiColors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: buddiColors.textPrimary,
    fontWeight: '500',
  },
  tagSmall: {
    backgroundColor: buddiColors.surfaceBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagSmallText: {
    fontSize: 12,
    color: buddiColors.textSecondary,
  },
  description: {
    fontSize: 14,
    color: buddiColors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: buddiColors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: buddiColors.textOnDark,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: buddiColors.surface,
    borderWidth: 1,
    borderColor: buddiColors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: buddiColors.primary,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: buddiColors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: buddiColors.textSecondary,
    marginBottom: 12,
  },
  likerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: buddiColors.surface,
    borderRadius: 12,
    marginBottom: 8,
  },
  likerName: {
    fontSize: 16,
    fontWeight: '500',
    color: buddiColors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: buddiColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: buddiColors.textOnDark,
  },
  addedBadge: {
    backgroundColor: buddiColors.surfaceBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addedBadgeText: {
    fontSize: 12,
    color: buddiColors.textSecondary,
    fontWeight: '500',
  },
  cannotAddText: {
    fontSize: 14,
    color: buddiColors.textSecondary,
  },
});
