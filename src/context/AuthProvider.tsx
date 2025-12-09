import type { User } from '@/lib/atoms/user';
import { authLoadingAtom, storage, userAtom } from '@/lib/atoms/user';
import { Provider, useAtom, useSetAtom } from 'jotai';
import { useEffect } from 'react';

// Mock user for development
const MOCK_USER: User = {
	uid: 'mock-user-123',
	email: 'mock.user@example.com',
	displayName: 'Mock User',
	photoURL: null,
};

// Hook to use authentication
export function useAuth() {
	const [user] = useAtom(userAtom);
	const [isLoading] = useAtom(authLoadingAtom);
	const setUserAtom = useSetAtom(userAtom);
	const setLoadingAtom = useSetAtom(authLoadingAtom);

	const signIn = async () => {
		try {
			setLoadingAtom(true);
			// Use mock user instead of Firebase auth
			setUserAtom(MOCK_USER);
			// Persist to storage
			await storage.setItem('user', JSON.stringify(MOCK_USER));
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
			// Clear user (for testing purposes)
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

			// Use mock user instead of Firebase auth
			if (mounted) {
				setUser(MOCK_USER);
				// Sync to storage
				await storage.setItem('user', JSON.stringify(MOCK_USER)).catch(() => {
					// Ignore errors
				});
				setIsLoading(false);
			}
		};

		initializeAuth();

		return () => {
			mounted = false;
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
