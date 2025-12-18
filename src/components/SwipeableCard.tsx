import { buddiColors } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
	Gesture,
	GestureDetector,
	GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from 'react-native-reanimated';

const SWIPE_THRESHOLD = 120; // Minimum distance to trigger swipe
const ROTATION_MULTIPLIER = 0.1; // Rotation intensity

interface SwipeableCardProps {
	children: React.ReactNode;
	onSwipeLeft?: () => void; // Pass/Unlike
	onSwipeRight?: () => void; // Like
	onSwipeComplete?: () => void;
	cardKey?: string | number; // Key to reset card when it changes
}

export function SwipeableCard({
	children,
	onSwipeLeft,
	onSwipeRight,
	onSwipeComplete,
	cardKey,
}: SwipeableCardProps) {
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const opacity = useSharedValue(1);
	const scale = useSharedValue(1);

	// Reset card position when cardKey changes (new card)
	useEffect(() => {
		translateX.value = 0;
		translateY.value = 0;
		opacity.value = 1;
		scale.value = 1;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cardKey]);

	const panGesture = Gesture.Pan()
		.onUpdate((event) => {
			translateX.value = event.translationX;
			translateY.value = event.translationY * 0.1; // Slight vertical movement
			scale.value = 1 - Math.abs(event.translationX) / 1000; // Slight scale down
		})
		.onEnd((event) => {
			const absX = Math.abs(event.translationX);

			if (absX > SWIPE_THRESHOLD) {
				// Swipe threshold reached
				const direction = event.translationX > 0 ? 'right' : 'left';

				// Animate card off screen
				translateX.value = withTiming(
					direction === 'right' ? 1000 : -1000,
					{ duration: 300 }
				);
				translateY.value = withTiming(0, { duration: 300 });
				opacity.value = withTiming(0, { duration: 300 });
				scale.value = withTiming(0.8, { duration: 300 });

				// Trigger haptic feedback
				runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);

				// Call appropriate callback
				if (direction === 'right' && onSwipeRight) {
					runOnJS(onSwipeRight)();
				} else if (direction === 'left' && onSwipeLeft) {
					runOnJS(onSwipeLeft)();
				}

				// Call completion callback
				if (onSwipeComplete) {
					setTimeout(() => {
						runOnJS(onSwipeComplete)();
					}, 300);
				}
			} else {
				// Spring back to center
				translateX.value = withSpring(0, {
					damping: 15,
					stiffness: 150,
				});
				translateY.value = withSpring(0, {
					damping: 15,
					stiffness: 150,
				});
				scale.value = withSpring(1, {
					damping: 15,
					stiffness: 150,
				});
			}
		});

	const animatedCardStyle = useAnimatedStyle(() => {
		const rotation = (translateX.value / 20) * ROTATION_MULTIPLIER;

		return {
			transform: [
				{ translateX: translateX.value },
				{ translateY: translateY.value },
				{ rotate: `${rotation}deg` },
				{ scale: scale.value },
			],
			opacity: opacity.value,
		};
	});

	const animatedLeftOverlayStyle = useAnimatedStyle(() => {
		const opacity = Math.max(0, -translateX.value / SWIPE_THRESHOLD / 2);
		return {
			opacity: Math.min(opacity, 0.8),
		};
	});

	const animatedRightOverlayStyle = useAnimatedStyle(() => {
		const opacity = Math.max(0, translateX.value / SWIPE_THRESHOLD / 2);
		return {
			opacity: Math.min(opacity, 0.8),
		};
	});

	return (
		<GestureHandlerRootView style={styles.container}>
			<GestureDetector gesture={panGesture}>
				<Animated.View style={[styles.card, animatedCardStyle]}>
					{children}
					{/* Left swipe overlay (Pass/Unlike) */}
					<Animated.View
						style={[styles.overlay, styles.leftOverlay, animatedLeftOverlayStyle]}
					>
						<View style={styles.overlayContent}>
							<Feather name="x" size={60} color={buddiColors.dangerText || '#FF3B30'} />
							<Text style={styles.overlayText}>PASS</Text>
						</View>
					</Animated.View>
					{/* Right swipe overlay (Like) */}
					<Animated.View
						style={[styles.overlay, styles.rightOverlay, animatedRightOverlayStyle]}
					>
						<View style={styles.overlayContent}>
							<Feather name="heart" size={60} color={buddiColors.primary} />
							<Text style={styles.overlayText}>LIKE</Text>
						</View>
					</Animated.View>
				</Animated.View>
			</GestureDetector>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
	},
	card: {
		width: '100%',
	},
	overlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 24,
	},
	leftOverlay: {
		backgroundColor: 'rgba(185, 28, 28, 0.2)', // dangerText with opacity
	},
	rightOverlay: {
		backgroundColor: 'rgba(249, 115, 22, 0.2)', // primary (orange) with opacity
	},
	overlayContent: {
		alignItems: 'center',
		gap: 8,
	},
	overlayText: {
		fontSize: 24,
		fontWeight: 'bold',
		color: buddiColors.textOnDark,
		textTransform: 'uppercase',
		letterSpacing: 2,
	},
});
