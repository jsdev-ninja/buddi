import type { User } from '@/lib/atoms/user';
import { authLoadingAtom, storage, userAtom } from '@/lib/atoms/user';
import { firebaseApi } from '@/services/firebase';
import { Provider, useAtom, useSetAtom } from 'jotai';
import { useEffect } from 'react';

// Hook to use authentication
export function useAuth() {
	const [user, setUser] = useAtom(userAtom);
	const [isLoading, setIsLoading] = useAtom(authLoadingAtom);
	const setUserAtom = useSetAtom(userAtom);
	const setLoadingAtom = useSetAtom(authLoadingAtom);

	const signIn = async () => {
		try {
			setLoadingAtom(true);
			const userData = await firebaseApi.auth.loginWithGoogle();
			if (userData) {
				setUserAtom(userData);
				// Persist to storage
				await storage.setItem('user', JSON.stringify(userData));
			}
		} catch (error) {
			console.error('Sign in error:', error);
			throw error;
		} finally {
			setLoadingAtom(false);
		}
	};

	const signOut = async () => {
		try {
			setLoadingAtom(true);
			await firebaseApi.auth.signOut();
			setUserAtom(null);
			// Remove from storage
			await storage.removeItem('user');
		} catch (error) {
			console.error('Sign out error:', error);
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

		const initializeAuth = async () => {
			// Set initial loading state
			setIsLoading(true);

			// Try to load user from storage first
			try {
				const stored = await storage.getItem('user');
				if (stored && mounted) {
					const userData = JSON.parse(stored) as User;
					setUser(userData);
				}
			} catch {
				// Ignore storage errors
			}

			// Listen to auth state changes from Firebase
			const unsubscribe = firebaseApi.auth.onAuthStateChanged((user) => {
				if (mounted) {
					setUser(user);
					if (user) {
						// Sync to storage
						storage.setItem('user', JSON.stringify(user)).catch(() => {
							// Ignore errors
						});
					} else {
						// Remove from storage
						storage.removeItem('user').catch(() => {
							// Ignore errors
						});
					}
					setIsLoading(false);
				}
			});

			return () => {
				unsubscribe();
			};
		};

		const cleanup = initializeAuth();

		return () => {
			mounted = false;
			cleanup.then((unsubscribe) => unsubscribe?.());
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
