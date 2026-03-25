import { LogoIcon } from "@/components/LogoIcon";
import { buddiColors } from "@/constants/theme";
import { useAuth } from "@/context/AuthProvider";
import { firebaseApi } from "@/services/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
	ImageBackground,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

export default function SignIn() {
	const { signIn } = useAuth();
	const [isLoading, setIsLoading] = useState(false);

	const handleSignIn = async () => {
		try {
			setIsLoading(true);
			const { user: firebaseUser } = await signIn();
			if (firebaseUser) {
				const profile = await firebaseApi.profiles.getProfile(firebaseUser.uid);
				if (!profile) {
					router.replace("/onboarding");
					return;
				}
			}
			router.replace("/(tabs)");
		} catch (error: any) {
			console.error("Sign in failed:", error);
			// Error is already handled in AuthProvider
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<ImageBackground
			source={require("@/assets/background-auth.png")}
			style={styles.container}
			resizeMode="cover"
		>
			<LinearGradient
				colors={["rgba(194, 200, 207, 0.92)", "rgba(242, 242, 242, 0.12)", "rgba(0, 0, 0, 0.2)"]}
				locations={[0, 0.45, 1]}
				style={styles.overlay}
			>
				<View style={styles.topSection}>
					<View style={styles.brandRow}>
						<LogoIcon size={40} />
						<Text style={styles.brandText}>Buddia</Text>
					</View>
				</View>

				<View style={styles.middleSection}>
					<Text style={styles.title}>Explore more -</Text>
					<Text style={styles.title}>together.</Text>
				</View>

				<View style={styles.bottomSection}>
					<TouchableOpacity
						style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
						onPress={handleSignIn}
						disabled={isLoading}
					>
						<Text style={styles.primaryButtonText}>
							{isLoading ? "Signing in..." : "Continue with Google"}
						</Text>
					</TouchableOpacity>

					<Text style={styles.helperText}>Already have an account?</Text>

					<TouchableOpacity
						style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
						onPress={handleSignIn}
						disabled={isLoading}
					>
						<Text style={styles.secondaryButtonText}>Log In</Text>
					</TouchableOpacity>
				</View>
			</LinearGradient>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	overlay: {
		flex: 1,
		paddingHorizontal: 24,
		paddingTop: 36,
		paddingBottom: 32,
	},
	topSection: {
		width: "100%",
	},
	middleSection: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	bottomSection: {
		width: "100%",
		alignItems: "center",
	},
	brandRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	brandText: {
		fontSize: 42 / 2,
		fontWeight: "700",
		color: buddiColors.primary,
		marginLeft: 10,
	},
	title: {
		fontSize: 50 / 2,
		lineHeight: 58 / 2,
		fontWeight: "800",
		color: "#f4f4f4",
		textShadowColor: "rgba(0,0,0,0.25)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 4,
		textAlign: "center",
	},
	primaryButton: {
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: buddiColors.primary,
		borderRadius: 16,
		width: "100%",
		minHeight: 54,
		marginBottom: 34,
	},
	primaryButtonText: {
		color: "#fff",
		fontSize: 17,
		fontWeight: "700",
	},
	helperText: {
		fontSize: 28 / 2,
		fontWeight: "500",
		color: "rgba(255,255,255,0.88)",
		textAlign: "center",
		marginBottom: 10,
	},
	secondaryButton: {
		width: "100%",
		minHeight: 62,
		borderRadius: 16,
		backgroundColor: "rgba(255, 255, 255, 0.86)",
		alignItems: "center",
		justifyContent: "center",
	},
	secondaryButtonText: {
		fontSize: 34 / 2,
		fontWeight: "600",
		color: "#111",
	},
	buttonDisabled: {
		opacity: 0.6,
	},
});
