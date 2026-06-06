import { buddiColors } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FEATURES = [
  { icon: 'heart' as const, title: 'Unlimited Likes', desc: 'Like as many profiles as you want.' },
  { icon: 'zap' as const, title: 'Profile Boosts', desc: 'Get more visibility on Discover.' },
  { icon: 'eye' as const, title: 'See Who Liked You', desc: 'Find out who liked your profile.' },
  { icon: 'message-circle' as const, title: 'Priority Support', desc: 'Get help when you need it.' },
];

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isPremium = false; // TODO: wire to UserPremium / subscription

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={buddiColors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Buddia Premium</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.crownIcon}>
            <Feather name="award" size={48} color={buddiColors.primary} />
          </View>
          <Text style={styles.heroTitle}>Unlock more with Premium</Text>
          <Text style={styles.heroSubtitle}>
            Get unlimited likes, see who liked you, and stand out on Discover.
          </Text>
        </View>

        {isPremium ? (
          <View style={styles.premiumActiveCard}>
            <Feather name="check-circle" size={32} color={buddiColors.primary} />
            <Text style={styles.premiumActiveTitle}>{"You're Premium!"}</Text>
            <Text style={styles.premiumActiveSubtitle}>Thanks for supporting Buddia.</Text>
          </View>
        ) : (
          <>
            <View style={styles.comparisonCard}>
              <Text style={styles.comparisonTitle}>Free vs Premium</Text>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Likes per day</Text>
                <Text style={styles.comparisonFree}>Limited</Text>
                <Text style={styles.comparisonPremium}>Unlimited</Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>See who liked you</Text>
                <Text style={styles.comparisonFree}>—</Text>
                <Text style={styles.comparisonPremium}>✓</Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Profile boosts</Text>
                <Text style={styles.comparisonFree}>—</Text>
                <Text style={styles.comparisonPremium}>✓</Text>
              </View>
            </View>

            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Feather name={f.icon} size={22} color={buddiColors.primary} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}

            <View style={styles.priceCard}>
              <Text style={styles.priceAmount}>$9.99</Text>
              <Text style={styles.pricePeriod}>/ month</Text>
              <Pressable
                style={styles.upgradeButton}
                onPress={() => Alert.alert('Coming soon', 'Premium upgrade will be available soon.')}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: buddiColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: buddiColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: buddiColors.surfaceBorder,
  },
  backButton: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: buddiColors.textPrimary, textAlign: 'center' },
  headerSpacer: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 28 },
  crownIcon: { marginBottom: 16 },
  heroTitle: { fontSize: 24, fontWeight: 'bold', color: buddiColors.textPrimary, marginBottom: 8, textAlign: 'center' },
  heroSubtitle: { fontSize: 15, color: buddiColors.textSecondary, textAlign: 'center', paddingHorizontal: 16 },
  premiumActiveCard: {
    backgroundColor: buddiColors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  premiumActiveTitle: { fontSize: 20, fontWeight: '600', color: buddiColors.textPrimary, marginTop: 12 },
  premiumActiveSubtitle: { fontSize: 14, color: buddiColors.textSecondary, marginTop: 4 },
  comparisonCard: {
    backgroundColor: buddiColors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  comparisonTitle: { fontSize: 18, fontWeight: '600', color: buddiColors.textPrimary, marginBottom: 16 },
  comparisonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: buddiColors.surfaceBorder },
  comparisonLabel: { flex: 1, fontSize: 15, color: buddiColors.textPrimary },
  comparisonFree: { width: 80, fontSize: 14, color: buddiColors.textSecondary, textAlign: 'center' },
  comparisonPremium: { width: 80, fontSize: 14, fontWeight: '600', color: buddiColors.primary, textAlign: 'center' },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  featureIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: buddiColors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '600', color: buddiColors.textPrimary },
  featureDesc: { fontSize: 14, color: buddiColors.textSecondary, marginTop: 2 },
  priceCard: {
    marginTop: 24,
    backgroundColor: buddiColors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  priceAmount: { fontSize: 36, fontWeight: 'bold', color: buddiColors.textPrimary },
  pricePeriod: { fontSize: 16, color: buddiColors.textSecondary, marginTop: 4 },
  upgradeButton: {
    marginTop: 20,
    backgroundColor: buddiColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  upgradeButtonText: { fontSize: 16, fontWeight: '600', color: buddiColors.textOnDark },
});
