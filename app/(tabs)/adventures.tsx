import { buddiColors } from '@/constants/theme';
import { Card } from '@/lib/components/Card';
import { trendingAdventures } from '@/lib/data/mockData';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type TabType = 'adventure' | 'myGroups' | 'completed';

export default function AdventuresScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('adventure');

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
              onPress={() => {}}
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

        {/* Trending Adventures Section */}
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
});
