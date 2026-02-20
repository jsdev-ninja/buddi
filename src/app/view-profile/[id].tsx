import { buddiColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import type { Profile } from '@/entities/profile';
import { firebaseApi } from '@/services/firebase';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function ViewProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [iLikedThem, setILikedThem] = useState(false);
  const [theyLikedMe, setTheyLikedMe] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isMe = user?.uid === id;

  const fetchData = useCallback(async () => {
    if (!id || !user?.uid || isMe) return;
    try {
      setLoading(true);
      const [profileData, myLikes, likesReceived, mId] = await Promise.all([
        firebaseApi.profiles.getProfile(id),
        firebaseApi.likes.getUserLikes(user.uid),
        firebaseApi.matches.getLikesReceived(user.uid),
        firebaseApi.matches.getMatchId(user.uid, id),
      ]);
      setProfile(profileData ?? null);
      setILikedThem(myLikes.profiles.includes(profileData?.id ?? id));
      setTheyLikedMe(likesReceived.includes(id));
      setMatchId(mId);
    } catch (e) {
      console.error('ViewProfile fetch:', e);
      Alert.alert('Error', 'Could not load profile.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, user?.uid, isMe, router]);

  useEffect(() => {
    if (isMe) {
      router.replace('/(tabs)/profile');
      return;
    }
    fetchData();
  }, [id, isMe, fetchData, router]);

  const handleLike = async () => {
    if (!profile?.id || !user?.uid || actionLoading) return;
    setActionLoading(true);
    try {
      await firebaseApi.likes.likeProfile(profile.id);
      setILikedThem(true);
      const mId = await firebaseApi.matches.getMatchId(user.uid, id!);
      setMatchId(mId);
    } catch (e) {
      Alert.alert('Error', 'Could not like profile.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePass = async () => {
    if (!profile?.id || !user?.uid || actionLoading) return;
    setActionLoading(true);
    try {
      await firebaseApi.likes.dislikeProfile(profile.id);
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Could not pass.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnmatch = () => {
    Alert.alert(
      'Unmatch',
      'Remove this match? You will no longer see each other in matches.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmatch',
          style: 'destructive',
          onPress: async () => {
            if (!id || !user?.uid) return;
            setActionLoading(true);
            try {
              await firebaseApi.matches.unmatch(id);
              Alert.alert('Done', 'Match removed.');
              router.back();
            } catch (e) {
              Alert.alert('Error', 'Could not unmatch.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSendMessage = async () => {
    if (!user?.uid || !id) return;
    setActionLoading(true);
    try {
      const convId = await firebaseApi.chat.createConversation([id], false);
      const nameParam = encodeURIComponent(profile?.name || 'Unknown');
      router.replace(`/chat?id=${convId}&name=${nameParam}`);
    } catch (e) {
      Alert.alert('Error', 'Could not start chat.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Report',
      'Report this profile? (This is a placeholder; reporting will be implemented later.)',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: () => Alert.alert('Thank you', 'Report submitted.') },
      ]
    );
  };

  if (loading || !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={buddiColors.primary} />
      </View>
    );
  }

  const photoUri = profile.photos?.[0] ?? profile.profilePhoto;
  const photoSource = photoUri ? { uri: photoUri } : require('@/assets/images/react-logo.png');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={buddiColors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable onPress={handleReport} style={styles.reportButton}>
          <Feather name="flag" size={20} color={buddiColors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.photoContainer}>
          <Image source={photoSource} style={styles.mainPhoto} resizeMode="cover" />
          {profile.verified && (
            <View style={styles.verifiedBadge}>
              <Feather name="check-circle" size={20} color={buddiColors.primary} />
            </View>
          )}
        </View>

        <Text style={styles.name}>
          {profile.name || 'Unknown'}
          {profile.age && profile.age > 0 ? `, ${profile.age}` : ''}
        </Text>
        {(profile.location || profile.locationFlag) && (
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={16} color={buddiColors.textSecondary} />
            <Text style={styles.locationText}>
              {profile.location || ''}
              {profile.locationFlag ? ` ${profile.locationFlag}` : ''}
            </Text>
          </View>
        )}

        {profile.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bio</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
        ) : null}

        {profile.adventurePlan ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adventure plan</Text>
            <Text style={styles.bodyText}>{profile.adventurePlan}</Text>
          </View>
        ) : null}

        {profile.interests && profile.interests.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.tagsRow}>
              {profile.interests.slice(0, 10).map((interest, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Photos gallery */}
        {profile.photos && profile.photos.length > 1 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
              {profile.photos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.galleryImage} resizeMode="cover" />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        {matchId ? (
          <>
            <Pressable
              style={[styles.primaryButton, actionLoading && styles.buttonDisabled]}
              onPress={handleSendMessage}
              disabled={actionLoading}
            >
              <Feather name="message-circle" size={22} color={buddiColors.textOnDark} />
              <Text style={styles.primaryButtonText}>Send Message</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, actionLoading && styles.buttonDisabled]}
              onPress={handleUnmatch}
              disabled={actionLoading}
            >
              <Feather name="user-x" size={20} color={buddiColors.dangerText} />
              <Text style={styles.unmatchText}>Unmatch</Text>
            </Pressable>
          </>
        ) : theyLikedMe && !iLikedThem ? (
          <Pressable
            style={[styles.primaryButton, actionLoading && styles.buttonDisabled]}
            onPress={handleLike}
            disabled={actionLoading}
          >
            {actionLoading ? <ActivityIndicator size="small" color={buddiColors.textOnDark} /> : (
              <>
                <Feather name="heart" size={22} color={buddiColors.textOnDark} />
                <Text style={styles.primaryButtonText}>Like Back</Text>
              </>
            )}
          </Pressable>
        ) : iLikedThem ? (
          <View style={styles.likedBadge}>
            <Feather name="heart" size={22} color={buddiColors.primary} />
            <Text style={styles.likedText}>Liked</Text>
          </View>
        ) : (
          <>
            <Pressable
              style={[styles.passButton, actionLoading && styles.buttonDisabled]}
              onPress={handlePass}
              disabled={actionLoading}
            >
              <Feather name="x" size={28} color={buddiColors.dangerText} />
            </Pressable>
            <Pressable
              style={[styles.likeButton, actionLoading && styles.buttonDisabled]}
              onPress={handleLike}
              disabled={actionLoading}
            >
              {actionLoading ? <ActivityIndicator size="small" color={buddiColors.textOnDark} /> : (
                <Feather name="heart" size={28} color={buddiColors.textOnDark} />
              )}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: buddiColors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: buddiColors.textPrimary },
  reportButton: { padding: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 120 },
  photoContainer: { position: 'relative', width: '100%', aspectRatio: 3 / 4, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  mainPhoto: { width: '100%', height: '100%' },
  verifiedBadge: { position: 'absolute', top: 12, right: 12 },
  name: { fontSize: 24, fontWeight: 'bold', color: buddiColors.textPrimary, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  locationText: { fontSize: 15, color: buddiColors.textSecondary },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: buddiColors.textPrimary, marginBottom: 8 },
  bio: { fontSize: 15, color: buddiColors.textSecondary, lineHeight: 22 },
  bodyText: { fontSize: 15, color: buddiColors.textSecondary, lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: buddiColors.surfaceBorder, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tagText: { fontSize: 14, color: buddiColors.textPrimary },
  gallery: { marginHorizontal: -20 },
  galleryImage: { width: 120, height: 120, borderRadius: 12, marginRight: 12 },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: buddiColors.surface,
    borderTopWidth: 1,
    borderTopColor: buddiColors.surfaceBorder,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    backgroundColor: buddiColors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: buddiColors.textOnDark },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: buddiColors.dangerText,
  },
  unmatchText: { fontSize: 16, fontWeight: '600', color: buddiColors.dangerText },
  passButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: buddiColors.dangerText,
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
  likedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  likedText: { fontSize: 16, fontWeight: '600', color: buddiColors.primary },
  buttonDisabled: { opacity: 0.7 },
});
