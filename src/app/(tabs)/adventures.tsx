import { CreateGroupModal } from '@/components/CreateGroupModal';
import { buddiColors } from '@/constants/theme';
import { completedGroupsAtom, createGroupFromInput, userGroupsAtom } from '@/lib/atoms/groups';
import { Card } from '@/lib/components/Card';
import { trendingAdventures } from '@/lib/data/mockData';
import type { CreateGroupInput } from '@/lib/schemas/group';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAtom } from 'jotai';
import React, { useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type TabType = 'adventure' | 'myGroups' | 'completed';

export default function AdventuresScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('adventure');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [userGroups, setUserGroups] = useAtom(userGroupsAtom);
  const [completedGroups] = useAtom(completedGroupsAtom);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Feather name="map-pin" size={20} color={buddiColors.textOnDark} />
          </View>
          <Text style={styles.logoText}>Buddi</Text>
        </View>
        <Pressable onPress={() => {}}>
          <Feather name="settings" size={24} color={buddiColors.textPrimary} />
        </Pressable>
      </View>

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
              <Text style={styles.sectionTitle}>Trending Adventures</Text>
            </View>

            {trendingAdventures.map((adventure) => (
              <Card key={adventure.id} style={styles.adventureCard}>
                <ImageBackground
                  source={adventure.coverPhoto}
                  resizeMode="cover"
                  style={styles.cardImage}
                >
                  <View style={styles.cardOverlay}>
                    {/* Tags */}
                    <View style={styles.tagsContainer}>
                      <View style={styles.tagWhite}>
                        <Text style={styles.tagTextWhite}>{adventure.category}</Text>
                      </View>
                      <View style={styles.tagOrange}>
                        <Text style={styles.tagTextOrange}>{adventure.difficulty}</Text>
                      </View>
                    </View>
                  </View>
                </ImageBackground>

                {/* Card Content */}
                <View style={styles.cardContent}>
                  <Text style={styles.adventureName}>{adventure.name}</Text>
                  <View style={styles.adventureMeta}>
                    <View style={styles.metaRow}>
                      <Feather name="map-pin" size={16} color={buddiColors.textSecondary} />
                      <Text style={styles.metaText}>{adventure.destination}</Text>
                    </View>
                    {adventure.progress && (
                      <View style={styles.metaRow}>
                        <Feather name="layers" size={16} color={buddiColors.textSecondary} />
                        <Text style={styles.metaText}>{adventure.progress}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {activeTab === 'myGroups' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="users" size={20} color={buddiColors.primary} />
              <Text style={styles.sectionTitle}>My Groups ({userGroups.length})</Text>
            </View>

            {userGroups.length === 0 ? (
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
                <Card key={group.id} style={styles.adventureCard}>
                  <ImageBackground
                    source={group.coverPhoto}
                    resizeMode="cover"
                    style={styles.cardImage}
                  >
                    <View style={styles.cardOverlay}>
                      {/* Tags */}
                      <View style={styles.tagsContainer}>
                        {group.tags.slice(0, 2).map((tag, idx) => (
                          <View key={idx} style={styles.tagWhite}>
                            <Text style={styles.tagTextWhite}>{tag}</Text>
                          </View>
                        ))}
                        <View style={styles.tagOrange}>
                          <Text style={styles.tagTextOrange}>{group.activityType}</Text>
                        </View>
                      </View>
                    </View>
                  </ImageBackground>

                  {/* Card Content */}
                  <View style={styles.cardContent}>
                    <Text style={styles.adventureName}>{group.name}</Text>
                    <View style={styles.adventureMeta}>
                      <View style={styles.metaRow}>
                        <Feather name="map-pin" size={16} color={buddiColors.textSecondary} />
                        <Text style={styles.metaText}>{group.destination}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Feather name="users" size={16} color={buddiColors.textSecondary} />
                        <Text style={styles.metaText}>
                          {group.currentMembers}/{group.maxMembers}
                        </Text>
                      </View>
                    </View>
                    {group.description && (
                      <Text style={styles.groupDescription} numberOfLines={2}>
                        {group.description}
                      </Text>
                    )}
                    {(group.startDate || group.endDate) && (
                      <View style={styles.metaRow}>
                        <Feather name="calendar" size={14} color={buddiColors.textSecondary} />
                        <Text style={styles.dateText}>
                          {group.startDate && group.endDate
                            ? `${group.startDate} - ${group.endDate}`
                            : group.startDate || group.endDate}
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
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
                <Card key={group.id} style={styles.adventureCard}>
                  <ImageBackground
                    source={group.coverPhoto}
                    resizeMode="cover"
                    style={styles.cardImage}
                  >
                    <View style={styles.cardOverlay}>
                      <View style={styles.tagsContainer}>
                        {group.tags.slice(0, 2).map((tag, idx) => (
                          <View key={idx} style={styles.tagWhite}>
                            <Text style={styles.tagTextWhite}>{tag}</Text>
                          </View>
                        ))}
                        <View style={styles.tagOrange}>
                          <Text style={styles.tagTextOrange}>{group.activityType}</Text>
                        </View>
                      </View>
                    </View>
                  </ImageBackground>

                  <View style={styles.cardContent}>
                    <Text style={styles.adventureName}>{group.name}</Text>
                    <View style={styles.adventureMeta}>
                      <View style={styles.metaRow}>
                        <Feather name="map-pin" size={16} color={buddiColors.textSecondary} />
                        <Text style={styles.metaText}>{group.destination}</Text>
                      </View>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <CreateGroupModal
        visible={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onSubmit={(data: CreateGroupInput) => {
          console.log('Group created:', data);
          // Convert to AdventureGroup and add to user groups
          const newGroup = createGroupFromInput(data);
          setUserGroups((prev) => [...prev, newGroup]);
          setShowCreateGroup(false);
          // Switch to My Groups tab to see the newly created group
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
    justifyContent: 'flex-start',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  tagWhite: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagOrange: {
    backgroundColor: buddiColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagTextWhite: {
    fontSize: 12,
    fontWeight: '600',
    color: buddiColors.textPrimary,
  },
  tagTextOrange: {
    fontSize: 12,
    fontWeight: '600',
    color: buddiColors.textOnDark,
  },
  cardContent: {
    padding: 16,
    gap: 12,
  },
  adventureName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: buddiColors.textPrimary,
  },
  adventureMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: buddiColors.textSecondary,
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
