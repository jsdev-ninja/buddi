import { useAuth } from '@/context/AuthProvider';
import { SplashScreen } from 'expo-router';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export function SplashScreenController() {
	const { isLoading } = useAuth();

	useEffect(() => {
		if (!isLoading) {
			SplashScreen.hideAsync();
		}
	}, [isLoading]);

	return null;
}
