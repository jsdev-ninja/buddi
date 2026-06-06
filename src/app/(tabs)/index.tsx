import {
	defaultDiscoverFilter,
	DiscoverFilterModal,
	type DiscoverFilterState,
} from '@/components/DiscoverFilterModal';
import { CouplePill } from '@/components/CouplePill';
import { LogoIcon } from '@/components/LogoIcon';
import { SettingsDropdown } from '@/components/SettingsDropdown';
import { SwipeableCard } from '@/components/SwipeableCard';
import { buddiColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import type { Group } from '@/entities/group';
import type { Profile } from '@/entities/profile';
import { Card } from '@/lib/components/Card';
import type { AdventureGroup, TravelerProfile } from '@/lib/data/mockData';
import { getDisplayName, isCoupleProfile } from '@/lib/profile';
import { t } from '@/lib/i18n/strings';
import { firebaseApi } from '@/services/firebase';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CombinedCard =
  | { type: 'traveler'; data: TravelerProfile }
  | { type: 'group'; data: AdventureGroup };

export default function DiscoverScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filter, setFilter] = useState<DiscoverFilterState>(defaultDiscoverFilter);
  const [profiles, setProfiles] = useState<TravelerProfile[]>([]);
  const [groups, setGroups] = useState<AdventureGroup[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

  const fetchData = React.useCallback(async () => {
      if (!user?.uid) {
        setProfiles([]);
        setGroups([]);
        setIsLoadingProfiles(false);
        return;
      }

      try {
        setIsLoadingProfiles(true);
        
        // Get user's hides to filter them out
        const hides = await firebaseApi.likes.getUserHides(user.uid);
        
        // Fetch profiles and filter out hidden ones
        const firestoreProfiles = await firebaseApi.profiles.getDiscoverProfiles(user.uid);
        const filteredProfiles = firestoreProfiles.filter(
          (profile: Profile) => !hides.profiles.includes(profile.id)
        );

        // Convert Profile to TravelerProfile format (prefer photos[0] for main image)
        const convertedProfiles: TravelerProfile[] = filteredProfiles.map((profile: Profile) => {
          const photoUri = profile.photos?.[0] ?? profile.profilePhoto;
          return {
            id: profile.id,
            name: profile.name || 'Unknown',
            age: profile.age || 0,
            location: profile.location || profile.country || '',
            locationFlag: profile.locationFlag || undefined,
            bio: profile.bio || '',
            profilePhoto: photoUri ? { uri: photoUri } : require('@/assets/images/react-logo.png'),
            verified: profile.verified || false,
            interests: profile.interests || [],
            adventurePlan: profile.adventurePlan || undefined,
            gender: profile.gender,
            photos: profile.photos || [],
            prompts: profile.prompts || [],
            completedAdventures: profile.completedAdventures || [],
            kind: profile.kind,
            partnerName: profile.partnerName,
            partnerAge: profile.partnerAge,
          };
        });

        setProfiles(convertedProfiles);

        // Fetch groups and filter out hidden ones
        const firestoreGroups = await firebaseApi.groups.getDiscoverGroups(user.uid, hides.groups);
        const formatDate = (date?: number | string) => {
          if (!date) return '';
          if (typeof date === 'number') {
            return new Date(date).toLocaleDateString();
          }
          return new Date(date).toLocaleDateString();
        };

        const convertedGroups: AdventureGroup[] = firestoreGroups.map((group: Group) => ({
          id: group.id,
          name: group.groupName || 'Unnamed Group',
          destination: group.destination || 'TBA',
          description: group.description || '',
          coverPhoto: group.groupPhoto
            ? { uri: group.groupPhoto }
            : require('@/assets/images/react-logo.png'),
          startDate: formatDate(group.startDate),
          endDate: formatDate(group.endDate),
          currentMembers: (group.participants?.length || 0) + 1,
          maxMembers: group.maxMembers || 10,
          tags: group.tags || [],
          activityType: group.activityType || 'Other',
          difficulty: group.difficulty || undefined,
        }));

        setGroups(convertedGroups);
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load data. Please try again.');
      } finally {
        setIsLoadingProfiles(false);
      }
  }, [user?.uid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const cards = useMemo<CombinedCard[]>(() => {
    let filteredProfiles = profiles;
    let filteredGroups = groups;

    if (filter.lookingFor !== 'group') {
      filteredProfiles = profiles.filter((p) => {
        if (filter.verifiedOnly && !p.verified) return false;
        if (p.age < filter.ageMin || p.age > filter.ageMax) return false;
        if (filter.lookingFor === 'male' && p.gender !== 'male') return false;
        if (filter.lookingFor === 'female' && p.gender !== 'female') return false;
        return true;
      });
    }
    if (filter.lookingFor === 'group') {
      filteredProfiles = [];
    }
    if (filter.lookingFor !== 'male' && filter.lookingFor !== 'female') {
      filteredGroups = groups.filter((g) => {
        if (filter.activityType !== 'all' && g.activityType !== filter.activityType) return false;
        return true;
      });
    }
    if (filter.lookingFor === 'male' || filter.lookingFor === 'female') {
      filteredGroups = [];
    }

    const travelers = filteredProfiles.map((data) => ({ type: 'traveler' as const, data }));
    const groupsCards = filteredGroups.map((data) => ({ type: 'group' as const, data }));
    return [...travelers, ...groupsCards];
  }, [profiles, groups, filter]);

  const current = cards[index];

  const handleLike = async () => {
    if (!current || !user?.uid) return;
    
    try {
      if (current.type === 'traveler') {
        await firebaseApi.likes.likeProfile(current.data.id);
      } else if (current.type === 'group') {
        await firebaseApi.likes.likeGroup(current.data.id);
      }
      moveToNextCard();
    } catch (error) {
      console.error('Error liking:', error);
      Alert.alert('Error', 'Failed to save like. Please try again.');
    }
  };

  const handlePass = async () => {
    if (!current || !user?.uid) return;
    
    try {
      if (current.type === 'traveler') {
        await firebaseApi.likes.dislikeProfile(current.data.id);
      } else if (current.type === 'group') {
        await firebaseApi.likes.dislikeGroup(current.data.id);
      }
      moveToNextCard();
    } catch (error) {
      console.error('Error disliking:', error);
      Alert.alert('Error', 'Failed to save dislike. Please try again.');
    }
  };

  const moveToNextCard = () => {
    setIndex((prev) => prev + 1);
    // Allow advancing past last card so "You've seen everyone!" shows only after last card is seen
  };

  const handleBackToStart = () => {
    setIndex(0);
  };

  const handleUndo = () => {
    if (index > 0) {
      setIndex((prev) => prev - 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header - respect safe area so it never overlaps status bar or card */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.logoContainer}>
          <LogoIcon size={32} />
          <Text style={styles.logoText}>Buddia</Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable onPress={handleUndo} style={styles.iconButton}>
            <Feather name="rotate-ccw" size={20} color={buddiColors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => fetchData()} style={styles.iconButton} accessibilityLabel="Refresh">
            <Feather name="refresh-cw" size={20} color={buddiColors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => setShowFilterModal(true)}
            style={[styles.iconButton, styles.filterButton]}
          >
            <Feather name="filter" size={20} color={buddiColors.textOnDark} />
          </Pressable>
          <Pressable onPress={() => setShowSettingsDropdown(true)} style={styles.iconButton}>
            <Feather name="settings" size={20} color={buddiColors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <SettingsDropdown
        visible={showSettingsDropdown}
        onClose={() => setShowSettingsDropdown(false)}
      />

      <DiscoverFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        initialFilter={filter}
        onApply={(newFilter) => {
          setFilter(newFilter);
          setIndex(0);
        }}
      />

      {/* Main Card - fills all available space */}
      <View style={[styles.cardContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {isLoadingProfiles ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading profiles...</Text>
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="users" size={48} color={buddiColors.textTertiary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No profiles to show</Text>
            <Text style={styles.emptyText}>There are no more profiles to discover right now. Check back later for new travelers and groups.</Text>
          </View>
        ) : current ? (
          <SwipeableCard
            key={current.data.id}
            cardKey={current.data.id}
            onSwipeRight={handleLike}
            onSwipeLeft={handlePass}
            onSwipeComplete={moveToNextCard}
          >
            <Card style={styles.mainCard}>
              {current.type === 'traveler' ? (
                <ScrollView
                  style={styles.travelerScrollView}
                  contentContainerStyle={styles.travelerScrollContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  bounces={false}
                >
                  {/* Profile photo - tap to view full profile */}
                  <Pressable
                    style={styles.travelerPhotoSection}
                    onPress={() => router.push(`/view-profile/${current.data.id}` as any)}
                  >
                    <Image
                      source={current.data.profilePhoto}
                      style={styles.travelerPhoto}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.7)']}
                      style={styles.travelerPhotoGradient}
                    >
                      <View style={styles.profileOverlay}>
                        <Text style={styles.profileName} numberOfLines={1} ellipsizeMode="tail">
                          {getDisplayName(current.data)}{current.data.age > 0 ? `, ${current.data.kind === 'couple' && current.data.partnerAge ? `${current.data.age} & ${current.data.partnerAge}` : current.data.age}` : ''}
                        </Text>
                        {isCoupleProfile(current.data) && <CouplePill variant="full" />}
                        {(current.data.location || current.data.locationFlag) && (
                          <View style={styles.locationRow}>
                            <Feather name="map-pin" size={14} color={buddiColors.textOnDark} />
                            <Text style={styles.locationText}>
                              {current.data.location || ''}
                              {current.data.locationFlag ? ` ${current.data.locationFlag}` : ''}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.viewProfileHint}>Tap to view profile</Text>
                      </View>
                    </LinearGradient>
                  </Pressable>

                  {/* Pass / Like action buttons */}
                  <View style={styles.travelerActionsSection}>
                    <Pressable
                      style={styles.passButton}
                      onPress={handlePass}
                      accessibilityLabel="Pass"
                    >
                      <Feather name="x" size={28} color={buddiColors.dangerText} />
                    </Pressable>
                    <Pressable
                      style={styles.likeButton}
                      onPress={handleLike}
                      accessibilityLabel="Like"
                    >
                      <Feather name="heart" size={28} color={buddiColors.textOnDark} />
                    </Pressable>
                  </View>

                  {/* ── Scrollable extra sections ── */}
                  <View style={styles.cardDetailSections}>
                    {/* Photos grid (skip index 0 — already shown as main photo) */}
                    {current.data.photos && current.data.photos.length > 1 && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Photos</Text>
                        <View style={styles.photoGrid}>
                          {current.data.photos.slice(1).map((uri, i) => (
                            <Image
                              key={i}
                              source={{ uri }}
                              style={styles.photoGridItem}
                              resizeMode="cover"
                            />
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Partners mini-row (couple only) */}
                    {isCoupleProfile(current.data) && !!current.data.partnerName && (
                      <View style={styles.detailSection}>
                        <Text style={styles.partnersRow}>
                          {`${current.data.name} · ${current.data.age}   /   ${current.data.partnerName} · ${current.data.partnerAge ?? '?'}`}
                        </Text>
                      </View>
                    )}

                    {/* Bio */}
                    {!!current.data.bio && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>
                          {isCoupleProfile(current.data) ? t('profile.aboutUs') : t('profile.aboutMe')}
                        </Text>
                        <Text style={styles.detailBioText}>{current.data.bio}</Text>
                      </View>
                    )}

                    {/* Prompts */}
                    {current.data.prompts && current.data.prompts.some((p) => p.answer?.trim()) && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>My Answers</Text>
                        <View style={styles.promptsList}>
                          {current.data.prompts
                            .filter((p) => p.answer?.trim())
                            .map((p, i) => (
                              <View key={i} style={styles.promptCard}>
                                <Text style={styles.promptQuestion}>{p.question}</Text>
                                <Text style={styles.promptAnswer}>{p.answer}</Text>
                              </View>
                            ))}
                        </View>
                      </View>
                    )}

                    {/* Interests */}
                    {current.data.interests && current.data.interests.length > 0 && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>
                          Interests ({current.data.interests.length})
                        </Text>
                        <View style={styles.interestsRow}>
                          {current.data.interests.map((interest, i) => (
                            <View key={i} style={styles.interestPill}>
                              <Text style={styles.interestPillText}>{interest}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Completed Adventures */}
                    {current.data.completedAdventures && current.data.completedAdventures.length > 0 && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Completed Adventures</Text>
                        <View style={styles.adventuresList}>
                          {current.data.completedAdventures.map((adv, i) => (
                            <View key={i} style={styles.adventureItem}>
                              {adv.photo ? (
                                <Image
                                  source={{ uri: adv.photo }}
                                  style={styles.adventurePhoto}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.adventurePhotoPlaceholder}>
                                  <Feather name="map" size={16} color={buddiColors.textTertiary} />
                                </View>
                              )}
                              <View style={styles.adventureInfo}>
                                <Text style={styles.adventureTitle}>{adv.title}</Text>
                                {(adv.startDate || adv.endDate) && (
                                  <Text style={styles.adventureDates}>
                                    {adv.startDate}{adv.startDate && adv.endDate ? ' • ' : ''}{adv.endDate}
                                  </Text>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                </ScrollView>
              ) : (
                <>
                  {/* Group Card - Upper Section (60%) */}
                  <View style={styles.groupImageSection}>
                    {/* Tags in top corners */}
                    <View style={styles.groupTagsContainer}>
                      {current.data.activityType ? (
                        <View style={styles.groupTag}>
                          <Text style={styles.groupTagText}>{current.data.activityType}</Text>
                        </View>
                      ) : (
                        <View />
                      )}
                      {current.data.difficulty ? (
                        <View style={[styles.groupTag, styles.groupTagDifficulty]}>
                          <Text style={styles.groupTagDifficultyText}>{current.data.difficulty}</Text>
                        </View>
                      ) : (
                        <View />
                      )}
                    </View>
                  </View>

                  {/* Group Card - Lower Section (40%) */}
                  <View style={styles.groupContentSection}>
                    {/* Title */}
                    <Text style={styles.groupTitle}>{current.data.name}</Text>

                    {/* Location and Participants Row */}
                    <View style={styles.groupInfoRow}>
                      <View style={styles.groupInfoItem}>
                        <Feather name="map-pin" size={14} color={buddiColors.primary} />
                        <Text style={styles.groupInfoText}>{current.data.destination}</Text>
                      </View>
                      <View style={styles.groupInfoItem}>
                        <Feather name="users" size={14} color={buddiColors.primary} />
                        <Text style={styles.groupInfoText}>
                          {current.data.currentMembers}/{current.data.maxMembers}
                        </Text>
                      </View>
                    </View>

                    {/* Description */}
                    {current.data.description && (
                      <Text style={styles.groupDescription} numberOfLines={2}>
                        {current.data.description}
                      </Text>
                    )}

                    {/* Tags */}
                    {current.data.tags && current.data.tags.length > 0 && (
                      <View style={styles.groupTagsRow}>
                        {current.data.tags.slice(0, 3).map((tag, index) => (
                          <View key={index} style={styles.groupContentTag}>
                            <Text style={styles.groupContentTagText}>{tag}</Text>
                          </View>
                        ))}
                        {current.data.tags.length > 3 && (
                          <View style={styles.groupContentTag}>
                            <Text style={styles.groupContentTagText}>
                              +{current.data.tags.length - 3} more
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Date and Like Button Row */}
                    <View style={styles.groupFooterRow}>
                      {current.data.startDate && (
                        <View style={styles.groupDateRow}>
                          <Feather name="calendar" size={14} color={buddiColors.textPrimary} />
                          <Text style={styles.groupDateText}>{current.data.startDate}</Text>
                        </View>
                      )}
                      <Pressable onPress={handleLike} style={styles.groupLikeButton}>
                        <Feather name="heart" size={18} color={buddiColors.primary} />
                      </Pressable>
                    </View>
                  </View>
                </>
              )}
            </Card>
          </SwipeableCard>
        ) : null}

        {/* Only after user has seen all cards (passed or liked the last one) */}
        {!isLoadingProfiles && cards.length > 0 && index >= cards.length && (
          <View style={styles.noMoreContainer}>
            <Text style={styles.noMoreTitle}>You&apos;ve seen everyone!</Text>
            <Text style={styles.noMoreText}>No more profiles to show. Go back to review or check back later for new travelers.</Text>
            <Pressable style={styles.backToStartButton} onPress={handleBackToStart}>
              <Feather name="refresh-cw" size={18} color={buddiColors.textOnDark} />
              <Text style={styles.backToStartButtonText}>Back to Start</Text>
            </Pressable>
          </View>
        )}
      </View>
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
    paddingBottom: 16,
    backgroundColor: buddiColors.surface,
    // paddingTop set via insets in JSX for safe area
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
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: buddiColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButton: {
    backgroundColor: buddiColors.primary,
  },
  cardContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 12,
  },
  mainCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 0,
  },
  travelerScrollView: {
    flex: 1,
  },
  travelerScrollContent: {
    flexGrow: 1,
  },
  travelerPhotoSection: {
    height: 360,
    width: '100%',
    position: 'relative',
    backgroundColor: buddiColors.surfaceMuted,
  },
  travelerPhoto: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  travelerPhotoGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  profileOverlay: {
    padding: 20,
    paddingBottom: 24,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: buddiColors.textOnDark,
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 16,
    color: buddiColors.textOnDark,
    textTransform: 'capitalize',
  },
  viewProfileHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
  },
  travelerActionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: buddiColors.surface,
  },
  passButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: buddiColors.dangerText,
    backgroundColor: buddiColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: buddiColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Group Card Styles
  groupImageSection: {
    flex: 6,
    width: '100%',
    backgroundColor: '#9CA3AF',
    position: 'relative',
  },
  groupTagsContainer: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  groupTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: buddiColors.surface,
    borderWidth: 1,
    borderColor: buddiColors.textPrimary,
  },
  groupTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: buddiColors.textPrimary,
  },
  groupTagDifficulty: {
    backgroundColor: '#22C55E', // Light green
    borderColor: '#22C55E',
  },
  groupTagDifficultyText: {
    color: buddiColors.textOnDark,
  },
  groupContentSection: {
    flex: 4,
    padding: 20,
    backgroundColor: buddiColors.surface,
    gap: 12,
  },
  groupTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: buddiColors.textPrimary,
    marginBottom: 4,
  },
  groupInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
  },
  groupInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupInfoText: {
    fontSize: 14,
    color: buddiColors.textPrimary,
  },
  groupDescription: {
    fontSize: 14,
    color: buddiColors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  groupTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  groupContentTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: buddiColors.surface,
    borderWidth: 1,
    borderColor: buddiColors.textPrimary,
  },
  groupContentTagText: {
    fontSize: 12,
    color: buddiColors.textPrimary,
  },
  groupFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  groupDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupDateText: {
    fontSize: 14,
    color: buddiColors.textPrimary,
  },
  groupLikeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: buddiColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: buddiColors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    maxWidth: 320,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: buddiColors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: buddiColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  noMoreContainer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  noMoreTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: buddiColors.textPrimary,
    textAlign: 'center',
  },
  noMoreText: {
    fontSize: 15,
    color: buddiColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  backToStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: buddiColors.primary,
  },
  backToStartButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: buddiColors.textOnDark,
  },
  // Traveler card detail sections (revealed by scrolling)
  cardDetailSections: {
    backgroundColor: buddiColors.surface,
    paddingBottom: 24,
  },
  detailSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  detailSectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: buddiColors.textPrimary,
  },
  detailBioText: {
    fontSize: 15,
    color: buddiColors.textPrimary,
    lineHeight: 22,
  },
  partnersRow: {
    fontSize: 13,
    color: buddiColors.textSecondary,
    lineHeight: 18,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoGridItem: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: buddiColors.surfaceMuted,
  },
  promptsList: {
    gap: 10,
  },
  promptCard: {
    backgroundColor: buddiColors.surfaceMuted,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  promptQuestion: {
    fontSize: 13,
    fontWeight: '600',
    color: buddiColors.textSecondary,
  },
  promptAnswer: {
    fontSize: 15,
    color: buddiColors.textPrimary,
    lineHeight: 22,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestPill: {
    backgroundColor: buddiColors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  interestPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: buddiColors.textPrimary,
  },
  adventuresList: {
    gap: 10,
  },
  adventureItem: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    gap: 12,
    backgroundColor: buddiColors.surfaceMuted,
    borderRadius: 10,
    padding: 10,
  },
  adventurePhoto: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  adventurePhotoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: buddiColors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adventureInfo: {
    flex: 1,
  },
  adventureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: buddiColors.textPrimary,
  },
  adventureDates: {
    fontSize: 12,
    color: buddiColors.textSecondary,
    marginTop: 2,
  },
});

