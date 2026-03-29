import { buddiColors } from '@/constants/theme';
import type { ProfileInput } from '@/entities/profile';
import { profileInputSchema } from '@/entities/profile';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
	Alert,
	Image,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

interface EditProfileModalProps {
	visible: boolean;
	onClose: () => void;
	onSubmit: (data: ProfileInput) => void;
	initialData?: Partial<ProfileInput>;
}

const COMMON_INTERESTS = [
	'Photography',
	'Hiking',
	'Culture',
	'Eco-tourism',
	'Food',
	'Adventure Sports',
	'City Exploration',
	'Art',
	'Nightlife',
	'Teaching',
	'Cultural Tours',
	'Trekking',
	'Rock Climbing',
	'Camping',
	'Mountaineering',
	'Cycling',
	'Water Sports',
	'Winter Sports',
	'Wildlife Safari',
] as const;

export function EditProfileModal({ visible, onClose, onSubmit, initialData }: EditProfileModalProps) {
	const insets = useSafeAreaInsets();
	const [formData, setFormData] = useState<Partial<ProfileInput>>({
		interests: [],
		...initialData,
	});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [interestInput, setInterestInput] = useState('');
	const [photos, setPhotos] = useState<string[]>(initialData?.photos || []);

	React.useEffect(() => {
		if (visible && initialData) {
			setFormData({
				interests: [],
				...initialData,
			});
			setPhotos(initialData?.photos || []);
		}
	}, [visible, initialData]);

	const updateField = (field: keyof ProfileInput, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		setErrors((prev) => ({ ...prev, [field]: '' }));
	};

	const handleSubmit = async () => {
		try {
			// Photos will be handled separately - they need to be uploaded first
			// For now, we'll pass the photos array as-is and let the parent handle upload
			const dataToValidate = {
				...formData,
				interests: formData.interests || [],
				photos: photos, // Include photos in the data
			};
			const validated = profileInputSchema.parse(dataToValidate);
			onSubmit(validated);
			setErrors({});
			onClose();
		} catch (error) {
			if (error instanceof z.ZodError) {
				const newErrors: Record<string, string> = {};
				error.issues.forEach((err) => {
					if (err.path && err.path.length > 0) {
						newErrors[err.path[0] as string] = err.message;
					}
				});
				setErrors(newErrors);
			}
		}
	};

	const addInterest = (interest: string) => {
		if (interest.trim() && !formData.interests?.includes(interest.trim())) {
			updateField('interests', [...(formData.interests || []), interest.trim()]);
		}
		setInterestInput('');
	};

	const removeInterest = (index: number) => {
		const newInterests = formData.interests?.filter((_, i) => i !== index) || [];
		updateField('interests', newInterests);
	};

	const toggleInterest = (interest: string) => {
		if (formData.interests?.includes(interest)) {
			removeInterest(formData.interests.indexOf(interest));
		} else {
			addInterest(interest);
		}
	};

	const pickImage = async () => {
		if (photos.length >= 6) {
			Alert.alert('Limit Reached', 'You can add up to 6 photos.');
			return;
		}

		try {
			// Request permissions using the latest API
			const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
			
			if (permissionResult.status !== 'granted') {
				Alert.alert(
					'Permission Required',
					'Sorry, we need camera roll permissions to add photos!'
				);
				return;
			}

			// Launch image picker with latest API
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ['images'],
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.8,
				allowsMultipleSelection: false,
			});

			if (!result.canceled && result.assets && result.assets.length > 0) {
				// Add the local URI to photos array (will be uploaded on save)
				setPhotos([...photos, result.assets[0].uri]);
			}
		} catch (error) {
			console.error('Error picking image:', error);
			Alert.alert('Error', 'Failed to pick image. Please try again.');
		}
	};

	const removePhoto = (index: number) => {
		const newPhotos = photos.filter((_, i) => i !== index);
		setPhotos(newPhotos);
	};

	const reorderPhotos = (fromIndex: number, toIndex: number) => {
		const newPhotos = [...photos];
		const [removed] = newPhotos.splice(fromIndex, 1);
		newPhotos.splice(toIndex, 0, removed);
		setPhotos(newPhotos);
	};

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
			<View style={[styles.modal, { paddingTop: insets.top }]}>
				{/* Header */}
				<View style={styles.header}>
					<View style={styles.headerLeft}>
						<Feather name="user" size={24} color={buddiColors.primary} />
						<Text style={styles.title}>Edit Profile</Text>
					</View>
					<Pressable onPress={onClose} style={styles.closeButton}>
						<Feather name="x" size={24} color={buddiColors.textPrimary} />
					</Pressable>
				</View>

				<ScrollView
					style={styles.content}
					contentContainerStyle={styles.contentContainer}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.formContent}>
						{/* Name */}
						<View style={styles.field}>
							<Text style={styles.label}>Name</Text>
							<TextInput
								style={[styles.input, errors.name && styles.inputError]}
								placeholder="Enter your name"
								value={formData.name || ''}
								onChangeText={(text) => updateField('name', text)}
							/>
							{errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
						</View>

						{/* Age */}
						<View style={styles.field}>
							<Text style={styles.label}>Age</Text>
							<TextInput
								style={[styles.input, errors.age && styles.inputError]}
								placeholder="Enter your age"
								keyboardType="numeric"
								value={formData.age?.toString() || ''}
								onChangeText={(text) => {
									const num = parseInt(text);
									updateField('age', isNaN(num) ? undefined : num);
								}}
							/>
							{errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
						</View>

						{/* Location */}
						<View style={styles.field}>
							<Text style={styles.label}>Location</Text>
							<TextInput
								style={[styles.input, errors.location && styles.inputError]}
								placeholder="Enter your location"
								value={formData.location || ''}
								onChangeText={(text) => updateField('location', text)}
							/>
							{errors.location && (
								<Text style={styles.errorText}>{errors.location}</Text>
							)}
						</View>

						{/* Location Flag (Emoji) */}
						<View style={styles.field}>
							<Text style={styles.label}>Location Flag (Emoji)</Text>
							<TextInput
								style={[styles.input, errors.locationFlag && styles.inputError]}
								placeholder="🇺🇸"
								value={formData.locationFlag || ''}
								onChangeText={(text) => updateField('locationFlag', text)}
							/>
							{errors.locationFlag && (
								<Text style={styles.errorText}>{errors.locationFlag}</Text>
							)}
						</View>

						{/* Bio */}
						<View style={styles.field}>
							<Text style={styles.label}>Bio</Text>
							<TextInput
								style={[styles.textArea, errors.bio && styles.inputError]}
								placeholder="Tell everyone about yourself..."
								multiline
								numberOfLines={4}
								value={formData.bio || ''}
								onChangeText={(text) => updateField('bio', text)}
							/>
							{errors.bio && <Text style={styles.errorText}>{errors.bio}</Text>}
						</View>

						{/* Interests */}
						<View style={styles.field}>
							<Text style={styles.label}>Interests</Text>
							<TextInput
								style={styles.interestInput}
								placeholder="Add an interest..."
								value={interestInput}
								onChangeText={setInterestInput}
								onSubmitEditing={() => {
									if (interestInput.trim()) {
										addInterest(interestInput);
									}
								}}
							/>
							<View style={styles.commonInterestsContainer}>
								{COMMON_INTERESTS.map((interest) => {
									const isSelected = formData.interests?.includes(interest);
									return (
										<TouchableOpacity
											key={interest}
											style={[
												styles.interestChip,
												isSelected && styles.interestChipSelected,
											]}
											onPress={() => toggleInterest(interest)}
										>
											<Text
												style={[
													styles.interestChipText,
													isSelected && styles.interestChipTextSelected,
												]}
											>
												{interest}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>
							{formData.interests && formData.interests.length > 0 && (
								<View style={styles.selectedInterestsContainer}>
									<Text style={styles.selectedInterestsTitle}>Selected:</Text>
									<View style={styles.selectedInterests}>
										{formData.interests.map((interest, index) => (
											<View key={index} style={styles.selectedInterestTag}>
												<Text style={styles.selectedInterestText}>{interest}</Text>
												<Pressable onPress={() => removeInterest(index)}>
													<Feather
														name="x"
														size={14}
														color={buddiColors.textSecondary}
													/>
												</Pressable>
											</View>
										))}
									</View>
								</View>
							)}
						</View>

						{/* Photos */}
						<View style={styles.field}>
							<Text style={styles.label}>Your Photos</Text>
							<Text style={styles.helperText}>
								Add up to 6 photos. The first is your main profile picture. Drag to reorder.
							</Text>
							<View style={styles.photosContainer}>
								{photos.map((photo, index) => (
									<View key={index} style={styles.photoWrapper}>
										<Image source={{ uri: photo }} style={styles.photo} />
										{index === 0 && (
											<View style={styles.mainPhotoBadge}>
												<Text style={styles.mainPhotoText}>Main</Text>
											</View>
										)}
										<Pressable
											style={styles.removePhotoButton}
											onPress={() => removePhoto(index)}
										>
											<Feather name="x" size={16} color="#fff" />
										</Pressable>
										{index > 0 && (
											<Pressable
												style={styles.moveLeftButton}
												onPress={() => reorderPhotos(index, index - 1)}
											>
												<Feather name="chevron-left" size={16} color={buddiColors.textPrimary} />
											</Pressable>
										)}
										{index < photos.length - 1 && (
											<Pressable
												style={styles.moveRightButton}
												onPress={() => reorderPhotos(index, index + 1)}
											>
												<Feather name="chevron-right" size={16} color={buddiColors.textPrimary} />
											</Pressable>
										)}
									</View>
								))}
								{photos.length < 6 && (
									<TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
										<Feather name="plus" size={24} color={buddiColors.textSecondary} />
									</TouchableOpacity>
								)}
							</View>
						</View>
					</View>
				</ScrollView>

				{/* Footer Buttons */}
				<View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
					<Pressable style={styles.cancelButton} onPress={onClose}>
						<Text style={styles.cancelButtonText}>Cancel</Text>
					</Pressable>
					<Pressable style={styles.saveButton} onPress={handleSubmit}>
						<Text style={styles.saveButtonText}>Save</Text>
					</Pressable>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	modal: {
		flex: 1,
		backgroundColor: buddiColors.surface,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingTop: 10,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: buddiColors.surfaceBorder,
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: buddiColors.textPrimary,
	},
	closeButton: {
		padding: 4,
	},
	content: {
		flex: 1,
		paddingHorizontal: 20,
	},
	contentContainer: {
		paddingBottom: 20,
		flexGrow: 1,
	},
	formContent: {
		paddingTop: 10,
		paddingBottom: 20,
		gap: 20,
	},
	field: {
		marginBottom: 16,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: buddiColors.textPrimary,
		marginBottom: 8,
	},
	input: {
		backgroundColor: buddiColors.background,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		color: buddiColors.textPrimary,
	},
	inputError: {
		borderColor: buddiColors.dangerText,
	},
	textArea: {
		backgroundColor: buddiColors.background,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		color: buddiColors.textPrimary,
		minHeight: 100,
		textAlignVertical: 'top',
	},
	errorText: {
		fontSize: 12,
		color: buddiColors.dangerText,
		marginTop: 4,
	},
	interestInput: {
		backgroundColor: buddiColors.background,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		color: buddiColors.textPrimary,
		marginBottom: 12,
	},
	commonInterestsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 12,
	},
	interestChip: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: buddiColors.background,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
	},
	interestChipSelected: {
		backgroundColor: buddiColors.primary,
		borderColor: buddiColors.primary,
	},
	interestChipText: {
		fontSize: 14,
		color: buddiColors.textPrimary,
	},
	interestChipTextSelected: {
		color: '#fff',
		fontWeight: '600',
	},
	selectedInterestsContainer: {
		marginTop: 8,
	},
	selectedInterestsTitle: {
		fontSize: 12,
		fontWeight: '600',
		color: buddiColors.textSecondary,
		marginBottom: 8,
	},
	selectedInterests: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	selectedInterestTag: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: buddiColors.primaryMuted,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	selectedInterestText: {
		fontSize: 12,
		color: buddiColors.primaryDark,
		fontWeight: '500',
	},
	footer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 20,
		borderTopWidth: 1,
		borderTopColor: buddiColors.surfaceBorder,
		gap: 12,
	},
	cancelButton: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: buddiColors.surface,
		borderWidth: 1,
		borderColor: buddiColors.surfaceBorder,
		alignItems: 'center',
	},
	cancelButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: buddiColors.textPrimary,
	},
	saveButton: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: buddiColors.primary,
		alignItems: 'center',
	},
	saveButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#fff',
	},
	helperText: {
		fontSize: 12,
		color: buddiColors.textSecondary,
		marginBottom: 12,
	},
	photosContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	photoWrapper: {
		width: 100,
		height: 100,
		borderRadius: 12,
		position: 'relative',
		overflow: 'hidden',
	},
	photo: {
		width: '100%',
		height: '100%',
		borderRadius: 12,
	},
	addPhotoButton: {
		width: 100,
		height: 100,
		borderRadius: 12,
		borderWidth: 2,
		borderStyle: 'dashed',
		borderColor: buddiColors.surfaceBorder,
		backgroundColor: buddiColors.background,
		alignItems: 'center',
		justifyContent: 'center',
	},
	removePhotoButton: {
		position: 'absolute',
		top: 4,
		right: 4,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	mainPhotoBadge: {
		position: 'absolute',
		bottom: 4,
		left: 4,
		backgroundColor: buddiColors.primary,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	mainPhotoText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#fff',
	},
	moveLeftButton: {
		position: 'absolute',
		bottom: 4,
		left: 4,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: 'rgba(255, 255, 255, 0.9)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	moveRightButton: {
		position: 'absolute',
		bottom: 4,
		right: 4,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: 'rgba(255, 255, 255, 0.9)',
		alignItems: 'center',
		justifyContent: 'center',
	},
});