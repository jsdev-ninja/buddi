import { EditProfileModal } from '@/components/EditProfileModal';
import { LogoIcon } from '@/components/LogoIcon';
import { SettingsDropdown } from '@/components/SettingsDropdown';
import { buddiColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import type { Profile, ProfileInput } from '@/entities/profile';
import { Card } from '@/lib/components/Card';
import { firebaseApi } from '@/services/firebase';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const [showInterests, setShowInterests] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile & {
    profilePhoto: any;
    level: string;
    rating: number;
    hasAnswers: boolean;
  }>({
    name: undefined,
    age: undefined,
    location: undefined,
    locationFlag: undefined,
    bio: undefined,
    profilePhoto: require('@/assets/images/react-logo.png'),
    verified: false,
    level: 'beginner',
    rating: 0,
    interests: [],
    hasAnswers: false,
    type: 'profile',
    id: '',
    userId: '',
  });

  // Fetch profile from Firestore on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const firestoreProfile = await firebaseApi.profiles.getProfile(user.uid);
        
        if (firestoreProfile) {
          const mainPhotoUrl = firestoreProfile.photos?.[0] ?? firestoreProfile.profilePhoto;
          setProfile((prev) => ({
            ...prev,
            ...firestoreProfile,
            profilePhoto: mainPhotoUrl
              ? { uri: mainPhotoUrl }
              : require('@/assets/images/react-logo.png'),
            level: prev.level, // Keep UI-only fields
            rating: prev.rating,
            hasAnswers: prev.hasAnswers,
          }));
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user?.uid]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={buddiColors.primary} />
      </View>
    );
  }

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

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.pageTitle}>My Profile</Text>

        {/* Profile Card with Gradient */}
        <Card style={styles.profileCard}>
          <LinearGradient
            colors={[buddiColors.accentGradientStart, buddiColors.accentGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientCard}
          >
            <View style={styles.avatarContainer}>
              <Image source={profile.profilePhoto} style={styles.avatar} />
            </View>
            <Pressable style={styles.editButton} onPress={() => setShowEditModal(true)}>
              <Feather name="edit" size={18} color={buddiColors.primary} />
            </Pressable>
          </LinearGradient>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.name || 'No name'}</Text>
              {profile.age != null && profile.age > 0 ? (
                <Text style={styles.age}>{profile.age}</Text>
              ) : null}
            </View>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={16} color={buddiColors.textSecondary} />
              <Text style={styles.location}>{profile.location || 'No location'}</Text>
              {profile.locationFlag && (
                <Text style={styles.flag}>{profile.locationFlag}</Text>
              )}
            </View>
            <View style={styles.badgesRow}>
              <View style={styles.badges}>
                {profile.verified && (
                  <View style={styles.badgeVerified}>
                    <Feather name="check" size={12} color={buddiColors.successText} />
                    <Text style={styles.badgeTextVerified}>Verified</Text>
                  </View>
                )}
                <View style={styles.badgeLevel}>
                  <Text style={styles.badgeTextLevel}>{profile.level}</Text>
                </View>
              </View>
              <View style={styles.ratingRow}>
                <Feather name="star" size={16} color={buddiColors.star} />
                <Text style={styles.ratingText}>{profile.rating}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* About Me Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.bioText}>{profile.bio || 'No bio yet.'}</Text>
        </Card>

        {/* My Answers Section */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Answers</Text>
            <Pressable>
              <Feather name="edit" size={18} color={buddiColors.textSecondary} />
            </Pressable>
          </View>
          {!profile.hasAnswers && (
            <Text style={styles.emptyText}>
              You haven&apos;t answered any questions yet. Edit your profile to add them!
            </Text>
          )}
        </Card>

        {/* Photos Section */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Feather name="image" size={20} color={buddiColors.primary} />
              <Text style={styles.sectionTitle}>Photos</Text>
            </View>
          </View>
          <View style={styles.photosContainer}>
            {(profile.photos && profile.photos.length > 0)
              ? profile.photos.map((photoUrl, index) => (
                  <Image
                    key={index}
                    source={{ uri: photoUrl }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                ))
              : (
                <View style={styles.photoPlaceholder}>
                  <Feather name="image" size={32} color={buddiColors.surfaceBorder} />
                  <Text style={styles.photoPlaceholderText}>No photos yet</Text>
                </View>
              )}
          </View>
        </Card>

        {/* Interests Section */}
        <Card style={styles.section}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => setShowInterests(!showInterests)}
          >
            <View style={styles.sectionTitleRow}>
              <Feather name="heart" size={20} color={buddiColors.primary} />
              <Text style={styles.sectionTitle}>
                Interests ({profile.interests?.length || 0})
              </Text>
            </View>
            <Feather
              name={showInterests ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={buddiColors.textSecondary}
            />
          </Pressable>
          {showInterests && (
            <View style={styles.interestsContainer}>
              {profile.interests && profile.interests.length > 0 ? (
                profile.interests.map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No interests added yet.</Text>
              )}
            </View>
          )}
        </Card>

        {/* Completed Adventures Section */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Completed Adventures</Text>
            <Pressable>
              <Feather name="plus" size={20} color={buddiColors.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.emptyText}>No completed adventures yet.</Text>
        </Card>

        {/* Edit Adventure Plan Button */}
        <Pressable style={styles.editAdventureButton}>
          <View style={styles.editAdventureIcon}>
            <Feather name="map-pin" size={20} color={buddiColors.textOnDark} />
          </View>
          <Text style={styles.editAdventureText}>Edit Adventure Plan</Text>
        </Pressable>

        {/* Buddi Premium Card - tap to open Premium screen */}
        <Pressable onPress={() => router.push('/premium' as any)}>
          <Card style={styles.premiumCard}>
          <View style={styles.premiumContent}>
            <View style={styles.premiumLeft}>
              <View style={styles.premiumIconContainer}>
                <Feather name="award" size={28} color={buddiColors.textOnDark} />
              </View>
              <View style={styles.premiumTextContainer}>
                <Text style={styles.premiumTitle}>Buddi Premium</Text>
                <Text style={styles.premiumSubtitle}>Unlock exclusive features</Text>
                <View style={styles.premiumFeatures}>
                  <View style={styles.premiumFeature}>
                    <Feather name="heart" size={14} color={buddiColors.textOnDark} />
                    <Text style={styles.premiumFeatureText}>Unlimited Likes</Text>
                  </View>
                  <View style={styles.premiumFeature}>
                    <Feather name="zap" size={14} color={buddiColors.textOnDark} />
                    <Text style={styles.premiumFeatureText}>Profile Boosts</Text>
                  </View>
                  <View style={styles.premiumFeature}>
                    <Feather name="eye" size={14} color={buddiColors.textOnDark} />
                    <Text style={styles.premiumFeatureText}>See Who Liked You</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.premiumRight}>
              <Text style={styles.premiumPrice}>$9.99</Text>
              <Text style={styles.premiumPeriod}>/ month</Text>
            </View>
          </View>
        </Card>
        </Pressable>
      </ScrollView>

      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={async (data: ProfileInput) => {
          if (!user?.uid || !profile.id) {
            console.error('User or profile ID not available');
            return;
          }

          try {
            setIsLoading(true);
            // Update profile in Firestore
            const updatedProfile = await firebaseApi.profiles.update(profile.id, data);
            
            // Update local state with the updated profile
            const mainPhotoUrl = updatedProfile.photos?.[0] ?? updatedProfile.profilePhoto;
            setProfile((prev) => ({
              ...prev,
              ...updatedProfile,
              profilePhoto: mainPhotoUrl
                ? { uri: mainPhotoUrl }
                : require('@/assets/images/react-logo.png'),
              level: prev.level, // Keep UI-only fields
              rating: prev.rating,
              hasAnswers: prev.hasAnswers,
            }));
            
            setShowEditModal(false);
          } catch (error) {
            console.error('Error updating profile:', error);
            // You might want to show an error message to the user here
          } finally {
            setIsLoading(false);
          }
        }}
        initialData={{
          name: profile.name,
          age: profile.age,
          location: profile.location,
          locationFlag: profile.locationFlag,
          bio: profile.bio,
          interests: profile.interests || [],
          photos: profile.photos || [],
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingTop: 16,
    gap: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: buddiColors.textPrimary,
    marginBottom: 8,
  },
  profileCard: {
    padding: 0,
    overflow: 'hidden',
  },
  gradientCard: {
    height: 140,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: buddiColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: buddiColors.surface,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  editButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: buddiColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    padding: 20,
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: buddiColors.textPrimary,
  },
  age: {
    fontSize: 20,
    color: buddiColors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  location: {
    fontSize: 16,
    color: buddiColors.textSecondary,
  },
  flag: {
    fontSize: 18,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badgeVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: buddiColors.successBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeTextVerified: {
    fontSize: 12,
    fontWeight: '600',
    color: buddiColors.successText,
  },
  badgeLevel: {
    backgroundColor: buddiColors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeTextLevel: {
    fontSize: 12,
    fontWeight: '600',
    color: buddiColors.textPrimary,
    textTransform: 'capitalize',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: buddiColors.textPrimary,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: buddiColors.textPrimary,
  },
  bioText: {
    fontSize: 16,
    color: buddiColors.textPrimary,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 14,
    color: buddiColors.textSecondary,
    fontStyle: 'italic',
    flexWrap: 'wrap',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: buddiColors.surfaceMuted,
  },
  photoPlaceholder: {
    width: '100%',
    minHeight: 100,
    borderRadius: 12,
    backgroundColor: buddiColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: buddiColors.textSecondary,
    marginTop: 8,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: buddiColors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  interestText: {
    fontSize: 14,
    color: buddiColors.textPrimary,
    fontWeight: '500',
  },
  editAdventureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: buddiColors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  editAdventureIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAdventureText: {
    fontSize: 16,
    fontWeight: '600',
    color: buddiColors.textOnDark,
  },
  premiumCard: {
    backgroundColor: '#1F1F1F',
    padding: 20,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  premiumLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  premiumIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: buddiColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTextContainer: {
    flex: 1,
    gap: 8,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: buddiColors.textOnDark,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  premiumFeatures: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  premiumFeature: {
    alignItems: 'center',
    gap: 4,
  },
  premiumFeatureText: {
    fontSize: 10,
    color: buddiColors.textOnDark,
    textAlign: 'center',
  },
  premiumRight: {
    alignItems: 'flex-end',
  },
  premiumPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: buddiColors.textOnDark,
  },
  premiumPeriod: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
