import { authLoadingAtom, storage, userAtom } from "@/lib/atoms/user";
import { firebaseApi } from "@/services/firebase";
import { Provider, useAtom, useSetAtom } from "jotai";
import { useEffect } from "react";

// Hook to use authentication
export function useAuth() {
	const [user] = useAtom(userAtom);
	const [isLoading] = useAtom(authLoadingAtom);
	const setUserAtom = useSetAtom(userAtom);
	const setLoadingAtom = useSetAtom(authLoadingAtom);

	const signIn = async () => {
		try {
			setLoadingAtom(true);
			// Use real Firebase Google sign-in
			const { user: firebaseUser, isNewUser } = await firebaseApi.auth.loginWithGoogle();
			console.log("isNewUser", isNewUser);
			if (firebaseUser) {
				setUserAtom(firebaseUser);
				// Persist to storage
				await storage.setItem("user", JSON.stringify(firebaseUser));

				// Create empty profile if user doesn't have one
				try {
					const existingProfile = await firebaseApi.profiles.getProfile(firebaseUser.uid);
					if (!existingProfile) {
						console.log("Creating empty profile for new user");
						await firebaseApi.profiles.create();
					}
				} catch (profileError) {
					console.error("Error checking/creating profile:", profileError);
					// Don't throw - profile creation failure shouldn't block sign-in
				}
			}
		} catch (error) {
			console.error("Sign in error:", error);
			throw error;
		} finally {
			setLoadingAtom(false);
		}
	};

	const signOut = async () => {
		try {
			setLoadingAtom(true);
			// Use real Firebase sign out
			await firebaseApi.auth.signOut();
			// Clear user
			setUserAtom(null);
			// Remove from storage
			await storage.removeItem("user");
		} catch (error) {
			console.error("Sign out error:", error);
			throw error;
		} finally {
			setLoadingAtom(false);
		}
	};

	return {
		user,
		isLoading,
		signIn,
		signOut,
	};
}

// Component to initialize auth state
function AuthInitializer({ children }: { children: React.ReactNode }) {
	const setUser = useSetAtom(userAtom);
	const setIsLoading = useSetAtom(authLoadingAtom);

	useEffect(() => {
		let mounted = true;

		// Set initial loading state
		setIsLoading(true);

		// Set up Firebase auth state listener
		const unsubscribe = firebaseApi.auth.onAuthStateChanged(async (firebaseUser) => {
			if (!mounted) return;

			console.log("firebaseUser", firebaseUser);

			if (firebaseUser) {
				setUser(firebaseUser);
				// Sync to storage
				storage.setItem("user", JSON.stringify(firebaseUser)).catch(() => {
					// Ignore errors
				});

				// Create empty profile if user doesn't have one
				try {
					const existingProfile = await firebaseApi.profiles.getProfile(firebaseUser.uid);
					if (!existingProfile) {
						console.log("Creating empty profile for user");
						await firebaseApi.profiles.create();
					}
				} catch (profileError) {
					console.error("Error checking/creating profile:", profileError);
					// Don't throw - profile creation failure shouldn't block auth state
				}
			} else {
				setUser(null);
				// Remove from storage
				storage.removeItem("user").catch(() => {
					// Ignore errors
				});
			}
			setIsLoading(false);
		});

		return () => {
			mounted = false;
			unsubscribe();
		};
	}, [setUser, setIsLoading]);

	return <>{children}</>;
}

// Main Auth Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
	return (
		<Provider>
			<AuthInitializer>{children}</AuthInitializer>
		</Provider>
	);
}
