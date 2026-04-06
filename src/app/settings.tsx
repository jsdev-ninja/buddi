import { buddiColors } from "@/constants/theme";
import { useAuth } from "@/context/AuthProvider";
import { firebaseApi } from "@/services/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SETTINGS_KEY = "@buddi/settings";

type SettingsPrefs = {
	pushNotifications: boolean;
	locationSharing: boolean;
	privateProfile: boolean;
	language: string;
};

const LANGUAGES = ["English", "Hebrew", "Spanish", "French", "German"];

const defaultPrefs: SettingsPrefs = {
	pushNotifications: true,
	locationSharing: true,
	privateProfile: false,
	language: "English",
};

export default function SettingsScreen() {
	const insets = useSafeAreaInsets();
	const { user, signOut } = useAuth();
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [prefs, setPrefs] = useState<SettingsPrefs>(defaultPrefs);
	const [languageModalOpen, setLanguageModalOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [signingOut, setSigningOut] = useState(false);

	const loadAccount = useCallback(async () => {
		if (!user?.uid) return;
		try {
			const profile = await firebaseApi.profiles.getProfile(user.uid);
			setFullName(profile?.name ?? user.displayName ?? "");
			setEmail(user.email ?? "");
		} catch (e) {
			console.error("Load account:", e);
		}
	}, [user]);

	const loadPrefs = useCallback(async () => {
		try {
			const raw = await AsyncStorage.getItem(SETTINGS_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as Partial<SettingsPrefs>;
				setPrefs((p) => ({ ...p, ...parsed }));
			}
		} catch (e) {
			console.error("Load prefs:", e);
		}
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			await Promise.all([loadAccount(), loadPrefs()]);
			if (!cancelled) setLoading(false);
		})();
		return () => { cancelled = true; };
	}, [loadAccount, loadPrefs]);

	const savePrefs = async () => {
		setSaving(true);
		try {
			await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(prefs));
			Alert.alert("Saved", "Settings saved successfully.");
		} catch (e) {
			console.error("Save prefs:", e);
			Alert.alert("Error", "Failed to save settings.");
		} finally {
			setSaving(false);
		}
	};

	const handleLogout = async () => {
		try {
			setSigningOut(true);
			await signOut();
			router.replace("/(auth)/sign-in");
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			setSigningOut(false);
		}
	};

	if (loading) {
		return (
			<View style={[styles.container, styles.centered]}>
				<ActivityIndicator size="large" color={buddiColors.primary} />
			</View>
		);
	}

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			{/* Header */}
			<View style={styles.header}>
				<Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
					<Feather name="arrow-left" size={24} color={buddiColors.textPrimary} />
				</Pressable>
				<Text style={styles.title}>Settings</Text>
				<View style={styles.headerSpacer} />
			</View>
			<Text style={styles.subtitle}>Manage your Buddia preferences</Text>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Account */}
				<View style={styles.card}>
					<View style={styles.cardHeader}>
						<Feather name="user" size={20} color={buddiColors.primary} />
						<Text style={styles.cardTitle}>Account</Text>
					</View>
					<View style={styles.field}>
						<Text style={styles.fieldLabel}>Email</Text>
						<Text style={styles.fieldValue}>{email || "—"}</Text>
					</View>
					<View style={styles.field}>
						<Text style={styles.fieldLabel}>Full Name</Text>
						<Text style={styles.fieldValue}>{fullName || "—"}</Text>
					</View>
				</View>

				{/* Preferences */}
				<View style={styles.card}>
					<View style={styles.cardHeader}>
						<Feather name="settings" size={20} color={buddiColors.primary} />
						<Text style={styles.cardTitle}>Preferences</Text>
					</View>
					<View style={styles.toggleRow}>
						<View style={styles.toggleLabelBlock}>
							<Text style={styles.toggleLabel}>Push Notifications</Text>
							<Text style={styles.toggleDesc}>Get notified about matches and messages</Text>
						</View>
						<Switch
							value={prefs.pushNotifications}
							onValueChange={(v) => setPrefs((p) => ({ ...p, pushNotifications: v }))}
							trackColor={{ false: buddiColors.surfaceBorder, true: buddiColors.primaryLight }}
							thumbColor={prefs.pushNotifications ? buddiColors.primary : buddiColors.surface}
						/>
					</View>
					<View style={styles.toggleRow}>
						<View style={styles.toggleLabelBlock}>
							<Text style={styles.toggleLabel}>Location Sharing</Text>
							<Text style={styles.toggleDesc}>Share your location during treks</Text>
						</View>
						<Switch
							value={prefs.locationSharing}
							onValueChange={(v) => setPrefs((p) => ({ ...p, locationSharing: v }))}
							trackColor={{ false: buddiColors.surfaceBorder, true: buddiColors.primaryLight }}
							thumbColor={prefs.locationSharing ? buddiColors.primary : buddiColors.surface}
						/>
					</View>
					<View style={styles.toggleRow}>
						<View style={styles.toggleLabelBlock}>
							<Text style={styles.toggleLabel}>Private Profile</Text>
							<Text style={styles.toggleDesc}>Only show profile to matches</Text>
						</View>
						<Switch
							value={prefs.privateProfile}
							onValueChange={(v) => setPrefs((p) => ({ ...p, privateProfile: v }))}
							trackColor={{ false: buddiColors.surfaceBorder, true: buddiColors.primaryLight }}
							thumbColor={prefs.privateProfile ? buddiColors.primary : buddiColors.surface}
						/>
					</View>
					<Pressable
						style={styles.selectRow}
						onPress={() => setLanguageModalOpen(true)}
					>
						<View>
							<Text style={styles.toggleLabel}>Language</Text>
							<Text style={styles.selectValue}>{prefs.language}</Text>
						</View>
						<Feather name="chevron-down" size={20} color={buddiColors.textTertiary} />
					</Pressable>
				</View>

				{/* Save Settings */}
				<TouchableOpacity
					style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
					onPress={savePrefs}
					disabled={saving}
				>
					<Text style={styles.primaryButtonText}>
						{saving ? "Saving…" : "Save Settings"}
					</Text>
				</TouchableOpacity>

				{/* Logout */}
				<TouchableOpacity
					style={styles.logoutButton}
					onPress={handleLogout}
					disabled={signingOut}
				>
					<Feather name="log-out" size={20} color={buddiColors.primary} style={styles.buttonIcon} />
					<Text style={styles.logoutButtonText}>
						{signingOut ? "Signing out…" : "Logout"}
					</Text>
				</TouchableOpacity>
			</ScrollView>

			{/* Language modal */}
			{languageModalOpen && (
				<Pressable
					style={styles.modalOverlay}
					onPress={() => setLanguageModalOpen(false)}
				>
					<View style={styles.modalContent} onStartShouldSetResponder={() => true}>
						<Text style={styles.modalTitle}>Language</Text>
						{LANGUAGES.map((lang) => (
							<TouchableOpacity
								key={lang}
								style={styles.modalOption}
								onPress={() => {
									setPrefs((p) => ({ ...p, language: lang }));
									setLanguageModalOpen(false);
								}}
							>
								<Text style={styles.modalOptionText}>{lang}</Text>
								{prefs.language === lang && (
									<Feather name="check" size={20} color={buddiColors.primary} />
								)}
							</TouchableOpacity>
						))}
					</View>
				</Pressable>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: buddiColors.background,
	},
	centered: {
		justifyContent: "center",
		alignItems: "center",
	},
	header: {
		flexDirection: "row",
		direction: "ltr",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	backButton: {
		padding: 4,
	},
	title: {
		flex: 1,
		fontSize: 20,
		fontWeight: "bold",
		color: buddiColors.textPrimary,
		textAlign: "center",
	},
	headerSpacer: {
		width: 32,
	},
	subtitle: {
		fontSize: 14,
		color: buddiColors.textSecondary,
		textAlign: "center",
		marginBottom: 24,
		paddingHorizontal: 16,
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 20,
		paddingBottom: 40,
	},
	card: {
		backgroundColor: buddiColors.surface,
		borderRadius: 16,
		padding: 20,
		marginBottom: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginBottom: 16,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: buddiColors.textPrimary,
	},
	field: {
		marginBottom: 14,
	},
	fieldLabel: {
		fontSize: 12,
		color: buddiColors.textSecondary,
		marginBottom: 4,
	},
	fieldValue: {
		fontSize: 16,
		color: buddiColors.textPrimary,
	},
	toggleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: buddiColors.surfaceBorder,
	},
	toggleLabelBlock: {
		flex: 1,
		marginRight: 12,
	},
	toggleLabel: {
		fontSize: 16,
		fontWeight: "500",
		color: buddiColors.textPrimary,
	},
	toggleDesc: {
		fontSize: 13,
		color: buddiColors.textSecondary,
		marginTop: 2,
	},
	selectRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
	},
	selectValue: {
		fontSize: 15,
		color: buddiColors.textSecondary,
		marginTop: 2,
	},
	primaryButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: buddiColors.primary,
		paddingVertical: 16,
		borderRadius: 12,
		marginBottom: 12,
	},
	primaryButtonDisabled: {
		opacity: 0.7,
	},
	primaryButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#fff",
	},
	logoutButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: buddiColors.surface,
		paddingVertical: 16,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: buddiColors.primary,
	},
	logoutButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: buddiColors.primary,
	},
	buttonIcon: {
		marginRight: 8,
	},
	modalOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	modalContent: {
		backgroundColor: buddiColors.surface,
		borderRadius: 16,
		padding: 16,
		width: "100%",
		maxWidth: 320,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: buddiColors.textPrimary,
		marginBottom: 12,
		textAlign: "center",
	},
	modalOption: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 10,
	},
	modalOptionText: {
		fontSize: 16,
		color: buddiColors.textPrimary,
	},
});
