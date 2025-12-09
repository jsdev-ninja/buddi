import { buddiColors } from '@/constants/theme';
import { Card } from '@/lib/components/Card';
import { groups, travelerCards } from '@/lib/data/mockData';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type CombinedCard =
  | { type: 'traveler'; data: typeof travelerCards[number] }
  | { type: 'group'; data: typeof groups[number] };

export default function DiscoverScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  const cards = useMemo<CombinedCard[]>(() => {
    const travelers = travelerCards.map((data) => ({ type: 'traveler' as const, data }));
    const adventureCards = groups.map((data) => ({ type: 'group' as const, data }));
    return [...travelers, ...adventureCards];
  }, []);

  const current = cards[index];

  const handlePass = () => {
    if (index < cards.length - 1) {
      setIndex((prev) => prev + 1);
    } else {
      setIndex(0); // Loop back to start
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
        </View>
      </View>

      {/* Main Card */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {current && (
          <Card style={styles.mainCard}>
            <ImageBackground
              source={current.type === 'traveler' ? current.data.profilePhoto : current.data.coverPhoto}
              resizeMode="cover"
              style={styles.cardImage}
            >
              <View style={styles.imageOverlay}>
                {/* Profile Info Overlay */}
                {current.type === 'traveler' && (
                  <View style={styles.profileOverlay}>
                    <Text style={styles.profileName}>
                      {current.data.name}, {current.data.age}
                    </Text>
                    <View style={styles.locationRow}>
                      <Feather name="map-pin" size={14} color={buddiColors.textOnDark} />
                      <Text style={styles.locationText}>{current.data.location}</Text>
                      {current.data.locationFlag && (
                        <Text style={styles.flag}>{current.data.locationFlag}</Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </ImageBackground>

            {/* Content Section */}
            <View style={styles.contentSection}>
              {current.type === 'traveler' && (
                <>
                  <Text style={styles.bioText}>{current.data.bio}</Text>
                  {current.data.adventurePlan && (
                    <View style={styles.adventurePlanSection}>
                      <Feather name="clipboard" size={18} color={buddiColors.primary} />
                      <Text style={styles.adventurePlanText}>{current.data.adventurePlan}</Text>
                    </View>
                  )}
                </>
              )}
              {current.type === 'group' && (
                <>
                  <Text style={styles.groupName}>{current.data.name}</Text>
                  <Text style={styles.groupDescription}>{current.data.description}</Text>
                </>
              )}
            </View>
          </Card>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
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
});

