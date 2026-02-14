import { firebaseApi } from "@/services/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { useAuth } from "./AuthProvider";

const SETTINGS_KEY = "@buddi/settings";

// Show notifications when app is in foreground (banner + sound)
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
		shouldShowBanner: true,
		shouldShowList: true,
		shouldAnnotatePresentedNotification: true,
		sticky: false,
	}),
});

const DEFAULT_CHANNEL_ID = "buddi-default";

/**
 * Create Android notification channel so notifications are visible (required on Android 8+).
 */
async function setupAndroidChannel() {
	if (Platform.OS !== "android") return;
	try {
		await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
			name: "Buddi",
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: "#F97316",
			sound: "default",
		});
	} catch (e) {
		console.warn("Notification channel setup failed:", e);
	}
}

/**
 * Get EAS project ID for Expo push token (works in dev and production).
 */
function getExpoProjectId(): string | null {
	const extra = Constants.expoConfig?.extra ?? (Constants.manifest as { extra?: { eas?: { projectId?: string } } })?.extra;
	const eas = (extra as { eas?: { projectId?: string } })?.eas;
	return eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

/**
 * Register for push notifications and save token. Call when user is authenticated.
 */
export async function registerForPushNotifications(userId: string): Promise<void> {
	if (!Device.isDevice) {
		console.log("[Notifications] Skipping push registration: not a physical device");
		return;
	}

	await setupAndroidChannel();

	const { status: existingStatus } = await Notifications.getPermissionsAsync();
	let finalStatus = existingStatus;

	if (existingStatus !== "granted") {
		const { status } = await Notifications.requestPermissionsAsync();
		finalStatus = status;
		if (finalStatus !== "granted") {
			console.warn("[Notifications] Permission denied - enable in device Settings to receive notifications");
			return;
		}
	}

	const projectId = getExpoProjectId();
	if (!projectId) {
		console.warn("[Notifications] No EAS projectId found - push token not registered. Set extra.eas.projectId in app.json.");
		return;
	}

	try {
		const tokenData = await Notifications.getExpoPushTokenAsync({
			projectId,
		});
		const token = tokenData.data;
		if (token) {
			await firebaseApi.pushTokens.saveToken(token);
		}
	} catch (e) {
		console.error("[Notifications] Failed to get or save push token:", e);
	}
}

/**
 * Set up notification response listener (tap on notification -> deep link).
 * Mounted at root so it works when app is opened from killed state by tapping a notification.
 */
function useNotificationResponseListener() {
	useEffect(() => {
		const sub = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
			const data = response.notification.request.content.data as {
				type?: string;
				conversationId?: string;
				matchId?: string;
				profileId?: string;
				groupId?: string;
			};

			const type = data?.type;
			if (!type) return;

			switch (type) {
				case "new_message":
					if (data.conversationId) {
						router.push(`/(tabs)/chat?id=${data.conversationId}` as any);
					} else {
						router.push("/(tabs)/messages" as any);
					}
					break;
				case "match":
					router.push("/(tabs)/matches" as any);
					break;
				case "profile_like":
				case "group_like":
					router.push("/(tabs)/index" as any);
					break;
				case "group_match":
					router.push("/(tabs)/matches" as any);
					break;
				default:
					router.push("/(tabs)/index" as any);
			}
		});

		return () => sub.remove();
	}, []);
}

/**
 * Call from root layout: registers push token when user is present and sets up tap listener.
 * Respects Settings "Push Notifications" toggle (stored in AsyncStorage).
 */
export function NotificationSetup() {
	const { user } = useAuth();
	const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);

	useNotificationResponseListener();

	const readPushPreference = useCallback(() => {
		AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
			if (raw) {
				try {
					const prefs = JSON.parse(raw) as { pushNotifications?: boolean };
					setPushEnabled(prefs.pushNotifications !== false);
				} catch {
					setPushEnabled(true);
				}
			} else {
				setPushEnabled(true);
			}
		});
	}, []);

	useEffect(() => {
		readPushPreference();
		const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
			if (state === "active") readPushPreference();
		});
		return () => sub.remove();
	}, [readPushPreference]);

	useEffect(() => {
		if (!user?.uid || pushEnabled === null) return;
		if (pushEnabled) {
			registerForPushNotifications(user.uid);
		} else {
			// User turned off push in Settings - remove token so they don't receive
			firebaseApi.pushTokens.removeToken?.().catch(() => {});
		}
	}, [user?.uid, pushEnabled]);

	return null;
}
