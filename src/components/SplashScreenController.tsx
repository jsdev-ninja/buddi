import { authLoadingAtom } from '@/lib/atoms/user';
import { SplashScreen } from 'expo-router';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export function SplashScreenController() {
	const isLoading = useAtomValue(authLoadingAtom);

	useEffect(() => {
		if (!isLoading) {
			SplashScreen.hideAsync();
		}
	}, [isLoading]);

	return null;
}
