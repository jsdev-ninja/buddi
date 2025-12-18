import { SettingsDropdown } from '@/components/SettingsDropdown';
import { SwipeableCard } from '@/components/SwipeableCard';
import { buddiColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import type { Profile } from '@/entities/profile';
import { Card } from '@/lib/components/Card';
import type { TravelerProfile } from '@/lib/data/mockData';
import { firebaseApi } from '@/services/firebase';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

type CombinedCard =
  | { type: 'traveler'; data: TravelerProfile };

export default function DiscoverScreen() {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [profiles, setProfiles] = useState<TravelerProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

  // Fetch profiles from Firestore
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!user?.uid) {
        setProfiles([]);
        setIsLoadingProfiles(false);
        return;
      }

      try {
        setIsLoadingProfiles(true);
        const firestoreProfiles = await firebaseApi.profiles.getDiscoverProfiles(user.uid);

        // Convert Profile to TravelerProfile format
        const convertedProfiles: TravelerProfile[] = firestoreProfiles.map((profile: Profile) => ({
          id: profile.id,
          name: profile.name || 'Unknown',
          age: profile.age || 0,
          location: profile.location || '',
          locationFlag: profile.locationFlag || undefined,
          bio: profile.bio || '',
          profilePhoto: profile.profilePhoto
            ? { uri: profile.profilePhoto }
            : require('@/assets/images/react-logo.png'), // Default photo
          verified: profile.verified || false,
          interests: profile.interests || [],
          adventurePlan: profile.adventurePlan || undefined,
        }));

        setProfiles(convertedProfiles);
      } catch (error) {
        console.error('Error fetching profiles:', error);
        Alert.alert('Error', 'Failed to load profiles. Please try again.');
      } finally {
        setIsLoadingProfiles(false);
      }
    };

    fetchProfiles();
  }, [user?.uid]);

  const cards = useMemo<CombinedCard[]>(() => {
    const travelers = profiles.map((data) => ({ type: 'traveler' as const, data }));
    return travelers;
  }, [profiles]);

  const current = cards[index];

  const handleLike = () => {
    // Handle like action (swipe right)
    console.log('Liked profile:', current?.data.id);
    // TODO: Save like to Firestore
    moveToNextCard();
  };

  const handlePass = () => {
    // Handle pass action (swipe left)
    console.log('Passed profile:', current?.data.id);
    // TODO: Save pass/dislike to Firestore
    moveToNextCard();
  };

  const moveToNextCard = () => {
    if (index < cards.length - 1) {
      setIndex((prev) => prev + 1);
    } else {
      // No more cards, show empty state or loop back
      setIndex(0);
    }
  };

  const handleUndo = () => {
    if (index > 0) {
      setIndex((prev) => prev - 1);
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
        <View style={styles.headerButtons}>
          <Pressable onPress={handleUndo} style={styles.iconButton}>
            <Feather name="rotate-ccw" size={20} color={buddiColors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => {}} style={[styles.iconButton, styles.filterButton]}>
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

      {/* Main Card */}
      <View style={styles.cardContainer}>
        {isLoadingProfiles ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading profiles...</Text>
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No profiles to discover</Text>
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
              <ImageBackground
                source={current.data.profilePhoto}
                resizeMode="cover"
                style={styles.cardImage}
              >
                <View style={styles.imageOverlay}>
                  {/* Profile Info Overlay */}
                  <View style={styles.profileOverlay}>
                    <Text style={styles.profileName}>
                      {current.data.name}{current.data.age > 0 ? `, ${current.data.age}` : ''}
                    </Text>
                    {current.data.location && (
                      <View style={styles.locationRow}>
                        <Feather name="map-pin" size={14} color={buddiColors.textOnDark} />
                        <Text style={styles.locationText}>{current.data.location}</Text>
                        {current.data.locationFlag && (
                          <Text style={styles.flag}>{current.data.locationFlag}</Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </ImageBackground>

              {/* Content Section */}
              <View style={styles.contentSection}>
                {current.data.bio && (
                  <Text style={styles.bioText}>{current.data.bio}</Text>
                )}
                {current.data.adventurePlan && (
                  <View style={styles.adventurePlanSection}>
                    <Feather name="clipboard" size={18} color={buddiColors.primary} />
                    <Text style={styles.adventurePlanText}>{current.data.adventurePlan}</Text>
                  </View>
                )}
              </View>
            </Card>
          </SwipeableCard>
        ) : null}
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
    padding: 20,
    paddingTop: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    padding: 0,
  },
  cardImage: {
    width: '100%',
    height: 500,
    justifyContent: 'flex-end',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  profileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: buddiColors.textOnDark,
    marginBottom: 8,
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
  flag: {
    fontSize: 18,
  },
  contentSection: {
    padding: 20,
    backgroundColor: buddiColors.surface,
    gap: 16,
  },
  bioText: {
    fontSize: 16,
    color: buddiColors.textPrimary,
    lineHeight: 24,
  },
  adventurePlanSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: buddiColors.surfaceBorder,
  },
  adventurePlanText: {
    fontSize: 16,
    fontWeight: '500',
    color: buddiColors.textPrimary,
  },
  groupName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: buddiColors.textPrimary,
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 16,
    color: buddiColors.textSecondary,
    lineHeight: 24,
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
  },
  emptyText: {
    fontSize: 16,
    color: buddiColors.textSecondary,
  },
});

