import { buddiColors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { makeRedirectUri, useAuthRequest } from "expo-auth-session";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Endpoint

export default function SignIn() {
	const [request, response, promptAsync] = useAuthRequest(
		{
			clientId: "64676977478-1lq4fnf0khpmhls1qcodbotrpa26md8m.apps.googleusercontent.com",
			scopes: ["email"],
			redirectUri: makeRedirectUri({
				scheme: "your.app",
			}),
			// redirectUri: "https://auth.expo.io/philbro/buddia",
		},
		{
			authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
		}
	);

	console.log("request", request);
	console.log("response", response);
	console.log("promptAsync", promptAsync);

	const handleSignIn = async () => {
		try {
			const result = await promptAsync();
			console.log("result", result);
			if (result.type === "success") {
				router.replace("/(tabs)");
			}
		} catch (error) {
			console.error("Sign in failed:", error);
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

				<TouchableOpacity style={styles.button} onPress={handleSignIn}>
					<Feather name="log-in" size={20} color="#fff" style={styles.buttonIcon} />
					<Text style={styles.buttonText}>Sign in with Google</Text>
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
