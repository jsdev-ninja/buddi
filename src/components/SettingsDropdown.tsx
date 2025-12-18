import { buddiColors } from "@/constants/theme";
import { useAuth } from "@/context/AuthProvider";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

interface SettingsDropdownProps {
	visible: boolean;
	onClose: () => void;
	anchorPosition?: { x: number; y: number };
}

export function SettingsDropdown({
	visible,
	onClose,
	anchorPosition,
}: SettingsDropdownProps) {
	const { signOut } = useAuth();
	const [isSigningOut, setIsSigningOut] = useState(false);

	const handleLogout = async () => {
		try {
			setIsSigningOut(true);
			await signOut();
			router.replace("/(auth)/sign-in");
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			setIsSigningOut(false);
			onClose();
		}
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<Pressable style={styles.overlay} onPress={onClose}>
				<View
					style={[
						styles.dropdown,
						anchorPosition && {
							position: "absolute",
							top: anchorPosition.y + 40,
							right: anchorPosition.x - 150,
						},
					]}
					onStartShouldSetResponder={() => true}
				>
					<TouchableOpacity
						style={styles.menuItem}
						onPress={handleLogout}
						disabled={isSigningOut}
					>
						<Feather
							name="log-out"
							size={20}
							color={buddiColors.dangerText}
							style={styles.menuIcon}
						/>
						<Text
							style={[
								styles.menuText,
								{ color: buddiColors.dangerText },
							]}
						>
							{isSigningOut ? "Signing out..." : "Logout"}
						</Text>
					</TouchableOpacity>
				</View>
			</Pressable>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.3)",
	},
	dropdown: {
		backgroundColor: buddiColors.surface,
		borderRadius: 12,
		paddingVertical: 8,
		minWidth: 150,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 8,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
		marginTop: 50,
		marginRight: 20,
		alignSelf: "flex-end",
	},
	menuItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
	},
	menuIcon: {
		marginRight: 12,
	},
	menuText: {
		fontSize: 16,
		fontWeight: "500",
		color: buddiColors.textPrimary,
	},
});
