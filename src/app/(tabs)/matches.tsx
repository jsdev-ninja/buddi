import { CouplePill } from '@/components/CouplePill';
import { LogoIcon } from '@/components/LogoIcon';
import { SettingsDropdown } from '@/components/SettingsDropdown';
import { buddiColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import type { Profile } from '@/entities/profile';
import { Card } from '@/lib/components/Card';
import { getDisplayName, isCoupleProfile } from '@/lib/profile';
import { firebaseApi } from '@/services/firebase';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CARD_GAP = 12;
const LIST_PADDING = 20;
const cardWidth = (Dimensions.get('window').width - LIST_PADDING * 2 - CARD_GAP) / 2;

type TabType = 'likesYou' | 'matches';

function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

function ProfileCard({
  profile,
  onPress,
  actionLabel,
  onPass,
  onLike,
}: {
  profile: Profile;
  onPress: () => void;
  actionLabel?: string;
  onPass?: () => void;
  onLike?: () => void;
}) {
  const photoUri = profile.photos?.[0] ?? profile.profilePhoto;
  const source = photoUri ? { uri: photoUri } : require('@/assets/images/react-logo.png');
  const showActions = onPass != null && onLike != null;

  return (
    <View style={styles.cardWrapper}>
      <Pressable onPress={onPress} style={styles.profileCardPressable}>
        <Card style={styles.profileCard}>
          <View style={styles.travelerPhotoSection}>
            <Image source={source} style={styles.travelerPhoto} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.travelerPhotoGradient}
            >
              <View style={styles.profileOverlay}>
                <Text style={styles.profileName} numberOfLines={1} ellipsizeMode="tail">
                  {getDisplayName(profile)}
                  {profile.age && profile.age > 0 ? `, ${profile.age}` : ''}
                </Text>
                {isCoupleProfile(profile) && <CouplePill variant="compact" />}
                {(profile.location || profile.locationFlag) && (
                  <View style={styles.locationRow}>
                    <Feather name="map-pin" size={10} color={buddiColors.textOnDark} />
                    <Text style={styles.locationText}>
                      {profile.location || ''}
                      {profile.locationFlag ? ` ${profile.locationFlag}` : ''}
                    </Text>
                  </View>
                )}
                {actionLabel && !showActions && (
                  <View style={styles.cardActionRow}>
                    <Feather name="message-circle" size={12} color={buddiColors.textOnDark} />
                    <Text style={styles.cardActionText}>{actionLabel}</Text>
                  </View>
                )}
                {showActions && (
                  <View style={styles.cardActionsOverlay}>
                    <Pressable
                      style={styles.passButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        onPass();
                      }}
                      accessibilityLabel="Pass"
                    >
                      <Feather name="x" size={20} color={buddiColors.dangerText} />
                    </Pressable>
                    <Pressable
                      style={styles.likeButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        onLike();
                      }}
                      accessibilityLabel="Like"
                    >
                      <Feather name="heart" size={20} color={buddiColors.textOnDark} />
                    </Pressable>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        </Card>
      </Pressable>
    </View>
  );
}

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('likesYou');
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [likesReceived, setLikesReceived] = useState<string[]>([]);
  const [matches, setMatches] = useState<Array<{ matchId: string; userId: string; createdAt: number }>>([]);
  const [likesProfiles, setLikesProfiles] = useState<Profile[]>([]);
  const [matchProfiles, setMatchProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [likes, userMatches] = await Promise.all([
          firebaseApi.matches.getLikesReceived(user.uid),
          firebaseApi.matches.getUserMatches(user.uid),
        ]);
        setLikesReceived(likes);
        setMatches(userMatches);

        const [fetchedLikesProfiles, fetchedMatchProfiles] = await Promise.all([
          Promise.all(likes.map((uid) => firebaseApi.profiles.getProfile(uid))),
          Promise.all(userMatches.map((m) => firebaseApi.profiles.getProfile(m.userId))),
        ]);
        setLikesProfiles(fetchedLikesProfiles.filter((p): p is Profile => p != null));
        setMatchProfiles(fetchedMatchProfiles.filter((p): p is Profile => p != null));
      } catch (error) {
        console.error('Error fetching matches data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  const hasLikes = likesProfiles.length > 0;
  const hasMatches = matchProfiles.length > 0;

  const openChatWithMatch = async (otherUserId: string, name: string) => {
    if (!user?.uid) return;
    try {
      await firebaseApi.chat.createConversation([otherUserId], false);
      const conversationId = getConversationId(user.uid, otherUserId);
      const nameParam = encodeURIComponent(name);
      router.push(`/chat?id=${conversationId}&name=${nameParam}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', 'Could not start chat. Please try again.');
    }
  };

  const handleLikeBack = async (profileId: string) => {
    if (!user?.uid) return;
    try {
      await firebaseApi.likes.likeProfile(profileId);
      setLikesProfiles((prev) => prev.filter((p) => p.id !== profileId));
      setLikesReceived((prev) => prev.filter((id) => id !== profileId));
    } catch (error) {
      console.error('Error liking back:', error);
      Alert.alert('Error', 'Could not like. Please try again.');
    }
  };

  const handlePassOnLike = async (profileId: string) => {
    if (!user?.uid) return;
    try {
      await firebaseApi.likes.dislikeProfile(profileId);
      setLikesProfiles((prev) => prev.filter((p) => p.id !== profileId));
      setLikesReceived((prev) => prev.filter((id) => id !== profileId));
    } catch (error) {
      console.error('Error passing:', error);
      Alert.alert('Error', 'Could not pass. Please try again.');
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

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'likesYou' && styles.activeTab]}
          onPress={() => setActiveTab('likesYou')}
        >
          <Text style={[styles.tabText, activeTab === 'likesYou' && styles.activeTabText]}>
            Likes You
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'matches' && styles.activeTab]}
          onPress={() => setActiveTab('matches')}
        >
          <Text style={[styles.tabText, activeTab === 'matches' && styles.activeTabText]}>
            Matches
          </Text>
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
        ) : activeTab === 'likesYou' ? (
          hasLikes ? (
            <View style={styles.listContainer}>
              <View style={styles.sectionHeader}>
                <Feather name="heart" size={22} color={buddiColors.primary} />
                <Text style={styles.sectionTitle}>
                  People Who Liked You ({likesProfiles.length})
                </Text>
              </View>
              <View style={styles.cardsList}>
                {likesProfiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onPress={() => {}}
                    onPass={() => handlePassOnLike(profile.id)}
                    onLike={() => handleLikeBack(profile.id)}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="heart" size={80} color={buddiColors.surfaceBorder} />
              </View>
              <Text style={styles.emptyTitle}>
                No new likes yet.
              </Text>
              <Text style={styles.emptySubtitle}>
                People who like you will appear here. Get exploring!
              </Text>
              <Pressable 
                style={styles.discoverButton}
                onPress={() => router.push('/(tabs)/index')}
              >
                <Text style={styles.discoverButtonText}>Discover People</Text>
              </Pressable>
            </View>
          )
        ) : (
          hasMatches ? (
            <View style={styles.listContainer}>
              <View style={styles.sectionHeader}>
                <Feather name="heart" size={22} color={buddiColors.primary} />
                <Text style={styles.sectionTitle}>
                  Your Matches ({matchProfiles.length})
                </Text>
              </View>
              <View style={styles.cardsList}>
                {matchProfiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onPress={() => openChatWithMatch(profile.userId, getDisplayName(profile))}
                    actionLabel="Message"
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="heart" size={80} color={buddiColors.surfaceBorder} />
              </View>
              <Text style={styles.emptyTitle}>
                No matches yet.
              </Text>
              <Text style={styles.emptySubtitle}>
                Start liking people to see your matches here!
              </Text>
              <Pressable 
                style={styles.discoverButton}
                onPress={() => router.push('/(tabs)/index')}
              >
                <Text style={styles.discoverButtonText}>Discover People</Text>
              </Pressable>
            </View>
          )
        )}
      </ScrollView>
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
    backgroundColor: buddiColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: buddiColors.surfaceBorder,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 24,
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
    fontWeight: 'bold',
    color: buddiColors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: buddiColors.textPrimary,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
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
  listContainer: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: buddiColors.textPrimary,
  },
  profileCardPressable: {
    width: '100%',
  },
  cardsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardWrapper: {
    width: cardWidth,
    marginBottom: 4,
  },
  profileCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 0,
  },
  travelerPhotoSection: {
    width: '100%',
    aspectRatio: 3 / 4,
    minHeight: 140,
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
    padding: 10,
    paddingBottom: 12,
  },
  profileName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: buddiColors.textOnDark,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    color: buddiColors.textOnDark,
    textTransform: 'capitalize',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  cardActionText: {
    fontSize: 12,
    color: buddiColors.textOnDark,
    fontWeight: '600',
  },
  cardActionsOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
  },
  passButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: buddiColors.dangerText,
    backgroundColor: buddiColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: buddiColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
