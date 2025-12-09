import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { buddiColors } from '@/constants/theme';
import { Card } from '@/lib/components/Card';
import { travelerCards } from '@/lib/data/mockData';

export default function ProfileScreen() {
  const router = useRouter();
  const [showInterests, setShowInterests] = useState(true);
  const profile = {
    name: 'Philip',
    age: 32,
    location: 'Ff',
    locationFlag: '🇬🇧',
    bio: 'Ggg',
    profilePhoto: require('@/assets/images/react-logo.png'),
    verified: true,
    level: 'beginner',
    rating: 0,
    interests: ['Teaching', 'Cultural Tours', 'Nightlife'],
    hasAnswers: false,
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
        <Pressable onPress={() => {}}>
          <Feather name="settings" size={24} color={buddiColors.textPrimary} />
        </Pressable>
      </View>

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
            <Pressable style={styles.editButton}>
              <Feather name="edit" size={18} color={buddiColors.primary} />
            </Pressable>
          </LinearGradient>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.age}>{profile.age}</Text>
            </View>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={16} color={buddiColors.textSecondary} />
              <Text style={styles.location}>{profile.location}</Text>
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
          <Text style={styles.bioText}>{profile.bio}</Text>
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
              You haven't answered any questions yet. Edit your profile to add them!
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
            <Image source={profile.profilePhoto} style={styles.photo} />
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
                Interests ({profile.interests.length})
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
              {profile.interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
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

        {/* Buddi Premium Card */}
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
    gap: 12,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 12,
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
