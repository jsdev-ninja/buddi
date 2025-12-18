import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { SplashScreenController } from "@/components/SplashScreenController";
import { AuthProvider, useAuth } from "@/context/AuthProvider";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
	anchor: "(tabs)",
};

function RootNavigator() {
	const colorScheme = useColorScheme();
	const { user } = useAuth();

	console.log("user", user);

	return (
		<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
			<Stack>
				<Stack.Protected guard={!!user}>
					<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				</Stack.Protected>

				<Stack.Protected guard={!user}>
					<Stack.Screen
						name="(auth)/sign-in"
						options={{
							headerShown: false,
							gestureEnabled: false,
						}}
					/>
				</Stack.Protected>
			</Stack>
			<StatusBar style="auto" />
		</ThemeProvider>
	);
}

export default function RootLayout() {
	return (
		<AuthProvider>
			<SplashScreenController />
			<RootNavigator />
		</AuthProvider>
	);
}
