import { HapticTab } from '@/components/haptic-tab';
import { Colors, buddiColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthProvider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotificationBadges } from '@/hooks/useNotificationBadges';
import { Feather } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { firebaseApi } from '@/services/firebase';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const [profileChecked, setProfileChecked] = useState(false);
  const { messagesBadge, matchesBadge } = useNotificationBadges();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    firebaseApi.profiles.getProfile(user.uid).then((profile) => {
      if (cancelled) return;
      setProfileChecked(true);
      if (!profile) {
        router.replace('/onboarding');
      }
    });
    return () => { cancelled = true; };
  }, [user]);

  if (user && !profileChecked) {
    return null; // or a small loading state while checking profile
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: buddiColors.textSecondary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 60,
          paddingBottom: Platform.OS === 'ios' ? 2 : 4,
          paddingTop: 8,
          backgroundColor: buddiColors.surface,
          borderTopWidth: 1,
          borderTopColor: buddiColors.surfaceBorder,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="adventures"
        options={{
          title: 'Adventures',
          tabBarIcon: ({ color }) => <Feather name="map-pin" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarLabel: () => null,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTabIcon : undefined}>
              <Feather 
                name="compass" 
                size={24} 
                color={focused ? buddiColors.textOnDark : color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <Feather name="message-circle" size={24} color={color} />,
          tabBarBadge: messagesBadge > 0 ? messagesBadge : undefined,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color }) => <Feather name="heart" size={24} color={color} />,
          tabBarBadge: matchesBadge > 0 ? matchesBadge : undefined,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeTabIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: buddiColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
