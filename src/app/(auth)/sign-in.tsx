import { buddiColors } from "@/constants/theme";
import { useAuth } from "@/context/AuthProvider";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function SignIn() {
	const { signIn } = useAuth();
	const [isLoading, setIsLoading] = useState(false);

	const handleSignIn = async () => {
		try {
			setIsLoading(true);
			await signIn();
			router.replace("/(tabs)");
		} catch (error: any) {
			console.error("Sign in failed:", error);
			// Error is already handled in AuthProvider
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.content}>
				<View style={styles.iconContainer}>
					<Feather name="compass" size={64} color={buddiColors.primary} />
				</View>
				<Text style={styles.title}>Welcome to Buddi</Text>
				<Text style={styles.subtitle}>Connect with adventure buddies</Text>

				<TouchableOpacity 
					style={[styles.button, isLoading && styles.buttonDisabled]} 
					onPress={handleSignIn}
					disabled={isLoading}
				>
					<Feather name="log-in" size={20} color="#fff" style={styles.buttonIcon} />
					<Text style={styles.buttonText}>
						{isLoading ? "Signing in..." : "Sign in with Google"}
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: buddiColors.background,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	content: {
		width: "100%",
		maxWidth: 400,
		alignItems: "center",
	},
	iconContainer: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: buddiColors.surface,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 32,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	title: {
		fontSize: 32,
		fontWeight: "bold",
		color: buddiColors.textPrimary,
		marginBottom: 8,
		textAlign: "center",
	},
	subtitle: {
		fontSize: 16,
		color: buddiColors.textSecondary,
		marginBottom: 48,
		textAlign: "center",
	},
	button: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: buddiColors.primary,
		paddingVertical: 16,
		paddingHorizontal: 32,
		borderRadius: 12,
		width: "100%",
		minHeight: 56,
	},
	buttonDisabled: {
		opacity: 0.6,
	},
	buttonIcon: {
		marginRight: 8,
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
});
